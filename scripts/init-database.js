const Database = require('../config/database');
const bcrypt = require('bcryptjs');

async function initializeDatabase() {
    console.log('🔧 Initializing database...');
    
    const db = new Database();
    
    try {
        // Wait for database initialization
        await new Promise((resolve) => {
            setTimeout(resolve, 1000);
        });

        console.log('📝 Creating additional sample data...');

        // Create additional users
        const hashedPassword = await bcrypt.hash('user123', 10);
        
        await db.run(
            'INSERT OR IGNORE INTO users (username, password_hash, role, full_name, email) VALUES (?, ?, ?, ?, ?)',
            ['supervisor', hashedPassword, 'supervisor', 'John Supervisor', 'supervisor@company.com']
        );

        await db.run(
            'INSERT OR IGNORE INTO users (username, password_hash, role, full_name, email) VALUES (?, ?, ?, ?, ?)',
            ['user1', hashedPassword, 'user', 'Jane User', 'user1@company.com']
        );

        // Add more sample products
        const products = [
            ['LAPTOP001', 'Laptop Computer', 'High-performance laptop for office work', 'Electronics', 899.99, 5, 50],
            ['MOUSE001', 'Wireless Mouse', 'Ergonomic wireless mouse', 'Electronics', 29.99, 10, 100],
            ['DESK001', 'Office Desk', 'Standing desk with adjustable height', 'Furniture', 299.99, 3, 20],
            ['CHAIR001', 'Office Chair', 'Ergonomic office chair with lumbar support', 'Furniture', 199.99, 5, 30],
            ['PAPER001', 'Copy Paper', 'A4 copy paper 500 sheets', 'Office Supplies', 9.99, 20, 200],
            ['PEN001', 'Ballpoint Pen', 'Blue ballpoint pen pack of 10', 'Office Supplies', 4.99, 50, 500]
        ];

        for (const product of products) {
            await db.run(
                'INSERT OR IGNORE INTO products (product_code, product_name, description, category, unit_price, min_stock_level, max_stock_level) VALUES (?, ?, ?, ?, ?, ?, ?)',
                product
            );
        }

        // Add initial stock for some products
        const stockEntries = [
            [1, 1, 25], // Product 1 at Location 1, qty 25
            [1, 2, 15], // Product 1 at Location 2, qty 15
            [2, 1, 35], // Product 2 at Location 1, qty 35
            [3, 3, 8],  // Product 3 at Location 3, qty 8
            [4, 1, 45], // Product 4 at Location 1, qty 45
            [5, 2, 22], // Product 5 at Location 2, qty 22
            [6, 1, 12], // Product 6 at Location 1, qty 12
        ];

        for (const [productId, locationId, quantity] of stockEntries) {
            await db.run(
                'INSERT OR IGNORE INTO stock (product_id, location_id, current_quantity) VALUES (?, ?, ?)',
                [productId, locationId, quantity]
            );
        }

        console.log('✅ Database initialization completed successfully!');
        console.log('\n📋 Default Login Credentials:');
        console.log('  Admin:      admin / admin123');
        console.log('  Supervisor: supervisor / user123');
        console.log('  User:       user1 / user123');
        console.log('\n🚀 You can now start the server with: npm start');

    } catch (error) {
        console.error('❌ Database initialization failed:', error);
    } finally {
        await db.close();
    }
}

// Run initialization
initializeDatabase();
