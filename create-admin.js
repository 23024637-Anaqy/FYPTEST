const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'inventory.db');
console.log('📂 Database path:', dbPath);

// Create or connect to database
const db = new sqlite3.Database(dbPath);

// Create admin user with correct credentials
bcrypt.hash('admin123', 10, (err, hash) => {
    if (err) {
        console.error('❌ Error hashing password:', err);
        return;
    }

    console.log('🔐 Generated password hash for admin123');

    // Delete existing admin user and create new one
    db.run('DELETE FROM users WHERE username = ?', ['admin'], (err) => {
        if (err) {
            console.log('ℹ️ No existing admin to delete (this is normal)');
        }

        // Insert admin user
        db.run(
            `INSERT INTO users (username, password_hash, role, full_name, email, is_active, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            ['admin', hash, 'admin', 'System Administrator', 'admin@company.com', 1],
            function(err) {
                if (err) {
                    console.error('❌ Error creating admin user:', err);
                } else {
                    console.log('✅ Admin user created successfully!');
                    console.log('📋 Login Credentials:');
                    console.log('   Username: admin');
                    console.log('   Password: admin123');
                    console.log('   Role: admin');
                    
                    // Verify the user was created
                    db.get('SELECT username, role, full_name FROM users WHERE username = ?', ['admin'], (err, row) => {
                        if (err) {
                            console.error('❌ Error verifying user:', err);
                        } else {
                            console.log('✅ Verification successful:', row);
                        }
                        db.close();
                    });
                }
            }
        );
    });
});
