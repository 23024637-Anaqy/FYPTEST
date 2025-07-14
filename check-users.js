const mongoose = require('mongoose');
require('dotenv').config();

// User schema to match your models
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password_hash: String,
    role: { type: String, enum: ['admin', 'supervisor', 'user'], default: 'user' },
    full_name: String,
    email: String,
    is_active: { type: Boolean, default: true }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function checkDatabase() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB Atlas');
        
        // List all users
        const allUsers = await User.find({});
        console.log('\n📋 All users in database:');
        console.log('Total users:', allUsers.length);
        
        if (allUsers.length === 0) {
            console.log('❌ NO USERS FOUND IN DATABASE!');
            console.log('🔧 The database is empty. Need to run initialization script.');
        } else {
            allUsers.forEach((user, index) => {
                console.log(`${index + 1}. Username: ${user.username}`);
                console.log(`   Role: ${user.role}`);
                console.log(`   Active: ${user.is_active}`);
                console.log(`   Has Password: ${!!user.password_hash}`);
                console.log(`   Created: ${user.createdAt}`);
                console.log('---');
            });
        }
        
        await mongoose.disconnect();
        console.log('✅ Database check complete');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkDatabase();
