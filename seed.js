require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');


const products = [
  {
    title: "Sony WH-1000XM5 Wireless Headphones",
    price: 348,
    description: "Industry-leading noise cancellation, exceptional sound quality, and crystal-clear hands-free calling.",
    image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=500&q=80"
  },
  {
    title: "Keychron K2 Mechanical Keyboard",
    price: 79,
    description: "A tactile wireless mechanical keyboard with Mac and Windows layouts, perfect for productivity.",
    image: "https://vibegaming.com.bd/wp-content/uploads/2022/03/114.webp"
  },
  {
    title: "Dell UltraSharp 27 4K Monitor",
    price: 540,
    description: "Experience captivating details and true-to-life color reproduction on this brilliant 27-inch 4K monitor.",
    image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=500&q=80"
  },
  {
    title: "Logitech MX Master 3S Mouse",
    price: 99,
    description: "An icon remastered. Feel every moment of your workflow with even more precision, tactility, and performance.",
    image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=500&q=80"
  },
  {
    title: "Fujifilm X-T5 Mirrorless Camera",
    price: 1699,
    description: "Photography first. High-resolution 40MP sensor and classic dial-based operation.",
    image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=500&q=80"
  },
  {
    title: "Apple MacBook Pro 14-inch",
    price: 1999,
    description: "Supercharged by M3 Pro. The most powerful laptop for pros with stunning Liquid Retina XDR display.",
    image: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=800&q=80"
  }
];

const seedDB = async () => {
  try {
   
    await mongoose.connect(process.env.MONGO_URI);
    console.log("🔌 Connected to MongoDB for Seeding...");

    
    await Product.deleteMany({});
    console.log("🧹 Old data cleared!");

   
    await Product.insertMany(products);
    console.log("✅ Data Seeding Completed Successfully!");

    
    mongoose.connection.close();
    console.log("🔌 Connection Closed.");
    process.exit(0); 

  } catch (error) {
    console.error("❌ Seeding Error:", error);
    process.exit(1); 
};

};

seedDB();