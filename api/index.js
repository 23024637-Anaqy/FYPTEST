// Vercel serverless function entry point
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const mongoose = require('mongoose');

// Import route handlers (fixed paths for Vercel)
const createAuthRoutes = require('../routes/auth-mongo');
const createInventoryRoutes = require('../routes/inventory-mongo');
const createStocktakeRoutes = require('../routes/stocktake-mongo');
const createReportsRoutes = require('../routes/reports-mongo');

console.log('Route modules loaded:', {
    auth: typeof createAuthRoutes,
    inventory: typeof createInventoryRoutes,
    stocktake: typeof createStocktakeRoutes,
    reports: typeof createReportsRoutes
});

const app = express();

// Initialize MongoDB connection for Vercel serverless
async function connectDB() {
    if (mongoose.connection.readyState === 0) {
        try {
            console.log('🔄 Connecting to MongoDB Atlas...');
            
            // Simple connection for Mongoose 8.x compatibility
            await mongoose.connect(process.env.MONGODB_URI, {
                serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
                socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
                maxPoolSize: 10, // Maintain up to 10 socket connections
                minPoolSize: 5, // Maintain a minimum of 5 socket connections
                maxIdleTimeMS: 30000, // Close connections after 30s of inactivity
            });
            console.log('✅ Connected to MongoDB Atlas');
        } catch (error) {
            console.error('❌ MongoDB connection error:', error);
            throw error; // Re-throw to handle in route
        }
    } else if (mongoose.connection.readyState === 1) {
        console.log('♻️ Using existing MongoDB connection');
    }
}

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// CORS configuration for production
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://23024637-anaqy.github.io', 'https://fyptest.vercel.app'] // Add your actual domains
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to database before handling requests (moved to beginning)
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        console.error('Database connection failed:', error);
        res.status(500).json({ 
            error: 'Database connection failed',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        version: '2.1.0-debug-stocktake',
        environment: process.env.NODE_ENV || 'development',
        deploymentId: Date.now() // Force new deployment
    });
});

// API Routes
console.log('Mounting API routes...');
app.use('/api/auth', createAuthRoutes());
console.log('Auth routes mounted');
app.use('/api/inventory', createInventoryRoutes());
console.log('Inventory routes mounted');
app.use('/api/stocktake', createStocktakeRoutes());
console.log('Stocktake routes mounted');
app.use('/api/reports', createReportsRoutes());
console.log('Reports routes mounted');

// Serve static files (fixed path for Vercel)
app.use(express.static(path.join(__dirname, '../public')));

// Serve main application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

// Export for Vercel
module.exports = app;
/ /   F o r c e   d e p l o y m e n t   u p d a t e 
 
 