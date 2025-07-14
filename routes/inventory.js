const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, requireRole } = require('../middleware/auth');

const createInventoryRoutes = (db) => {
    const router = express.Router();

    // Get all products
    router.get('/products', authenticateToken, async (req, res) => {
        try {
            const { page = 1, limit = 20, search = '', category = '' } = req.query;
            const offset = (page - 1) * limit;

            let sql = 'SELECT * FROM products WHERE is_active = 1';
            let params = [];

            if (search) {
                sql += ' AND (product_code LIKE ? OR product_name LIKE ?)';
                params.push(`%${search}%`, `%${search}%`);
            }

            if (category) {
                sql += ' AND category = ?';
                params.push(category);
            }

            sql += ' ORDER BY product_name LIMIT ? OFFSET ?';
            params.push(parseInt(limit), offset);

            const products = await db.all(sql, params);

            // Get total count
            let countSql = 'SELECT COUNT(*) as total FROM products WHERE is_active = 1';
            let countParams = [];

            if (search) {
                countSql += ' AND (product_code LIKE ? OR product_name LIKE ?)';
                countParams.push(`%${search}%`, `%${search}%`);
            }

            if (category) {
                countSql += ' AND category = ?';
                countParams.push(category);
            }

            const { total } = await db.get(countSql, countParams);

            res.json({
                products,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            });

        } catch (error) {
            console.error('Get products error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Get locations
    router.get('/locations', authenticateToken, async (req, res) => {
        try {
            const locations = await db.all(
                'SELECT * FROM locations WHERE is_active = 1 ORDER BY location_name'
            );
            res.json(locations);
        } catch (error) {
            console.error('Get locations error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Get current stock levels
    router.get('/stock', authenticateToken, async (req, res) => {
        try {
            const { location_id, product_id } = req.query;

            let sql = `
                SELECT 
                    s.id,
                    s.current_quantity,
                    s.reserved_quantity,
                    s.last_updated,
                    p.product_code,
                    p.product_name,
                    p.min_stock_level,
                    p.max_stock_level,
                    l.location_code,
                    l.location_name
                FROM stock s
                JOIN products p ON s.product_id = p.id
                JOIN locations l ON s.location_id = l.id
                WHERE p.is_active = 1 AND l.is_active = 1
            `;
            let params = [];

            if (location_id) {
                sql += ' AND s.location_id = ?';
                params.push(location_id);
            }

            if (product_id) {
                sql += ' AND s.product_id = ?';
                params.push(product_id);
            }

            sql += ' ORDER BY p.product_name, l.location_name';

            const stock = await db.all(sql, params);
            res.json(stock);

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

            const transaction_id = uuidv4();

            // Start transaction
            const operations = [
                // Insert transaction record
                {
                    sql: 'INSERT INTO transactions (transaction_id, transaction_type, product_id, to_location_id, quantity, reference_number, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    params: [transaction_id, 'inbound', product_id, location_id, quantity, reference_number, notes, req.user.id]
                },
                // Update or insert stock record
                {
                    sql: `INSERT INTO stock (product_id, location_id, current_quantity, last_updated) 
                          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                          ON CONFLICT(product_id, location_id) 
                          DO UPDATE SET current_quantity = current_quantity + ?, last_updated = CURRENT_TIMESTAMP`,
                    params: [product_id, location_id, quantity, quantity]
                }
            ];

            await db.runTransaction(operations);

            res.json({ 
                message: 'Inbound transaction completed successfully',
                transaction_id 
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

            // Check current stock
            const currentStock = await db.get(
                'SELECT current_quantity FROM stock WHERE product_id = ? AND location_id = ?',
                [product_id, location_id]
            );

            if (!currentStock || currentStock.current_quantity < quantity) {
                return res.status(400).json({ error: 'Insufficient stock available' });
            }

            const transaction_id = uuidv4();

            // Start transaction
            const operations = [
                // Insert transaction record
                {
                    sql: 'INSERT INTO transactions (transaction_id, transaction_type, product_id, from_location_id, quantity, reference_number, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    params: [transaction_id, 'outbound', product_id, location_id, quantity, reference_number, notes, req.user.id]
                },
                // Update stock record
                {
                    sql: 'UPDATE stock SET current_quantity = current_quantity - ?, last_updated = CURRENT_TIMESTAMP WHERE product_id = ? AND location_id = ?',
                    params: [quantity, product_id, location_id]
                }
            ];

            await db.runTransaction(operations);

            res.json({ 
                message: 'Outbound transaction completed successfully',
                transaction_id 
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
                return res.status(400).json({ error: 'Product, from/to locations, and positive quantity are required' });
            }

            if (from_location_id === to_location_id) {
                return res.status(400).json({ error: 'From and to locations must be different' });
            }

            // Check current stock
            const currentStock = await db.get(
                'SELECT current_quantity FROM stock WHERE product_id = ? AND location_id = ?',
                [product_id, from_location_id]
            );

            if (!currentStock || currentStock.current_quantity < quantity) {
                return res.status(400).json({ error: 'Insufficient stock available at source location' });
            }

            const transaction_id = uuidv4();

            // Start transaction
            const operations = [
                // Insert transaction record
                {
                    sql: 'INSERT INTO transactions (transaction_id, transaction_type, product_id, from_location_id, to_location_id, quantity, reference_number, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    params: [transaction_id, 'move', product_id, from_location_id, to_location_id, quantity, reference_number, notes, req.user.id]
                },
                // Decrease stock at source location
                {
                    sql: 'UPDATE stock SET current_quantity = current_quantity - ?, last_updated = CURRENT_TIMESTAMP WHERE product_id = ? AND location_id = ?',
                    params: [quantity, product_id, from_location_id]
                },
                // Increase stock at destination location
                {
                    sql: `INSERT INTO stock (product_id, location_id, current_quantity, last_updated) 
                          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                          ON CONFLICT(product_id, location_id) 
                          DO UPDATE SET current_quantity = current_quantity + ?, last_updated = CURRENT_TIMESTAMP`,
                    params: [product_id, to_location_id, quantity, quantity]
                }
            ];

            await db.runTransaction(operations);

            res.json({ 
                message: 'Move transaction completed successfully',
                transaction_id 
            });

        } catch (error) {
            console.error('Move transaction error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Get transactions
    router.get('/transactions', authenticateToken, async (req, res) => {
        try {
            const { page = 1, limit = 20, type, product_id, start_date, end_date } = req.query;
            const offset = (page - 1) * limit;

            let sql = `
                SELECT 
                    t.*,
                    p.product_code,
                    p.product_name,
                    fl.location_code as from_location_code,
                    fl.location_name as from_location_name,
                    tl.location_code as to_location_code,
                    tl.location_name as to_location_name,
                    u.full_name as user_name
                FROM transactions t
                JOIN products p ON t.product_id = p.id
                LEFT JOIN locations fl ON t.from_location_id = fl.id
                LEFT JOIN locations tl ON t.to_location_id = tl.id
                JOIN users u ON t.user_id = u.id
                WHERE 1=1
            `;
            let params = [];

            if (type) {
                sql += ' AND t.transaction_type = ?';
                params.push(type);
            }

            if (product_id) {
                sql += ' AND t.product_id = ?';
                params.push(product_id);
            }

            if (start_date) {
                sql += ' AND DATE(t.transaction_date) >= ?';
                params.push(start_date);
            }

            if (end_date) {
                sql += ' AND DATE(t.transaction_date) <= ?';
                params.push(end_date);
            }

            sql += ' ORDER BY t.transaction_date DESC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), offset);

            const transactions = await db.all(sql, params);

            // Get total count
            let countSql = 'SELECT COUNT(*) as total FROM transactions t WHERE 1=1';
            let countParams = [];

            if (type) {
                countSql += ' AND t.transaction_type = ?';
                countParams.push(type);
            }

            if (product_id) {
                countSql += ' AND t.product_id = ?';
                countParams.push(product_id);
            }

            if (start_date) {
                countSql += ' AND DATE(t.transaction_date) >= ?';
                countParams.push(start_date);
            }

            if (end_date) {
                countSql += ' AND DATE(t.transaction_date) <= ?';
                countParams.push(end_date);
            }

            const { total } = await db.get(countSql, countParams);

            res.json({
                transactions,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            });

        } catch (error) {
            console.error('Get transactions error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    return router;
};

module.exports = createInventoryRoutes;
