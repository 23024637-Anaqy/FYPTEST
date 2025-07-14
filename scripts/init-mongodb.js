const bcrypt = require('bcryptjs');
const { User, Product, Location, Stock } = require('../models');

async function initializeMongoDB() {
    console.log('🔧 Initializing MongoDB with sample data...');

    try {
        // Create default admin user
        const existingAdmin = await User.findOne({ username: 'admin' });
        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const adminUser = new User({
                username: 'admin',
                password_hash: hashedPassword,
                role: 'admin',
                full_name: 'System Administrator',
                email: 'admin@company.com'
            });
            await adminUser.save();
            console.log('✅ Admin user created');
        }

        // Create additional users
        const users = [
            {
                username: 'supervisor',
                password_hash: await bcrypt.hash('user123', 10),
                role: 'supervisor',
                full_name: 'John Supervisor',
                email: 'supervisor@company.com'
            },
            {
                username: 'user1',
                password_hash: await bcrypt.hash('user123', 10),
                role: 'user',
                full_name: 'Jane User',
                email: 'user1@company.com'
            }
        ];

        for (const userData of users) {
            const existingUser = await User.findOne({ username: userData.username });
            if (!existingUser) {
                const user = new User(userData);
                await user.save();
                console.log(`✅ User ${userData.username} created`);
            }
        }

        // Create locations
        const locations = [
            { location_code: 'WH001', location_name: 'Main Warehouse', description: 'Primary storage facility' },
            { location_code: 'WH002', location_name: 'Secondary Warehouse', description: 'Overflow storage' },
            { location_code: 'RETAIL', location_name: 'Retail Store', description: 'Customer-facing retail location' },
            { location_code: 'SHIPPING', location_name: 'Shipping Dock', description: 'Outbound shipping area' },
            { location_code: 'RECEIVING', location_name: 'Receiving Dock', description: 'Inbound receiving area' }
        ];

        for (const locationData of locations) {
            const existingLocation = await Location.findOne({ location_code: locationData.location_code });
            if (!existingLocation) {
                const location = new Location(locationData);
                await location.save();
                console.log(`✅ Location ${locationData.location_code} created`);
            }
        }

        // Create products
        const products = [
            {
                product_code: 'LAPTOP001',
                product_name: 'Laptop Computer',
                description: 'High-performance laptop for office work',
                category: 'Electronics',
                unit_price: 899.99,
                min_stock_level: 5,
                max_stock_level: 50
            },
            {
                product_code: 'MOUSE001',
                product_name: 'Wireless Mouse',
                description: 'Ergonomic wireless mouse',
                category: 'Electronics',
                unit_price: 29.99,
                min_stock_level: 10,
                max_stock_level: 100
            },
            {
                product_code: 'DESK001',
                product_name: 'Office Desk',
                description: 'Standing desk with adjustable height',
                category: 'Furniture',
                unit_price: 299.99,
                min_stock_level: 3,
                max_stock_level: 20
            },
            {
                product_code: 'CHAIR001',
                product_name: 'Office Chair',
                description: 'Ergonomic office chair with lumbar support',
                category: 'Furniture',
                unit_price: 199.99,
                min_stock_level: 5,
                max_stock_level: 30
            },
            {
                product_code: 'PAPER001',
                product_name: 'Copy Paper',
                description: 'A4 copy paper 500 sheets',
                category: 'Office Supplies',
                unit_price: 9.99,
                min_stock_level: 20,
                max_stock_level: 200
            }
        ];

        for (const productData of products) {
            const existingProduct = await Product.findOne({ product_code: productData.product_code });
            if (!existingProduct) {
                const product = new Product(productData);
                await product.save();
                console.log(`✅ Product ${productData.product_code} created`);
            }
        }

        // Create some initial stock
        const mainWarehouse = await Location.findOne({ location_code: 'WH001' });
        const laptop = await Product.findOne({ product_code: 'LAPTOP001' });
        const mouse = await Product.findOne({ product_code: 'MOUSE001' });

        if (mainWarehouse && laptop) {
            const existingStock = await Stock.findOne({ product_id: laptop._id, location_id: mainWarehouse._id });
            if (!existingStock) {
                const stock = new Stock({
                    product_id: laptop._id,
                    location_id: mainWarehouse._id,
                    current_quantity: 25
                });
                await stock.save();
                console.log('✅ Initial stock created for laptop');
            }
        }

        if (mainWarehouse && mouse) {
            const existingStock = await Stock.findOne({ product_id: mouse._id, location_id: mainWarehouse._id });
            if (!existingStock) {
                const stock = new Stock({
                    product_id: mouse._id,
                    location_id: mainWarehouse._id,
                    current_quantity: 45
                });
                await stock.save();
                console.log('✅ Initial stock created for mouse');
            }
        }

        console.log('\n✅ MongoDB initialization completed successfully!');
        console.log('\n📋 Default Login Credentials:');
        console.log('  Admin:      admin / admin123');
        console.log('  Supervisor: supervisor / user123');
        console.log('  User:       user1 / user123');

    } catch (error) {
        console.error('❌ MongoDB initialization failed:', error);
    }
}

module.exports = { initializeMongoDB };
