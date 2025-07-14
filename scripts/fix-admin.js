const Database = require('./config/database');
const bcrypt = require('bcryptjs');

async function fixAdminCredentials() {
    console.log('🔧 Fixing admin credentials...');
    
    const db = new Database();
    
    try {
        // Wait for database initialization
        await new Promise((resolve) => {
            setTimeout(resolve, 2000);
        });

        // Check if admin user exists
        const existingAdmin = await db.get('SELECT id, username FROM users WHERE username = ?', ['admin']);
        console.log('Existing admin user:', existingAdmin);

        // Create correct password hash
        const hashedPassword = await bcrypt.hash('admin123', 10);
        console.log('Generated password hash for admin123');

        if (existingAdmin) {
            // Update existing admin user
            await db.run(
                'UPDATE users SET password_hash = ? WHERE username = ?',
                [hashedPassword, 'admin']
            );
            console.log('✅ Updated existing admin user password');
        } else {
            // Create new admin user
            await db.run(
                'INSERT INTO users (username, password_hash, role, full_name, email) VALUES (?, ?, ?, ?, ?)',
                ['admin', hashedPassword, 'admin', 'System Administrator', 'admin@company.com']
            );
            console.log('✅ Created new admin user');
        }

        // Verify the user was created/updated correctly
        const verifyAdmin = await db.get('SELECT username, role, full_name FROM users WHERE username = ?', ['admin']);
        console.log('Verified admin user:', verifyAdmin);

        // Test password verification
        const testPassword = await bcrypt.compare('admin123', hashedPassword);
        console.log('Password verification test:', testPassword);

        console.log('\n📋 Corrected Login Credentials:');
        console.log('  Username: admin');
        console.log('  Password: admin123');

    } catch (error) {
        console.error('❌ Error fixing admin credentials:', error);
    } finally {
        await db.close();
    }
}

// Run the fix
fixAdminCredentials();
