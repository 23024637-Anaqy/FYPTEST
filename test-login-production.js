const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// User schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password_hash: String,
    role: { type: String, enum: ['admin', 'supervisor', 'user'], default: 'user' },
    full_name: String,
    email: String,
    is_active: { type: Boolean, default: true }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function testLogin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find admin user
        const user = await User.findOne({ username: 'admin' });
        
        if (!user) {
            console.log('❌ Admin user not found in database');
            console.log('Creating admin user...');
            
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const newAdmin = new User({
                username: 'admin',
                password_hash: hashedPassword,
                role: 'admin',
                full_name: 'System Administrator',
                email: 'admin@company.com',
                is_active: true
            });
            
            await newAdmin.save();
            console.log('✅ Admin user created successfully!');
            console.log('Credentials: admin / admin123');
            return;
        }

        console.log('✅ Admin user found:', {
            id: user._id,
            username: user.username,
            role: user.role,
            is_active: user.is_active
        });

        // Test password
        const testPasswords = ['admin123', 'Admin123', 'admin'];
        
        for (const password of testPasswords) {
            const isValid = await bcrypt.compare(password, user.password_hash);
            console.log(`Testing password "${password}": ${isValid ? '✅ VALID' : '❌ Invalid'}`);
            
            if (isValid) {
                console.log(`🎉 Login should work with: admin / ${password}`);
                break;
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

testLogin();
