const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, requireRole } = require('../middleware/auth');

const createStocktakeRoutes = (db) => {
    const router = express.Router();

    // Start a new stocktake session
    router.post('/start', authenticateToken, requireRole('supervisor', 'admin'), async (req, res) => {
        try {
            const { location_id, notes } = req.body;

            if (!location_id) {
                return res.status(400).json({ error: 'Location is required' });
            }

            // Check if there's an active stocktake for this location
            const activeSession = await db.get(
                'SELECT id FROM stocktake_sessions WHERE location_id = ? AND status = "active"',
                [location_id]
            );

            if (activeSession) {
                return res.status(400).json({ error: 'There is already an active stocktake for this location' });
            }

            const session_id = uuidv4();

            // Create stocktake session
            await db.run(
                'INSERT INTO stocktake_sessions (session_id, location_id, started_by, notes) VALUES (?, ?, ?, ?)',
                [session_id, location_id, req.user.id, notes]
            );

            // Get current stock for this location
            const stockItems = await db.all(`
                SELECT s.*, p.product_code, p.product_name
                FROM stock s
                JOIN products p ON s.product_id = p.id
                WHERE s.location_id = ? AND p.is_active = 1
            `, [location_id]);

            // Create stocktake detail records
            const operations = stockItems.map(item => ({
                sql: 'INSERT INTO stocktake_details (session_id, product_id, expected_quantity) VALUES (?, ?, ?)',
                params: [session_id, item.product_id, item.current_quantity]
            }));

            if (operations.length > 0) {
                await db.runTransaction(operations);
            }

            res.json({
                message: 'Stocktake session started successfully',
                session_id,
                items_count: stockItems.length
            });

        } catch (error) {
            console.error('Start stocktake error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Get active stocktake sessions
    router.get('/sessions', authenticateToken, requireRole('supervisor', 'admin'), async (req, res) => {
        try {
            const { status = 'active' } = req.query;

            const sessions = await db.all(`
                SELECT 
                    ss.*,
                    l.location_code,
                    l.location_name,
                    sb.full_name as started_by_name,
                    cb.full_name as completed_by_name,
                    COUNT(sd.id) as total_items,
                    COUNT(sd.counted_quantity) as counted_items
                FROM stocktake_sessions ss
                JOIN locations l ON ss.location_id = l.id
                JOIN users sb ON ss.started_by = sb.id
                LEFT JOIN users cb ON ss.completed_by = cb.id
                LEFT JOIN stocktake_details sd ON ss.session_id = sd.session_id
                WHERE ss.status = ?
                GROUP BY ss.id
                ORDER BY ss.start_date DESC
            `, [status]);

            res.json(sessions);

        } catch (error) {
            console.error('Get stocktake sessions error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Get stocktake details
    router.get('/sessions/:session_id/details', authenticateToken, requireRole('supervisor', 'admin'), async (req, res) => {
        try {
            const { session_id } = req.params;

            const details = await db.all(`
                SELECT 
                    sd.*,
                    p.product_code,
                    p.product_name,
                    p.category,
                    cb.full_name as counted_by_name
                FROM stocktake_details sd
                JOIN products p ON sd.product_id = p.id
                LEFT JOIN users cb ON sd.counted_by = cb.id
                WHERE sd.session_id = ?
                ORDER BY p.product_name
            `, [session_id]);

            res.json(details);

        } catch (error) {
            console.error('Get stocktake details error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Update counted quantity
    router.put('/count', authenticateToken, requireRole('supervisor', 'admin'), async (req, res) => {
        try {
            const { session_id, product_id, counted_quantity, notes } = req.body;

            if (!session_id || !product_id || counted_quantity === undefined || counted_quantity < 0) {
                return res.status(400).json({ error: 'Session ID, Product ID, and non-negative counted quantity are required' });
            }

            // Check if session is active
            const session = await db.get(
                'SELECT status FROM stocktake_sessions WHERE session_id = ?',
                [session_id]
            );

            if (!session || session.status !== 'active') {
                return res.status(400).json({ error: 'Stocktake session is not active' });
            }

            // Get expected quantity
            const detail = await db.get(
                'SELECT expected_quantity FROM stocktake_details WHERE session_id = ? AND product_id = ?',
                [session_id, product_id]
            );

            if (!detail) {
                return res.status(404).json({ error: 'Product not found in this stocktake session' });
            }

            const variance = counted_quantity - detail.expected_quantity;

            // Update stocktake detail
            await db.run(`
                UPDATE stocktake_details 
                SET counted_quantity = ?, variance = ?, notes = ?, counted_by = ?, counted_at = CURRENT_TIMESTAMP
                WHERE session_id = ? AND product_id = ?
            `, [counted_quantity, variance, notes, req.user.id, session_id, product_id]);

            res.json({
                message: 'Count updated successfully',
                variance
            });

        } catch (error) {
            console.error('Update count error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Complete stocktake session
    router.post('/complete', authenticateToken, requireRole('supervisor', 'admin'), async (req, res) => {
        try {
            const { session_id, apply_adjustments = false } = req.body;

            if (!session_id) {
                return res.status(400).json({ error: 'Session ID is required' });
            }

            // Check if session is active
            const session = await db.get(
                'SELECT * FROM stocktake_sessions WHERE session_id = ? AND status = "active"',
                [session_id]
            );

            if (!session) {
                return res.status(400).json({ error: 'Stocktake session not found or not active' });
            }

            // Get all details
            const details = await db.all(
                'SELECT * FROM stocktake_details WHERE session_id = ? AND counted_quantity IS NOT NULL',
                [session_id]
            );

            const operations = [
                // Update session status
                {
                    sql: 'UPDATE stocktake_sessions SET status = "completed", completed_by = ?, end_date = CURRENT_TIMESTAMP WHERE session_id = ?',
                    params: [req.user.id, session_id]
                }
            ];

            if (apply_adjustments) {
                // Apply stock adjustments for items with variances
                for (const detail of details) {
                    if (detail.variance !== 0) {
                        // Create adjustment transaction
                        const transaction_id = uuidv4();
                        operations.push({
                            sql: 'INSERT INTO transactions (transaction_id, transaction_type, product_id, to_location_id, quantity, reference_number, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                            params: [
                                transaction_id,
                                'adjustment',
                                detail.product_id,
                                session.location_id,
                                detail.variance,
                                `STOCKTAKE-${session_id}`,
                                `Stocktake adjustment: Expected ${detail.expected_quantity}, Counted ${detail.counted_quantity}`,
                                req.user.id
                            ]
                        });

                        // Update stock
                        operations.push({
                            sql: 'UPDATE stock SET current_quantity = ?, last_updated = CURRENT_TIMESTAMP WHERE product_id = ? AND location_id = ?',
                            params: [detail.counted_quantity, detail.product_id, session.location_id]
                        });
                    }
                }
            }

            await db.runTransaction(operations);

            res.json({
                message: 'Stocktake completed successfully',
                adjustments_applied: apply_adjustments,
                items_counted: details.length
            });

        } catch (error) {
            console.error('Complete stocktake error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Cancel stocktake session
    router.post('/cancel', authenticateToken, requireRole('supervisor', 'admin'), async (req, res) => {
        try {
            const { session_id } = req.body;

            if (!session_id) {
                return res.status(400).json({ error: 'Session ID is required' });
            }

            // Update session status
            await db.run(
                'UPDATE stocktake_sessions SET status = "cancelled", end_date = CURRENT_TIMESTAMP WHERE session_id = ? AND status = "active"',
                [session_id]
            );

            res.json({ message: 'Stocktake session cancelled successfully' });

        } catch (error) {
            console.error('Cancel stocktake error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    return router;
};

module.exports = createStocktakeRoutes;
