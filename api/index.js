// Vercel serverless function entry point
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const mongoose = require('mongoose');

// Import route handlers
const createAuthRoutes = require('./routes/auth-mongo');
const createInventoryRoutes = require('./routes/inventory-mongo');
const createStocktakeRoutes = require('./routes/stocktake-mongo');
const createReportsRoutes = require('./routes/reports-mongo');

const app = express();

// Initialize MongoDB connection
async function connectDB() {
    if (mongoose.connection.readyState === 0) {
        try {
            await mongoose.connect(process.env.MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
            console.log('✅ Connected to MongoDB Atlas');
        } catch (error) {
            console.error('❌ MongoDB connection error:', error);
        }
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

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        version: '2.0.0-mongodb',
        environment: process.env.NODE_ENV || 'development'
    });
});

// API Routes
app.use('/api/auth', createAuthRoutes());
app.use('/api/inventory', createInventoryRoutes());
app.use('/api/stocktake', createStocktakeRoutes());
app.use('/api/reports', createReportsRoutes());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve main application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

// Connect to database before handling requests
app.use(async (req, res, next) => {
    await connectDB();
    next();
});

// Export for Vercel
module.exports = app;
