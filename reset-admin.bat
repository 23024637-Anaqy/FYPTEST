@echo off
echo Resetting admin password...
node -e "const sqlite3 = require('sqlite3').verbose(); const bcrypt = require('bcryptjs'); const db = new sqlite3.Database('./database/inventory.db'); bcrypt.hash('admin123', 10, (err, hash) => { if (err) { console.log('Error:', err); return; } db.run('INSERT OR REPLACE INTO users (username, password_hash, role, full_name, email, is_active) VALUES (?, ?, ?, ?, ?, ?)', ['admin', hash, 'admin', 'System Administrator', 'admin@company.com', 1], function(err) { if (err) { console.log('Error:', err); } else { console.log('SUCCESS: Admin password reset to admin123'); } db.close(); }); });"
echo.
echo Admin credentials:
echo Username: admin
echo Password: admin123
echo.
pause
