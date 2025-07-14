// Main server file for MongoDB-powered Inventory Management System
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const MongoDatabase = require('./config/mongodb');
const config = require('./config/config');

// Import MongoDB route handlers
const createAuthRoutes = require('./routes/auth-mongo');
const createInventoryRoutes = require('./routes/inventory-mongo');
const createStocktakeRoutes = require('./routes/stocktake-mongo');
const createReportsRoutes = require('./routes/reports-mongo');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize MongoDB connection
const db = new MongoDatabase();

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

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://yourusername.github.io'] // Replace with your GitHub Pages URL
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (GitHub Pages compatibility)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/github-pages', express.static(path.join(__dirname, 'github-pages')));

// API Routes with MongoDB
app.use('/api/auth', createAuthRoutes());
app.use('/api/inventory', createInventoryRoutes());
app.use('/api/stocktake', createStocktakeRoutes());
app.use('/api/reports', createReportsRoutes());

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: db.isConnected() ? 'Connected' : 'Disconnected',
        version: '2.0.0-mongodb'
    });
});

// Serve main application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve GitHub Pages demo
app.get('/demo', (req, res) => {
    res.sendFile(path.join(__dirname, 'github-pages', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    
    if (err.name === 'ValidationError') {
        return res.status(400).json({ 
            error: 'Validation Error', 
            details: err.message 
        });
    }
    
    if (err.name === 'CastError') {
        return res.status(400).json({ 
            error: 'Invalid ID format' 
        });
    }
    
    res.status(500).json({ 
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT. Shutting down gracefully...');
    
    try {
        await db.disconnect();
        console.log('MongoDB connection closed.');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
});

process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM. Shutting down gracefully...');
    
    try {
        await db.disconnect();
        console.log('MongoDB connection closed.');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
});

// Start server
const startServer = async () => {
    try {
        // Connect to MongoDB
        await db.connect();
        console.log('✅ MongoDB connected successfully');
        
        // Start Express server
        app.listen(PORT, () => {
            console.log(`🚀 Lakers Inventory Management Server running on port ${PORT}`);
            console.log(`📱 Main App: http://localhost:${PORT}`);
            console.log(`🎭 GitHub Pages Demo: http://localhost:${PORT}/demo`);
            console.log(`🔗 API Health: http://localhost:${PORT}/api/health`);
            console.log(`🏀 Database: MongoDB Atlas`);
            console.log(`🎨 Theme: Lakers Purple & Gold`);
            
            if (process.env.NODE_ENV === 'development') {
                console.log('\n📋 Development Info:');
                console.log('- Auto-reload enabled');
                console.log('- Debug mode active');
                console.log('- CORS configured for localhost');
            }
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Initialize the server
startServer();

module.exports = app;
