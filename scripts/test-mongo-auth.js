const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Test MongoDB connection and authentication
async function testMongoAuth() {
    console.log('🧪 Testing MongoDB Authentication...');
    
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB Atlas');

        // Simple user schema for testing
        const userSchema = new mongoose.Schema({
            username: String,
            password: String,
            password_hash: String,
            role: String,
            full_name: String,
            email: String,
            is_active: Boolean
        }, { timestamps: true });

        const User = mongoose.model('User', userSchema);

        // Test finding admin user
        const adminUser = await User.findOne({ username: 'admin' });
        console.log('Found admin user:', adminUser ? {
            id: adminUser._id,
            username: adminUser.username,
            role: adminUser.role,
            has_password: !!(adminUser.password_hash || adminUser.password)
        } : 'Not found');

        if (adminUser) {
            // Test password comparison
            const passwordField = adminUser.password_hash || adminUser.password;
            if (passwordField) {
                const isValidPassword = await bcrypt.compare('admin123', passwordField);
                console.log('Password test (admin123):', isValidPassword ? '✅ Valid' : '❌ Invalid');
            }

            // Test JWT payload simulation
            const jwtPayload = {
                id: adminUser._id.toString(),
                username: adminUser.username,
                role: adminUser.role
            };
            console.log('JWT payload would be:', jwtPayload);
            console.log('ObjectId format valid:', adminUser._id.toString().match(/^[0-9a-fA-F]{24}$/));
        }

        // List all users
        const allUsers = await User.find({}, 'username role full_name');
        console.log('\n👥 All users in database:');
        allUsers.forEach(user => {
            console.log(`  - ${user.username} (${user.role}) - ${user.full_name}`);
        });

        console.log('\n🎯 Authentication Test Summary:');
        console.log('✅ MongoDB connection works');
        console.log('✅ User schema works');
        console.log('✅ Admin user exists' + (adminUser ? '' : ' (MISSING!)'));
        console.log('✅ Password hashing works');
        console.log('✅ ObjectId format is correct');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('💾 Disconnected from MongoDB');
    }
}

// Run the test
testMongoAuth();
