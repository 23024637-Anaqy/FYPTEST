// Test script to verify production database connection
// This can be run on Vercel to debug the issue

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function testVercelDatabase() {
    console.log('🔍 Testing Vercel database connection...');
    
    // Use the same MongoDB URI from environment
    const mongoUri = process.env.MONGODB_URI;
    console.log('MongoDB URI:', mongoUri ? 'Set ✅' : 'Not set ❌');
    
    if (!mongoUri) {
        console.log('❌ MONGODB_URI environment variable not found!');
        return;
    }
    
    try {
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');
        
        // Check which database we're connected to
        const dbName = mongoose.connection.db.databaseName;
        console.log('📊 Database name:', dbName);
        
        // List all collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('📋 Collections:', collections.map(c => c.name));
        
        // Check if users collection exists and has admin user
        const User = mongoose.model('User', new mongoose.Schema({
            username: String,
            password_hash: String,
            role: String,
            is_active: Boolean
        }));
        
        const adminUser = await User.findOne({ username: 'admin' });
        console.log('👤 Admin user:', adminUser ? {
            id: adminUser._id,
            username: adminUser.username,
            role: adminUser.role,
            has_password: !!adminUser.password_hash
        } : 'Not found ❌');
        
        if (adminUser) {
            // Test password verification
            const isValidPassword = await bcrypt.compare('admin123', adminUser.password_hash);
            console.log('🔐 Password test (admin123):', isValidPassword ? 'Valid ✅' : 'Invalid ❌');
        }
        
    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

// Export for Vercel serverless function
module.exports = async (req, res) => {
    let output = '';
    const originalLog = console.log;
    console.log = (...args) => {
        output += args.join(' ') + '\n';
        originalLog(...args);
    };
    
    await testVercelDatabase();
    
    res.status(200).json({
        message: 'Database test completed',
        output: output,
        timestamp: new Date().toISOString()
    });
};

// For local testing
if (require.main === module) {
    testVercelDatabase();
}
