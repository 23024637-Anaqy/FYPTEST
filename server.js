const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const Database = require('./config/database');
const config = require('./config/config');
const { logUserAction } = require('./middleware/auth');

const createAuthRoutes = require('./routes/auth');
const createInventoryRoutes = require('./routes/inventory');
const createStocktakeRoutes = require('./routes/stocktake');
const createReportsRoutes = require('./routes/reports');

const app = express();

// Initialize database
const db = new Database();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// CORS
app.use(cors({
    origin: config.CORS_ORIGIN,
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX_REQUESTS,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Logging middleware
app.use(logUserAction(db));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// API routes
app.use('/api/auth', createAuthRoutes(db));
app.use('/api/inventory', createInventoryRoutes(db));
app.use('/api/stocktake', createStocktakeRoutes(db));
app.use('/api/reports', createReportsRoutes(db));

// Serve the main app for all other routes (SPA routing)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    
    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Invalid JSON in request body' });
    }
    
    res.status(500).json({ 
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

const PORT = config.PORT;

app.listen(PORT, () => {
    console.log(`🚀 Inventory Management System running on port ${PORT}`);
    console.log(`📱 Mobile-friendly interface available at http://localhost:${PORT}`);
    console.log(`🔐 Default login: admin / admin123`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n⏹️  Shutting down gracefully...');
    await db.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n⏹️  Shutting down gracefully...');
    await db.close();
    process.exit(0);
});

module.exports = app;
