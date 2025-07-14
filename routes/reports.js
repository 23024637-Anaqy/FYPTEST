const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');

const createReportsRoutes = (db) => {
    const router = express.Router();

    // Inbound report
    router.get('/inbound', authenticateToken, requireRole('supervisor', 'admin'), async (req, res) => {
        try {
            const { start_date, end_date, location_id, product_id } = req.query;

            let sql = `
                SELECT 
                    t.transaction_date,
                    t.quantity,
                    t.reference_number,
                    t.notes,
                    p.product_code,
                    p.product_name,
                    p.category,
                    l.location_code,
                    l.location_name,
                    u.full_name as user_name
                FROM transactions t
                JOIN products p ON t.product_id = p.id
                JOIN locations l ON t.to_location_id = l.id
                JOIN users u ON t.user_id = u.id
                WHERE t.transaction_type = 'inbound'
            `;
            let params = [];

            if (start_date) {
                sql += ' AND DATE(t.transaction_date) >= ?';
                params.push(start_date);
            }

            if (end_date) {
                sql += ' AND DATE(t.transaction_date) <= ?';
                params.push(end_date);
            }

            if (location_id) {
                sql += ' AND t.to_location_id = ?';
                params.push(location_id);
            }

            if (product_id) {
                sql += ' AND t.product_id = ?';
                params.push(product_id);
            }

            sql += ' ORDER BY t.transaction_date DESC';

            const transactions = await db.all(sql, params);

            // Calculate summary
            const summary = transactions.reduce((acc, t) => {
                acc.total_quantity += t.quantity;
                acc.total_transactions++;
                return acc;
            }, { total_quantity: 0, total_transactions: 0 });

            res.json({
                summary,
                transactions
            });

        } catch (error) {
            console.error('Inbound report error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Outbound report
    router.get('/outbound', authenticateToken, requireRole('supervisor', 'admin'), async (req, res) => {
        try {
            const { start_date, end_date, location_id, product_id } = req.query;

            let sql = `
                SELECT 
                    t.transaction_date,
                    t.quantity,
                    t.reference_number,
                    t.notes,
                    p.product_code,
                    p.product_name,
                    p.category,
                    l.location_code,
                    l.location_name,
                    u.full_name as user_name
                FROM transactions t
                JOIN products p ON t.product_id = p.id
                JOIN locations l ON t.from_location_id = l.id
                JOIN users u ON t.user_id = u.id
                WHERE t.transaction_type = 'outbound'
            `;
            let params = [];

            if (start_date) {
                sql += ' AND DATE(t.transaction_date) >= ?';
                params.push(start_date);
            }

            if (end_date) {
                sql += ' AND DATE(t.transaction_date) <= ?';
                params.push(end_date);
            }

            if (location_id) {
                sql += ' AND t.from_location_id = ?';
                params.push(location_id);
            }

            if (product_id) {
                sql += ' AND t.product_id = ?';
                params.push(product_id);
            }

            sql += ' ORDER BY t.transaction_date DESC';

            const transactions = await db.all(sql, params);

            // Calculate summary
            const summary = transactions.reduce((acc, t) => {
                acc.total_quantity += t.quantity;
                acc.total_transactions++;
                return acc;
            }, { total_quantity: 0, total_transactions: 0 });

            res.json({
                summary,
                transactions
            });

        } catch (error) {
            console.error('Outbound report error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Stock levels report
    router.get('/stock-levels', authenticateToken, requireRole('supervisor', 'admin'), async (req, res) => {
        try {
            const { location_id, low_stock_only = false } = req.query;

            let sql = `
                SELECT 
                    s.current_quantity,
                    s.reserved_quantity,
                    s.last_updated,
                    p.product_code,
                    p.product_name,
                    p.category,
                    p.min_stock_level,
                    p.max_stock_level,
                    p.unit_price,
                    l.location_code,
                    l.location_name,
                    (s.current_quantity * p.unit_price) as stock_value
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

            if (low_stock_only === 'true') {
                sql += ' AND s.current_quantity <= p.min_stock_level';
            }

            sql += ' ORDER BY p.product_name, l.location_name';

            const stockLevels = await db.all(sql, params);

            // Calculate summary
            const summary = stockLevels.reduce((acc, item) => {
                acc.total_items++;
                acc.total_value += item.stock_value || 0;
                if (item.current_quantity <= item.min_stock_level) {
                    acc.low_stock_items++;
                }
                if (item.current_quantity === 0) {
                    acc.out_of_stock_items++;
                }
                return acc;
            }, {
                total_items: 0,
                total_value: 0,
                low_stock_items: 0,
                out_of_stock_items: 0
            });

            res.json({
                summary,
                stock_levels: stockLevels
            });

        } catch (error) {
            console.error('Stock levels report error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Transaction summary report
    router.get('/transaction-summary', authenticateToken, requireRole('supervisor', 'admin'), async (req, res) => {
        try {
            const { start_date, end_date, group_by = 'day' } = req.query;

            let dateFormat;
            switch (group_by) {
                case 'month':
                    dateFormat = '%Y-%m';
                    break;
                case 'week':
                    dateFormat = '%Y-%W';
                    break;
                default:
                    dateFormat = '%Y-%m-%d';
            }

            let sql = `
                SELECT 
                    strftime('${dateFormat}', transaction_date) as period,
                    transaction_type,
                    COUNT(*) as transaction_count,
                    SUM(quantity) as total_quantity
                FROM transactions
                WHERE 1=1
            `;
            let params = [];

            if (start_date) {
                sql += ' AND DATE(transaction_date) >= ?';
                params.push(start_date);
            }

            if (end_date) {
                sql += ' AND DATE(transaction_date) <= ?';
                params.push(end_date);
            }

            sql += ' GROUP BY period, transaction_type ORDER BY period DESC, transaction_type';

            const summary = await db.all(sql, params);

            res.json(summary);

        } catch (error) {
            console.error('Transaction summary report error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // User activity report
    router.get('/user-activity', authenticateToken, requireRole('admin'), async (req, res) => {
        try {
            const { start_date, end_date, user_id } = req.query;

            let sql = `
                SELECT 
                    u.username,
                    u.full_name,
                    u.role,
                    COUNT(t.id) as transaction_count,
                    SUM(CASE WHEN t.transaction_type = 'inbound' THEN t.quantity ELSE 0 END) as inbound_quantity,
                    SUM(CASE WHEN t.transaction_type = 'outbound' THEN t.quantity ELSE 0 END) as outbound_quantity,
                    MAX(t.transaction_date) as last_transaction
                FROM users u
                LEFT JOIN transactions t ON u.id = t.user_id
                WHERE u.is_active = 1
            `;
            let params = [];

            if (start_date) {
                sql += ' AND (t.transaction_date IS NULL OR DATE(t.transaction_date) >= ?)';
                params.push(start_date);
            }

            if (end_date) {
                sql += ' AND (t.transaction_date IS NULL OR DATE(t.transaction_date) <= ?)';
                params.push(end_date);
            }

            if (user_id) {
                sql += ' AND u.id = ?';
                params.push(user_id);
            }

            sql += ' GROUP BY u.id ORDER BY transaction_count DESC';

            const userActivity = await db.all(sql, params);

            res.json(userActivity);

        } catch (error) {
            console.error('User activity report error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Product movement report
    router.get('/product-movement', authenticateToken, requireRole('supervisor', 'admin'), async (req, res) => {
        try {
            const { product_id, start_date, end_date } = req.query;

            if (!product_id) {
                return res.status(400).json({ error: 'Product ID is required' });
            }

            let sql = `
                SELECT 
                    t.transaction_date,
                    t.transaction_type,
                    t.quantity,
                    t.reference_number,
                    t.notes,
                    fl.location_code as from_location,
                    fl.location_name as from_location_name,
                    tl.location_code as to_location,
                    tl.location_name as to_location_name,
                    u.full_name as user_name
                FROM transactions t
                LEFT JOIN locations fl ON t.from_location_id = fl.id
                LEFT JOIN locations tl ON t.to_location_id = tl.id
                JOIN users u ON t.user_id = u.id
                WHERE t.product_id = ?
            `;
            let params = [product_id];

            if (start_date) {
                sql += ' AND DATE(t.transaction_date) >= ?';
                params.push(start_date);
            }

            if (end_date) {
                sql += ' AND DATE(t.transaction_date) <= ?';
                params.push(end_date);
            }

            sql += ' ORDER BY t.transaction_date DESC';

            const movements = await db.all(sql, params);

            // Get product info
            const product = await db.get(
                'SELECT product_code, product_name, category FROM products WHERE id = ?',
                [product_id]
            );

            res.json({
                product,
                movements
            });

        } catch (error) {
            console.error('Product movement report error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    return router;
};

module.exports = createReportsRoutes;
