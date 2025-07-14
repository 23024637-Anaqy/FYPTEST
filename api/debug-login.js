// Vercel debug endpoint for login troubleshooting
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password_hash: String,
    role: { type: String, enum: ['admin', 'supervisor', 'user'], default: 'user' },
    full_name: String,
    email: String,
    is_active: { type: Boolean, default: true }
}, { timestamps: true });

const User = mongoose.model('DebugUser', userSchema);

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const debugInfo = {
        timestamp: new Date().toISOString(),
        method: req.method,
        environment: 'Vercel Production',
        nodeEnv: process.env.NODE_ENV,
        environmentVariables: {
            MONGODB_URI: process.env.MONGODB_URI ? 'Set ✅' : 'Missing ❌',
            JWT_SECRET: process.env.JWT_SECRET ? 'Set ✅' : 'Missing ❌'
        },
        database: {
            status: 'Not tested',
            connection: mongoose.connection.readyState,
            users: []
        }
    };

    try {
        // Connect to MongoDB
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI);
        }
        
        debugInfo.database.status = 'Connected ✅';
        debugInfo.database.connection = mongoose.connection.readyState;

        // List all users
        const users = await User.find({}).select('username role is_active createdAt');
        debugInfo.database.users = users.map(user => ({
            username: user.username,
            role: user.role,
            is_active: user.is_active,
            created: user.createdAt
        }));

        // If it's a POST request, test login
        if (req.method === 'POST') {
            const { username, password } = req.body;
            
            debugInfo.loginTest = {
                username: username,
                password: password ? '***provided***' : 'missing',
                result: 'testing...'
            };

            if (username && password) {
                const user = await User.findOne({ username: username.toLowerCase() });
                
                if (!user) {
                    debugInfo.loginTest.result = 'User not found ❌';
                } else {
                    debugInfo.loginTest.userFound = {
                        id: user._id,
                        username: user.username,
                        role: user.role,
                        is_active: user.is_active,
                        has_password_hash: !!user.password_hash
                    };

                    if (user.password_hash) {
                        const isValid = await bcrypt.compare(password, user.password_hash);
                        debugInfo.loginTest.result = isValid ? 'Password correct ✅' : 'Password incorrect ❌';
                        
                        if (isValid) {
                            debugInfo.loginTest.message = 'LOGIN SHOULD WORK! Check JWT generation.';
                        }
                    } else {
                        debugInfo.loginTest.result = 'No password hash found ❌';
                    }
                }
            }
        }

        res.status(200).json(debugInfo);

    } catch (error) {
        debugInfo.error = {
            message: error.message,
            stack: error.stack
        };
        res.status(500).json(debugInfo);
    }
}
