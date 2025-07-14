const express = require('express');
const { Product, Location, Stock, Transaction, AuditLog } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');

const createInventoryRoutes = () => {
    const router = express.Router();

    // Get all products
    router.get('/products', authenticateToken, async (req, res) => {
        try {
            const products = await Product.find({ is_active: true }).sort({ product_code: 1 });
            res.json(products);
        } catch (error) {
            console.error('Get products error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Create new product
    router.post('/products', authenticateToken, requireRole('admin', 'supervisor'), async (req, res) => {
        try {
            const { product_code, product_name, description, category, unit_price, min_stock_level, max_stock_level } = req.body;

            if (!product_code || !product_name) {
                return res.status(400).json({ error: 'Product code and name are required' });
            }

            // Check if product code already exists
            const existingProduct = await Product.findOne({ product_code });
            if (existingProduct) {
                return res.status(409).json({ error: 'Product code already exists' });
            }

            const product = new Product({
                product_code,
                product_name,
                description,
                category,
                unit_price: unit_price || 0,
                min_stock_level: min_stock_level || 0,
                max_stock_level: max_stock_level || 1000,
                is_active: true
            });

            await product.save();

            // Get user ID properly for audit log
            let userId = req.user.id;
            if (typeof userId === 'number' || !userId.match(/^[0-9a-fA-F]{24}$/)) {
                const { User } = require('../models');
                const user = await User.findOne({ username: req.user.username });
                userId = user ? user._id : userId;
            }

            // Log audit
            const auditLog = new AuditLog({
                user_id: userId,
                action: 'CREATE_PRODUCT',
                details: JSON.stringify({ product_id: product._id, product_code, product_name }),
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });
            await auditLog.save();

            res.status(201).json(product);
        } catch (error) {
            console.error('Create product error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Update product
    router.put('/products/:id', authenticateToken, requireRole('admin', 'supervisor'), async (req, res) => {
        try {
            const { id } = req.params;
            const { product_name, description, category, unit_price, min_stock_level, max_stock_level } = req.body;

            const product = await Product.findById(id);
            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }

            // Update product fields
            if (product_name) product.product_name = product_name;
            if (description) product.description = description;
            if (category) product.category = category;
            if (unit_price !== undefined) product.unit_price = unit_price;
            if (min_stock_level !== undefined) product.min_stock_level = min_stock_level;
            if (max_stock_level !== undefined) product.max_stock_level = max_stock_level;

            await product.save();

            // Log audit
            const auditLog = new AuditLog({
                user_id: req.user.id,
                action: 'UPDATE_PRODUCT',
                details: JSON.stringify({ product_id: id, changes: req.body }),
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });
            await auditLog.save();

            res.json(product);
        } catch (error) {
            console.error('Update product error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Get all locations
    router.get('/locations', authenticateToken, async (req, res) => {
        try {
            const locations = await Location.find({ is_active: true }).sort({ location_code: 1 });
            res.json(locations);
        } catch (error) {
            console.error('Get locations error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Create new location
    router.post('/locations', authenticateToken, requireRole('admin', 'supervisor'), async (req, res) => {
        try {
            const { location_code, location_name, description } = req.body;

            if (!location_code || !location_name) {
                return res.status(400).json({ error: 'Location code and name are required' });
            }

            // Check if location code already exists
            const existingLocation = await Location.findOne({ location_code });
            if (existingLocation) {
                return res.status(409).json({ error: 'Location code already exists' });
            }

            const location = new Location({
                location_code,
                location_name,
                description,
                is_active: true
            });

            await location.save();

            // Log audit
            const auditLog = new AuditLog({
                user_id: req.user.id,
                action: 'CREATE_LOCATION',
                table_name: 'locations',
                record_id: location._id.toString(),
                new_values: JSON.stringify({ location_code, location_name, description }),
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });
            await auditLog.save();

            res.status(201).json(location);
        } catch (error) {
            console.error('Create location error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Get stock levels
    router.get('/stock', authenticateToken, async (req, res) => {
        try {
            const { location_id, product_id, low_stock } = req.query;

            let filter = {};
            if (location_id) filter.location_id = location_id;
            if (product_id) filter.product_id = product_id;

            const stockLevels = await Stock.find(filter)
                .populate('product_id', 'product_code product_name min_stock_level max_stock_level')
                .populate('location_id', 'location_code location_name')
                .sort({ 'product_id.product_code': 1 });

            // Filter for low stock if requested
            let filteredStock = stockLevels;
            if (low_stock === 'true') {
                filteredStock = stockLevels.filter(stock => 
                    stock.current_quantity < stock.product_id.min_stock_level
                );
            }

            res.json(filteredStock);
        } catch (error) {
            console.error('Get stock error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Inbound transaction
    router.post('/inbound', authenticateToken, async (req, res) => {
        try {
            const { product_id, location_id, quantity, reference_number, notes } = req.body;

            if (!product_id || !location_id || !quantity || quantity <= 0) {
                return res.status(400).json({ error: 'Product, location, and positive quantity are required' });
            }

            // Verify product and location exist
            const product = await Product.findById(product_id);
            const location = await Location.findById(location_id);

            if (!product || !location) {
                return res.status(404).json({ error: 'Product or location not found' });
            }

            // Create transaction
            const transaction = new Transaction({
                transaction_id: `INBOUND-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                transaction_type: 'inbound',
                product_id,
                to_location_id: location_id,
                quantity: parseInt(quantity),
                reference_number,
                notes,
                user_id: req.user.id
            });

            await transaction.save();

            // Update stock levels
            let stock = await Stock.findOne({ product_id, location_id });
            if (stock) {
                stock.current_quantity += parseInt(quantity);
                stock.last_updated = new Date();
            } else {
                stock = new Stock({
                    product_id,
                    location_id,
                    current_quantity: parseInt(quantity)
                });
            }
            await stock.save();

            // Log audit
            const auditLog = new AuditLog({
                user_id: req.user.id,
                action: 'INBOUND_TRANSACTION',
                details: JSON.stringify({ transaction_id: transaction._id, product_id, location_id, quantity }),
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });
            await auditLog.save();

            res.status(201).json({
                message: 'Inbound transaction completed successfully',
                transaction_id: transaction._id,
                new_stock_level: stock.current_quantity
            });

        } catch (error) {
            console.error('Inbound transaction error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Outbound transaction
    router.post('/outbound', authenticateToken, async (req, res) => {
        try {
            const { product_id, location_id, quantity, reference_number, notes } = req.body;

            if (!product_id || !location_id || !quantity || quantity <= 0) {
                return res.status(400).json({ error: 'Product, location, and positive quantity are required' });
            }

            // Verify product and location exist
            const product = await Product.findById(product_id);
            const location = await Location.findById(location_id);

            if (!product || !location) {
                return res.status(404).json({ error: 'Product or location not found' });
            }

            // Check current stock level
            const stock = await Stock.findOne({ product_id, location_id });
            if (!stock || stock.current_quantity < parseInt(quantity)) {
                return res.status(400).json({ 
                    error: 'Insufficient stock',
                    current_stock: stock ? stock.current_quantity : 0,
                    requested: parseInt(quantity)
                });
            }

            // Create transaction
            const transaction = new Transaction({
                transaction_id: `OUTBOUND-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                transaction_type: 'outbound',
                product_id,
                from_location_id: location_id,
                quantity: parseInt(quantity),
                reference_number,
                notes,
                user_id: req.user.id
            });

            await transaction.save();

            // Update stock levels
            stock.current_quantity -= parseInt(quantity);
            stock.last_updated = new Date();
            await stock.save();

            // Log audit
            const auditLog = new AuditLog({
                user_id: req.user.id,
                action: 'OUTBOUND_TRANSACTION',
                details: JSON.stringify({ transaction_id: transaction._id, product_id, location_id, quantity }),
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });
            await auditLog.save();

            res.status(201).json({
                message: 'Outbound transaction completed successfully',
                transaction_id: transaction._id,
                new_stock_level: stock.current_quantity
            });

        } catch (error) {
            console.error('Outbound transaction error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Move transaction
    router.post('/move', authenticateToken, async (req, res) => {
        try {
            const { product_id, from_location_id, to_location_id, quantity, reference_number, notes } = req.body;

            if (!product_id || !from_location_id || !to_location_id || !quantity || quantity <= 0) {
                return res.status(400).json({ error: 'Product, locations, and positive quantity are required' });
            }

            if (from_location_id === to_location_id) {
                return res.status(400).json({ error: 'From and to locations must be different' });
            }

            // Verify product and locations exist
            const product = await Product.findById(product_id);
            const fromLocation = await Location.findById(from_location_id);
            const toLocation = await Location.findById(to_location_id);

            if (!product || !fromLocation || !toLocation) {
                return res.status(404).json({ error: 'Product or location not found' });
            }

            // Check current stock level at source location
            const fromStock = await Stock.findOne({ product_id, location_id: from_location_id });
            if (!fromStock || fromStock.current_quantity < parseInt(quantity)) {
                return res.status(400).json({ 
                    error: 'Insufficient stock at source location',
                    current_stock: fromStock ? fromStock.current_quantity : 0,
                    requested: parseInt(quantity)
                });
            }

            // Create transaction
            const transaction = new Transaction({
                transaction_id: `MOVE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                transaction_type: 'move',
                product_id,
                from_location_id,
                to_location_id,
                quantity: parseInt(quantity),
                reference_number,
                notes,
                user_id: req.user.id
            });

            await transaction.save();

            // Update source stock
            fromStock.current_quantity -= parseInt(quantity);
            fromStock.last_updated = new Date();
            await fromStock.save();

            // Update destination stock
            let toStock = await Stock.findOne({ product_id, location_id: to_location_id });
            if (toStock) {
                toStock.current_quantity += parseInt(quantity);
                toStock.last_updated = new Date();
            } else {
                toStock = new Stock({
                    product_id,
                    location_id: to_location_id,
                    current_quantity: parseInt(quantity)
                });
            }
            await toStock.save();

            // Log audit
            const auditLog = new AuditLog({
                user_id: req.user.id,
                action: 'MOVE_TRANSACTION',
                details: JSON.stringify({ 
                    transaction_id: transaction._id, 
                    product_id, 
                    from_location_id, 
                    to_location_id, 
                    quantity 
                }),
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });
            await auditLog.save();

            res.status(201).json({
                message: 'Move transaction completed successfully',
                transaction_id: transaction._id,
                from_stock_level: fromStock.current_quantity,
                to_stock_level: toStock.current_quantity
            });

        } catch (error) {
            console.error('Move transaction error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Get transactions
    router.get('/transactions', authenticateToken, async (req, res) => {
        try {
            const { 
                type, 
                product_id, 
                location_id, 
                start_date, 
                end_date, 
                limit = 50,
                offset = 0 
            } = req.query;

            let filter = {};
            if (type) filter.transaction_type = type;
            if (product_id) filter.product_id = product_id;
            // Fix: Use correct location field names
            if (location_id) {
                filter.$or = [
                    { from_location_id: location_id },
                    { to_location_id: location_id }
                ];
            }
            
            if (start_date || end_date) {
                filter.createdAt = {};
                if (start_date) filter.createdAt.$gte = new Date(start_date);
                if (end_date) filter.createdAt.$lte = new Date(end_date);
            }

            const transactions = await Transaction.find(filter)
                .populate('product_id', 'product_code product_name')
                .populate('from_location_id', 'location_code location_name')
                .populate('to_location_id', 'location_code location_name')
                .populate('user_id', 'username full_name')
                .sort({ createdAt: -1 })
                .limit(parseInt(limit))
                .skip(parseInt(offset));

            const total = await Transaction.countDocuments(filter);

            res.json({
                transactions,
                total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

        } catch (error) {
            console.error('Get transactions error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Dashboard statistics
    router.get('/dashboard', authenticateToken, async (req, res) => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const [
                totalProducts,
                totalLocations,
                todayTransactions,
                lowStockItems
            ] = await Promise.all([
                Product.countDocuments({ is_active: true }),
                Location.countDocuments({ is_active: true }),
                Transaction.countDocuments({ createdAt: { $gte: today } }),
                Stock.aggregate([
                    {
                        $lookup: {
                            from: 'products',
                            localField: 'product_id',
                            foreignField: '_id',
                            as: 'product'
                        }
                    },
                    {
                        $unwind: '$product'
                    },
                    {
                        $match: {
                            $expr: { $lt: ['$current_quantity', '$product.min_stock_level'] }
                        }
                    },
                    {
                        $count: 'lowStockCount'
                    }
                ])
            ]);

            const recentTransactions = await Transaction.find()
                .populate('product_id', 'product_code product_name')
                .populate('from_location_id', 'location_code location_name')
                .populate('to_location_id', 'location_code location_name')
                .sort({ createdAt: -1 })
                .limit(5);

            res.json({
                statistics: {
                    total_products: totalProducts,
                    total_locations: totalLocations,
                    today_transactions: todayTransactions,
                    low_stock_items: lowStockItems[0]?.lowStockCount || 0
                },
                recent_transactions: recentTransactions
            });

        } catch (error) {
            console.error('Dashboard error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    return router;
};

module.exports = createInventoryRoutes;
