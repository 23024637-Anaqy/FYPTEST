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

async function testPasswords() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB Atlas');
        
        // Get admin user
        const adminUser = await User.findOne({ username: 'admin' });
        if (!adminUser) {
            console.log('❌ Admin user not found');
            return;
        }
        
        console.log('👤 Testing passwords for admin user...');
        
        // Test different password combinations
        const passwordsToTest = [
            'admin123',
            'Admin123', 
            'admin',
            'password',
            'demo',
            'user123'
        ];
        
        for (const password of passwordsToTest) {
            try {
                const isValid = await bcrypt.compare(password, adminUser.password_hash);
                console.log(`🔐 Password "${password}": ${isValid ? '✅ CORRECT' : '❌ Wrong'}`);
                
                if (isValid) {
                    console.log(`\n🎉 FOUND WORKING PASSWORD: admin / ${password}`);
                    console.log('Use this for Vercel login!');
                    break;
                }
            } catch (error) {
                console.log(`❌ Error testing "${password}":`, error.message);
            }
        }
        
        // Also test supervisor user
        console.log('\n👤 Testing supervisor user...');
        const supervisor = await User.findOne({ username: 'supervisor' });
        if (supervisor) {
            for (const password of passwordsToTest) {
                try {
                    const isValid = await bcrypt.compare(password, supervisor.password_hash);
                    console.log(`🔐 Supervisor password "${password}": ${isValid ? '✅ CORRECT' : '❌ Wrong'}`);
                    
                    if (isValid) {
                        console.log(`\n🎉 SUPERVISOR WORKS: supervisor / ${password}`);
                        break;
                    }
                } catch (error) {
                    console.log(`❌ Error testing supervisor "${password}":`, error.message);
                }
            }
        }
        
        await mongoose.disconnect();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testPasswords();
