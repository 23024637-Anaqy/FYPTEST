const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// User schema (simplified for this script)
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: String,
    password_hash: String,
    role: { type: String, enum: ['admin', 'supervisor', 'user'], default: 'user' },
    full_name: String,
    name: String,
    email: String,
    is_active: { type: Boolean, default: true },
    active: { type: Boolean, default: true }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function fixAdminCredentialsMongo() {
    console.log('🔧 Fixing admin credentials for MongoDB...');
    
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Check if admin user exists
        const existingAdmin = await User.findOne({ username: 'admin' });
        console.log('Existing admin user:', existingAdmin ? { id: existingAdmin._id, username: existingAdmin.username } : 'Not found');

        // Create correct password hash
        const hashedPassword = await bcrypt.hash('admin123', 10);
        console.log('Generated password hash for admin123');

        if (existingAdmin) {
            // Update existing admin user
            existingAdmin.password_hash = hashedPassword;
            existingAdmin.password = hashedPassword;
            existingAdmin.role = 'admin';
            existingAdmin.is_active = true;
            existingAdmin.active = true;
            await existingAdmin.save();
            console.log('✅ Updated existing admin user password');
        } else {
            // Create new admin user
            const newAdmin = new User({
                username: 'admin',
                password_hash: hashedPassword,
                password: hashedPassword,
                role: 'admin',
                full_name: 'System Administrator',
                name: 'System Administrator',
                email: 'admin@company.com',
                is_active: true,
                active: true
            });

            await newAdmin.save();
            console.log('✅ Created new admin user');
        }

        // Create demo user
        const existingDemo = await User.findOne({ username: 'demo' });
        if (!existingDemo) {
            const demoPassword = await bcrypt.hash('demo', 10);
            const demoUser = new User({
                username: 'demo',
                password_hash: demoPassword,
                password: demoPassword,
                role: 'user',
                full_name: 'Demo User',
                name: 'Demo User',
                email: 'demo@company.com',
                is_active: true,
                active: true
            });
            await demoUser.save();
            console.log('✅ Created demo user (demo/demo)');
        }

        // Create supervisor user
        const existingSupervisor = await User.findOne({ username: 'supervisor' });
        if (!existingSupervisor) {
            const supervisorPassword = await bcrypt.hash('super123', 10);
            const supervisorUser = new User({
                username: 'supervisor',
                password_hash: supervisorPassword,
                password: supervisorPassword,
                role: 'supervisor',
                full_name: 'Demo Supervisor',
                name: 'Demo Supervisor',
                email: 'supervisor@company.com',
                is_active: true,
                active: true
            });
            await supervisorUser.save();
            console.log('✅ Created supervisor user (supervisor/super123)');
        }

        // Verify the admin user
        const verifyAdmin = await User.findOne({ username: 'admin' });
        console.log('Verified admin user:', {
            id: verifyAdmin._id,
            username: verifyAdmin.username,
            role: verifyAdmin.role,
            full_name: verifyAdmin.full_name || verifyAdmin.name,
            has_password: !!verifyAdmin.password_hash || !!verifyAdmin.password
        });

        // Test password verification
        const passwordToTest = verifyAdmin.password_hash || verifyAdmin.password;
        const testPassword = await bcrypt.compare('admin123', passwordToTest);
        console.log('Password verification test:', testPassword);

        console.log('\n🎯 MongoDB Login Credentials Ready:');
        console.log('  Admin: admin / admin123');
        console.log('  Supervisor: supervisor / super123');
        console.log('  User: demo / demo');

        console.log('\n🏀 Lakers Inventory System - Ready to go!');

    } catch (error) {
        console.error('❌ Error fixing admin credentials:', error);
    } finally {
        await mongoose.disconnect();
        console.log('💾 Disconnected from MongoDB');
    }
}

// Run the fix
fixAdminCredentialsMongo();
