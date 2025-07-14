const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        const dbPath = path.join(__dirname, '..', 'database', 'inventory.db');
        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err.message);
            } else {
                console.log('Connected to SQLite database');
                this.init();
            }
        });
    }

    async init() {
        return new Promise((resolve, reject) => {
            const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');
            
            this.db.exec(schema, async (err) => {
                if (err) {
                    console.error('Error initializing database:', err.message);
                    reject(err);
                } else {
                    console.log('Database initialized successfully');
                    await this.createDefaultAdmin();
                    resolve();
                }
            });
        });
    }

    async createDefaultAdmin() {
        try {
            const adminExists = await this.get('SELECT id FROM users WHERE username = ?', ['admin']);
            const hashedPassword = await bcrypt.hash('admin123', 10);
            
            if (!adminExists) {
                await this.run(
                    'INSERT INTO users (username, password_hash, role, full_name, email, is_active) VALUES (?, ?, ?, ?, ?, ?)',
                    ['admin', hashedPassword, 'admin', 'System Administrator', 'admin@company.com', 1]
                );
                console.log('✅ Default admin user created (username: admin, password: admin123)');
            } else {
                // Update existing admin password to ensure it's correct
                await this.run(
                    'UPDATE users SET password_hash = ? WHERE username = ?',
                    [hashedPassword, 'admin']
                );
                console.log('✅ Admin password updated (username: admin, password: admin123)');
            }
        } catch (error) {
            console.error('❌ Error creating/updating admin user:', error);
        }
    }

    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Transaction helper
    async runTransaction(operations) {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION');
                
                let completed = 0;
                const total = operations.length;
                const results = [];
                
                for (let i = 0; i < total; i++) {
                    const { sql, params } = operations[i];
                    this.db.run(sql, params, function(err) {
                        if (err) {
                            this.db.run('ROLLBACK');
                            reject(err);
                            return;
                        }
                        
                        results[i] = { id: this.lastID, changes: this.changes };
                        completed++;
                        
                        if (completed === total) {
                            this.db.run('COMMIT', (err) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve(results);
                                }
                            });
                        }
                    });
                }
            });
        });
    }

    close() {
        return new Promise((resolve) => {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err.message);
                } else {
                    console.log('Database connection closed');
                }
                resolve();
            });
        });
    }
}

module.exports = Database;
