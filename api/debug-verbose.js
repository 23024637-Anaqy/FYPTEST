const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

module.exports = async (req, res) => {
    console.log('=== DEBUG VERBOSE ENDPOINT CALLED ===');
    console.log('Request Method:', req.method);
    console.log('Request URL:', req.url);
    console.log('Request Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    
    const debug = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        deployment: 'vercel-production',
        logs: []
    };

    // Log function to capture all output
    const log = (message, data = null) => {
        const logEntry = {
            timestamp: new Date().toISOString(),
            message,
            data
        };
        console.log(`[${logEntry.timestamp}] ${message}`, data || '');
        debug.logs.push(logEntry);
    };

    try {
        log('Starting debug verbose endpoint');
        
        // Check environment variables
        log('Checking environment variables');
        const envVars = {
            NODE_ENV: process.env.NODE_ENV || 'undefined',
            MONGODB_URI: process.env.MONGODB_URI ? 'SET (length: ' + process.env.MONGODB_URI.length + ')' : 'NOT SET',
            JWT_SECRET: process.env.JWT_SECRET ? 'SET (length: ' + process.env.JWT_SECRET.length + ')' : 'NOT SET',
            PORT: process.env.PORT || 'undefined'
        };
        log('Environment variables check complete', envVars);
        debug.environment_variables = envVars;

        // Test MongoDB connection
        log('Testing MongoDB connection');
        
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI environment variable is not set');
        }

        log('Attempting to connect to MongoDB with URI starting with: ' + process.env.MONGODB_URI.substring(0, 20) + '...');
        
        // Use existing connection or create new one
        if (mongoose.connection.readyState === 0) {
            log('No existing MongoDB connection, creating new one');
            await mongoose.connect(process.env.MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 5000,
            });
            log('New MongoDB connection established');
        } else {
            log('Using existing MongoDB connection, state: ' + mongoose.connection.readyState);
        }

        debug.mongodb_connection = {
            status: 'connected',
            readyState: mongoose.connection.readyState,
            host: mongoose.connection.host,
            port: mongoose.connection.port,
            name: mongoose.connection.name
        };
        log('MongoDB connection successful', debug.mongodb_connection);

        // Test user lookup
        log('Testing user lookup in database');
        const userCount = await User.countDocuments();
        log('Total users in database: ' + userCount);
        debug.user_count = userCount;

        // Test admin user specifically
        log('Looking for admin user');
        const adminUser = await User.findOne({ username: 'admin' });
        
        if (!adminUser) {
            log('CRITICAL: Admin user not found in database!');
            debug.admin_user = { found: false, error: 'Admin user does not exist in database' };
        } else {
            log('Admin user found in database');
            debug.admin_user = {
                found: true,
                id: adminUser._id,
                username: adminUser.username,
                role: adminUser.role,
                created: adminUser.createdAt,
                passwordHashLength: adminUser.password ? adminUser.password.length : 0
            };
            log('Admin user details', debug.admin_user);

            // Test password verification
            log('Testing password verification for admin user');
            try {
                const passwordTest = await bcrypt.compare('admin123', adminUser.password);
                log('Password verification result: ' + passwordTest);
                debug.password_test = {
                    provided_password: 'admin123',
                    stored_hash_length: adminUser.password.length,
                    verification_result: passwordTest,
                    bcrypt_rounds: 10
                };
            } catch (passwordError) {
                log('Password verification failed', passwordError.message);
                debug.password_test = {
                    error: passwordError.message,
                    stack: passwordError.stack
                };
            }
        }

        // Test all users
        log('Fetching all users for verification');
        const allUsers = await User.find({}, 'username role createdAt');
        debug.all_users = allUsers.map(user => ({
            id: user._id,
            username: user.username,
            role: user.role,
            created: user.createdAt
        }));
        log('All users retrieved', debug.all_users);

        log('Debug verbose endpoint completed successfully');
        debug.status = 'success';

    } catch (error) {
        log('ERROR in debug verbose endpoint', error.message);
        console.error('Full error details:', error);
        debug.status = 'error';
        debug.error = {
            message: error.message,
            stack: error.stack,
            name: error.name
        };
    }

    // Always return response, even if there were errors
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(debug);
};
