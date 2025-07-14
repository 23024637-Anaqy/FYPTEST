const MongoDatabase = require('../config/mongodb');
const bcrypt = require('bcryptjs');
const path = require('path');

// Add parent directory to require path for models
const modelsPath = path.join(__dirname, '..', 'models');
const { User } = require(modelsPath);

async function fixAdminCredentialsMongo() {
    console.log('🔧 Fixing admin credentials for MongoDB...');
    
    const db = new MongoDatabase();
    
    try {
        // Connect to MongoDB
        await db.connect();
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
            existingAdmin.password = hashedPassword; // In case model uses 'password' field
            await existingAdmin.save();
            console.log('✅ Updated existing admin user password');
        } else {
            // Create new admin user
            const newAdmin = new User({
                username: 'admin',
                password_hash: hashedPassword,
                password: hashedPassword, // In case model uses 'password' field
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

        // Verify the user was created/updated correctly
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

        // Also create demo users for testing
        await createDemoUsers();

        console.log('\n📋 MongoDB Login Credentials:');
        console.log('  Username: admin');
        console.log('  Password: admin123');
        console.log('  Role: admin');

    } catch (error) {
        console.error('❌ Error fixing admin credentials:', error);
    } finally {
        await db.disconnect();
    }
}

async function createDemoUsers() {
    try {
        // Create demo user if it doesn't exist
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

        // Create supervisor user if it doesn't exist
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

        console.log('\n🎯 All Demo Accounts Ready:');
        console.log('  Admin: admin / admin123');
        console.log('  Supervisor: supervisor / super123');
        console.log('  User: demo / demo');

    } catch (error) {
        console.error('❌ Error creating demo users:', error);
    }
}

// Run the fix
fixAdminCredentialsMongo();
