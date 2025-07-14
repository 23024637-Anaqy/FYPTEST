const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

async function verifyAndFixAdmin() {
    const dbPath = path.join(__dirname, '..', 'database', 'inventory.db');
    const db = new sqlite3.Database(dbPath);

    console.log('🔍 Checking database at:', dbPath);

    // Check if users table exists
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
        if (err) {
            console.error('Error checking table:', err);
            return;
        }

        if (!row) {
            console.log('❌ Users table does not exist!');
            db.close();
            return;
        }

        console.log('✅ Users table exists');

        // Check existing users
        db.all("SELECT username, role, full_name FROM users", (err, rows) => {
            if (err) {
                console.error('Error reading users:', err);
                db.close();
                return;
            }

            console.log('📋 Existing users:', rows);

            if (rows.length === 0) {
                console.log('⚠️ No users found, creating admin user...');
                
                // Create admin user
                bcrypt.hash('admin123', 10, (err, hash) => {
                    if (err) {
                        console.error('Error hashing password:', err);
                        db.close();
                        return;
                    }

                    db.run(
                        "INSERT INTO users (username, password_hash, role, full_name, email, is_active) VALUES (?, ?, ?, ?, ?, ?)",
                        ['admin', hash, 'admin', 'System Administrator', 'admin@company.com', 1],
                        function(err) {
                            if (err) {
                                console.error('Error creating admin user:', err);
                            } else {
                                console.log('✅ Admin user created successfully!');
                                console.log('📋 Login Credentials:');
                                console.log('   Username: admin');
                                console.log('   Password: admin123');
                            }
                            db.close();
                        }
                    );
                });
            } else {
                // Update admin password if user exists
                bcrypt.hash('admin123', 10, (err, hash) => {
                    if (err) {
                        console.error('Error hashing password:', err);
                        db.close();
                        return;
                    }

                    db.run(
                        "UPDATE users SET password_hash = ? WHERE username = ?",
                        [hash, 'admin'],
                        function(err) {
                            if (err) {
                                console.error('Error updating admin password:', err);
                            } else {
                                console.log('✅ Admin password updated successfully!');
                                console.log('📋 Login Credentials:');
                                console.log('   Username: admin');
                                console.log('   Password: admin123');
                            }
                            db.close();
                        }
                    );
                });
            }
        });
    });
}

verifyAndFixAdmin();
