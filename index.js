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
const logger = require('./utils/logger');

const app = express();
const port = process.env.PORT || 5000;

// CORS Configuration - Updated for Vercel
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : [];

    // Add default localhosts
    const defaultOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002'
    ];

    // Check if origin is allowed
    const isAllowed =
      allowedOrigins.includes(origin) ||
      defaultOrigins.includes(origin) ||
      origin.endsWith('.vercel.app'); // Allow ALL vercel.app subdomains

    if (isAllowed) {
      callback(null, true);
    } else {
      logger.warn(`Blocked by CORS: ${origin}`);
      // For debugging, temporarily allow even if not matched (optional, but helps debug)
      // callback(null, true); 
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Limit JSON payload size

// Apply general rate limiting to all routes
app.use(apiLimiter);

// MongoDB Connection options
const mongoOptions = {
  // Connection pool settings
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 10000, // 10 seconds
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  retryReads: true,
};

// MongoDB Connection with better error handling
const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    logger.warn('MONGO_URI not found in environment variables');
    logger.warn('Server will run but database operations will fail');
    return;
  }

  try {
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      logger.success('MongoDB Already Connected');
      return;
    }

    await mongoose.connect(process.env.MONGO_URI, {
      ...mongoOptions,
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });

    logger.success('MongoDB Connected Successfully');

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB Connection Error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB Disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.success('MongoDB Reconnected');
    });

  } catch (err) {
    logger.error('MongoDB Connection Error:', err.message);
    logger.error('Server will continue but database operations will fail');
  }
};

// Connect to database
connectDB();

// Global Error Handler for Promises
process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', err);
});

// Routes
app.get('/', (req, res) => {
  res.send('Tech Gear Server is Running on Vercel!');
});

// GET ALL PRODUCTS
app.get('/products', async (req, res) => {
  try {
    // Wait for MongoDB connection to be ready
    if (mongoose.connection.readyState === 0) {
      // Not connected, try to connect
      await connectDB();
    }

    // Wait for connection to be established (max 5 seconds)
    let attempts = 0;
    while (mongoose.connection.readyState !== 1 && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        message: 'Database connection unavailable. Please try again later.'
      });
    }

    const { search } = req.query;
    let query = {};

    if (search) {
      query = { title: { $regex: search, $options: 'i' } };
    }

    // Execute query with timeout
    const products = await Product.find(query)
      .maxTimeMS(8000) // 8 second timeout
      .lean()
      .exec();

    res.json(products);
  } catch (error) {
    logger.error('Error fetching products:', error.message);

    if (error.name === 'MongoServerSelectionError' ||
      error.name === 'MongoTimeoutError' ||
      error.message.includes('buffering timed out')) {
      return res.status(503).json({
        message: 'Database connection timeout. Please try again later.'
      });
    }

    res.status(500).json({ message: error.message || 'Failed to fetch products' });
  }
});

// GET PRODUCT BY ID
app.get('/products/:id', async (req, res) => {
  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        message: 'Database connection unavailable. Please try again later.'
      });
    }

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }

    const product = await Product.findById(req.params.id)
      .maxTimeMS(8000)
      .lean()
      .exec();

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    if (error.name === 'MongoTimeoutError' || error.message.includes('buffering timed out')) {
      return res.status(503).json({
        message: 'Database connection timeout. Please try again later.'
      });
    }
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
    logger.info(`Server is running on port ${port}`);
  });
}


module.exports = app;
