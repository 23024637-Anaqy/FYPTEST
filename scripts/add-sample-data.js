const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const { Product, Location, Stock, Transaction, User } = require('../models');

async function addSampleData() {
    console.log('🏀 Adding Lakers Inventory Sample Data...');
    
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find admin user for transactions
        const adminUser = await User.findOne({ username: 'admin' });
        if (!adminUser) {
            console.log('❌ Admin user not found. Run npm run fix-admin-mongo first.');
            return;
        }

        // Sample Products
        const products = [
            {
                product_code: 'LAPTOP001',
                product_name: 'Dell Latitude Laptop',
                description: 'Business laptop with 16GB RAM',
                category: 'Electronics',
                unit_price: 1200.00,
                min_stock_level: 5,
                max_stock_level: 50,
                is_active: true
            },
            {
                product_code: 'MOUSE001', 
                product_name: 'Wireless Mouse',
                description: 'Ergonomic wireless mouse',
                category: 'Electronics',
                unit_price: 25.99,
                min_stock_level: 10,
                max_stock_level: 100,
                is_active: true
            },
            {
                product_code: 'DESK001',
                product_name: 'Office Desk',
                description: 'Standing desk with adjustable height',
                category: 'Furniture',
                unit_price: 450.00,
                min_stock_level: 3,
                max_stock_level: 20,
                is_active: true
            },
            {
                product_code: 'CHAIR001',
                product_name: 'Ergonomic Chair',
                description: 'Purple office chair (Lakers style!)',
                category: 'Furniture',
                unit_price: 300.00,
                min_stock_level: 5,
                max_stock_level: 30,
                is_active: true
            },
            {
                product_code: 'PAPER001',
                product_name: 'Copy Paper A4',
                description: 'White copy paper 500 sheets',
                category: 'Office Supplies',
                unit_price: 12.50,
                min_stock_level: 20,
                max_stock_level: 200,
                is_active: true
            }
        ];

        // Sample Locations
        const locations = [
            {
                location_code: 'WH001',
                location_name: 'Main Warehouse',
                description: 'Primary storage facility',
                is_active: true
            },
            {
                location_code: 'WH002',
                location_name: 'Secondary Warehouse', 
                description: 'Overflow storage area',
                is_active: true
            },
            {
                location_code: 'STORE001',
                location_name: 'Lakers Store Downtown',
                description: 'Main retail location',
                is_active: true
            },
            {
                location_code: 'SHIPPING',
                location_name: 'Shipping Dock',
                description: 'Outbound shipping area',
                is_active: true
            }
        ];

        // Create products (avoid duplicates)
        console.log('📦 Creating products...');
        const createdProducts = [];
        for (const productData of products) {
            const existing = await Product.findOne({ product_code: productData.product_code });
            if (!existing) {
                const product = new Product(productData);
                await product.save();
                createdProducts.push(product);
                console.log(`✅ Created product: ${product.product_code} - ${product.product_name}`);
            } else {
                createdProducts.push(existing);
                console.log(`ℹ️  Product exists: ${existing.product_code}`);
            }
        }

        // Create locations (avoid duplicates)
        console.log('📍 Creating locations...');
        const createdLocations = [];
        for (const locationData of locations) {
            const existing = await Location.findOne({ location_code: locationData.location_code });
            if (!existing) {
                const location = new Location(locationData);
                await location.save();
                createdLocations.push(location);
                console.log(`✅ Created location: ${location.location_code} - ${location.location_name}`);
            } else {
                createdLocations.push(existing);
                console.log(`ℹ️  Location exists: ${existing.location_code}`);
            }
        }

        // Create initial stock levels
        console.log('📊 Adding initial stock...');
        const stockData = [
            { productCode: 'LAPTOP001', locationCode: 'WH001', quantity: 25 },
            { productCode: 'LAPTOP001', locationCode: 'STORE001', quantity: 5 },
            { productCode: 'MOUSE001', locationCode: 'WH001', quantity: 45 },
            { productCode: 'MOUSE001', locationCode: 'STORE001', quantity: 15 },
            { productCode: 'DESK001', locationCode: 'WH001', quantity: 12 },
            { productCode: 'CHAIR001', locationCode: 'WH001', quantity: 18 },
            { productCode: 'CHAIR001', locationCode: 'STORE001', quantity: 8 },
            { productCode: 'PAPER001', locationCode: 'WH001', quantity: 150 }
        ];

        for (const stock of stockData) {
            const product = createdProducts.find(p => p.product_code === stock.productCode);
            const location = createdLocations.find(l => l.location_code === stock.locationCode);

            if (product && location) {
                // Check if stock already exists
                const existingStock = await Stock.findOne({
                    product_id: product._id,
                    location_id: location._id
                });

                if (!existingStock) {
                    // Create stock record
                    const stockRecord = new Stock({
                        product_id: product._id,
                        location_id: location._id,
                        quantity: stock.quantity
                    });
                    await stockRecord.save();

                    // Create inbound transaction
                    const transaction = new Transaction({
                        transaction_id: `INIT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        transaction_type: 'inbound',
                        product_id: product._id,
                        to_location_id: location._id,
                        quantity: stock.quantity,
                        reference_number: `INIT-${Date.now()}`,
                        notes: 'Initial stock setup',
                        user_id: adminUser._id
                    });
                    await transaction.save();

                    console.log(`✅ Added ${stock.quantity} ${product.product_name} to ${location.location_name}`);
                } else {
                    console.log(`ℹ️  Stock exists: ${product.product_code} at ${location.location_code}`);
                }
            }
        }

        console.log('\n🎉 Sample data added successfully!');
        console.log('\n📊 Summary:');
        console.log(`Products: ${createdProducts.length}`);
        console.log(`Locations: ${createdLocations.length}`);
        
        const totalStock = await Stock.countDocuments();
        console.log(`Stock Records: ${totalStock}`);

        console.log('\n🏀 Your Lakers Inventory System is ready!');
        console.log('Login at http://localhost:3000 with admin/admin123');

    } catch (error) {
        console.error('❌ Error adding sample data:', error);
    } finally {
        await mongoose.disconnect();
    }
}

// Run the script
addSampleData();
