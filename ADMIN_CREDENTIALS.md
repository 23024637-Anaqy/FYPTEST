## 🔐 Admin Credentials Troubleshooting

If the admin login isn't working, try these credentials in order:

### **Primary Credentials:**
- **Username:** `admin`
- **Password:** `admin123`

### **Alternative Credentials:**
- **Username:** `admin`
- **Password:** `Admin123`

### **Backup User Accounts:**
- **Username:** `supervisor`
- **Password:** `user123`
- **Role:** Supervisor (can access most features)

### **Manual Password Reset:**

If none of the above work, run this command in the terminal from the project directory:

```bash
node -e "
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const db = new sqlite3.Database('./database/inventory.db');

bcrypt.hash('admin123', 10, (err, hash) => {
    if (err) {
        console.log('Error:', err);
        return;
    }
    
    db.run('UPDATE users SET password_hash = ? WHERE username = ?', [hash, 'admin'], function(err) {
        if (err) {
            console.log('Update error:', err);
        } else {
            console.log('✅ Admin password reset to: admin123');
        }
        db.close();
    });
});
"
```

### **Create New Admin User:**

If the admin user doesn't exist, run this:

```bash
node -e "
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const db = new sqlite3.Database('./database/inventory.db');

bcrypt.hash('admin123', 10, (err, hash) => {
    if (err) {
        console.log('Error:', err);
        return;
    }
    
    db.run('INSERT OR REPLACE INTO users (username, password_hash, role, full_name, email, is_active) VALUES (?, ?, ?, ?, ?, ?)', 
    ['admin', hash, 'admin', 'System Administrator', 'admin@company.com', 1], 
    function(err) {
        if (err) {
            console.log('Insert error:', err);
        } else {
            console.log('✅ Admin user created with password: admin123');
        }
        db.close();
    });
});
"
```

### **Verify Current Users:**

To see what users exist in the database:

```bash
node -e "
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/inventory.db');

db.all('SELECT username, role, full_name FROM users', (err, rows) => {
    if (err) {
        console.log('Error:', err);
    } else {
        console.log('Current users:', rows);
    }
    db.close();
});
"
```

### **Troubleshooting Steps:**

1. **Check if server is running:** Open http://localhost:3000
2. **Try all credential combinations above**
3. **Run the manual password reset script**
4. **Check browser developer console for any error messages**
5. **Ensure JavaScript is enabled in your browser**

### **Browser Console Check:**

If login still fails, open browser Developer Tools (F12) and check the Console tab for any error messages. The app should show detailed error messages there.

### **Direct Database Access:**

If you have SQLite tools installed, you can check the database directly:

```bash
sqlite3 database/inventory.db "SELECT username, role FROM users;"
```

The correct credentials should definitely be:
- **Username:** admin
- **Password:** admin123
