const bcrypt = require('bcryptjs');
const Database = require('./config/database');

async function testAdminLogin() {
    console.log('🧪 Testing admin login credentials...');
    
    try {
        const db = new Database();
        
        // Wait for database initialization
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Get admin user
        const adminUser = await db.get(
            'SELECT username, password_hash, role FROM users WHERE username = ?',
            ['admin']
        );
        
        if (!adminUser) {
            console.log('❌ Admin user not found');
            await db.close();
            return;
        }
        
        console.log('✅ Admin user found:', {
            username: adminUser.username,
            role: adminUser.role
        });
        
        // Test password
        const isPasswordValid = await bcrypt.compare('admin123', adminUser.password_hash);
        
        if (isPasswordValid) {
            console.log('✅ Password verification successful!');
            console.log('\n📋 Correct Login Credentials:');
            console.log('   Username: admin');
            console.log('   Password: admin123');
        } else {
            console.log('❌ Password verification failed');
            
            // Update with correct password
            const newHash = await bcrypt.hash('admin123', 10);
            await db.run(
                'UPDATE users SET password_hash = ? WHERE username = ?',
                [newHash, 'admin']
            );
            console.log('✅ Password has been reset to: admin123');
        }
        
        await db.close();
        
    } catch (error) {
        console.error('❌ Error testing admin login:', error);
    }
}

testAdminLogin();
