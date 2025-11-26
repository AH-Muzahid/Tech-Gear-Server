require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Product = require('./models/Product');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const { validateProduct, validateUserRegistration } = require('./middleware/validation');
const { verifyAuth, requireAdmin } = require('./middleware/auth');
const { apiLimiter, authLimiter, productWriteLimiter } = require('./middleware/rateLimit');

const app = express();
const port = process.env.PORT || 5000;

// CORS Configuration - More secure
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'https://tech-gear-client.vercel.app'
    ], // Default allowed origins
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Limit JSON payload size

// Apply general rate limiting to all routes
app.use(apiLimiter);

// MongoDB Connection with better error handling
const mongoOptions = {
  // Connection pool settings
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

// MongoDB Connection with better error handling
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI, mongoOptions)
    .then(() => console.log('✅ MongoDB Connected Successfully'))
    .catch((err) => {
      console.error('❌ MongoDB Connection Error:', err.message);
      console.error('⚠️ Server will continue but database operations will fail');
      // Don't exit - allow server to run without DB for testing
    });
} else {
  console.warn('⚠️ MONGO_URI not found in environment variables');
  console.warn('⚠️ Server will run but database operations will fail');
}

// Global Error Handler for Promises
process.on('unhandledRejection', (err, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', err);
});

// Routes
app.get('/', (req, res) => {
  res.send('Tech Gear Server is Running on Vercel!');
});

// GET ALL PRODUCTS
app.get('/products', async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      query = { title: { $regex: search, $options: 'i' } };
    }

    const products = await Product.find(query);
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET PRODUCT BY ID
app.get('/products/:id', async (req, res) => {
  try {
    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ADD PRODUCT - Protected route (requires authentication)
app.post('/products', productWriteLimiter, verifyAuth, validateProduct, async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE PRODUCT BY ID - Protected route (requires authentication)
app.delete('/products/:id', productWriteLimiter, verifyAuth, async (req, res) => {
  try {
    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }

    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// REGISTER USER 
app.post('/register', authLimiter, validateUserRegistration, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
    });

    await newUser.save();
    res.status(201).json({ message: 'User created successfully' });

  } catch (error) {
    // Handle duplicate key error (MongoDB unique constraint)
    if (error.code === 11000) {
      return res.status(400).json({ message: 'User already exists' });
    }
    res.status(500).json({ message: error.message });
  }
});

// UPDATE PRODUCT BY ID - Protected route (requires authentication)
app.put('/products/:id', productWriteLimiter, verifyAuth, validateProduct, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true, // Run model validators
    });

    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//Vercel Configuration

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}


module.exports = app;
