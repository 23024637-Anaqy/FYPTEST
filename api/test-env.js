// Vercel API endpoint to test environment variables
const mongoose = require('mongoose');

export default async function handler(req, res) {
    try {
        // Check environment variables
        const mongoUri = process.env.MONGODB_URI;
        const jwtSecret = process.env.JWT_SECRET;
        
        const envCheck = {
            MONGODB_URI: mongoUri ? 'Set ✅' : 'Missing ❌',
            JWT_SECRET: jwtSecret ? 'Set ✅' : 'Missing ❌',
            NODE_ENV: process.env.NODE_ENV || 'Not set'
        };
        
        // Try connecting to database
        let dbStatus = 'Not tested';
        let userCount = 0;
        
        if (mongoUri) {
            try {
                await mongoose.connect(mongoUri);
                dbStatus = 'Connected ✅';
                
                // Quick user count check
                const User = mongoose.model('TempUser', new mongoose.Schema({
                    username: String
                }));
                
                userCount = await User.countDocuments();
                await mongoose.disconnect();
            } catch (dbError) {
                dbStatus = `Connection failed: ${dbError.message}`;
            }
        }
        
        res.status(200).json({
            message: 'Vercel Environment Test',
            timestamp: new Date().toISOString(),
            environment: envCheck,
            database: {
                status: dbStatus,
                userCount: userCount
            },
            working: mongoUri && jwtSecret && dbStatus.includes('✅')
        });
        
    } catch (error) {
        res.status(500).json({
            error: 'Test failed',
            message: error.message
        });
    }
}
