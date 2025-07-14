const mongoose = require('mongoose');

module.exports = async (req, res) => {
    console.log('=== MONGODB CONNECTION TEST ===');
    const startTime = Date.now();
    
    try {
        console.log('Environment check:');
        console.log('- NODE_ENV:', process.env.NODE_ENV);
        console.log('- MONGODB_URI exists:', !!process.env.MONGODB_URI);
        console.log('- MONGODB_URI starts with:', process.env.MONGODB_URI?.substring(0, 20));
        
        // Check current connection state
        console.log('Current mongoose connection state:', mongoose.connection.readyState);
        console.log('0=disconnected, 1=connected, 2=connecting, 3=disconnecting');
        
        if (mongoose.connection.readyState === 0) {
            console.log('No connection, attempting to connect...');
            
            await mongoose.connect(process.env.MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                bufferCommands: false,
                bufferMaxEntries: 0,
                maxPoolSize: 10,
                minPoolSize: 5,
                maxIdleTimeMS: 30000,
                family: 4
            });
            
            console.log('Connection successful!');
        }
        
        // Test basic database operation
        console.log('Testing basic database operation...');
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Available collections:', collections.map(c => c.name));
        
        // Try to import User model and test
        console.log('Testing User model...');
        const User = require('../models/User');
        const userCount = await User.countDocuments().maxTimeMS(3000);
        console.log('User count:', userCount);
        
        const connectionTime = Date.now() - startTime;
        
        res.json({
            success: true,
            connectionTime: `${connectionTime}ms`,
            database: {
                state: mongoose.connection.readyState,
                host: mongoose.connection.host,
                port: mongoose.connection.port,
                name: mongoose.connection.name
            },
            collections: collections.map(c => c.name),
            userCount,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        const connectionTime = Date.now() - startTime;
        console.error('MongoDB test failed:', error);
        
        res.status(500).json({
            success: false,
            error: error.message,
            connectionTime: `${connectionTime}ms`,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
};
