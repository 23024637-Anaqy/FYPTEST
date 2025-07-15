const express = require('express');
const { StocktakeSession, StocktakeDetail, Product, Location, Stock, AuditLog } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');

console.log('Stocktake routes module loaded. Models available:', {
    StocktakeSession: !!StocktakeSession,
    StocktakeDetail: !!StocktakeDetail,
    Product: !!Product,
    Location: !!Location,
    Stock: !!Stock,
    AuditLog: !!AuditLog
});

const createStocktakeRoutes = () => {
    const router = express.Router();
    console.log('Creating stocktake router...');

    // Get all stocktake sessions
    router.get('/sessions', authenticateToken, requireRole('admin', 'supervisor'), async (req, res) => {
        try {
            // Enhanced debug: Log detailed information
            console.log('=== STOCKTAKE SESSIONS REQUEST ===');
            console.log('Request headers:', req.headers);
            console.log('Auth header:', req.headers.authorization);
            console.log('User from JWT:', JSON.stringify(req.user, null, 2));
            console.log('User role:', req.user?.role);
            console.log('Required roles: admin, supervisor');
            console.log('Role check result:', ['admin', 'supervisor'].includes(req.user?.role));
            console.log('=================================');
            
            const { status, location_id } = req.query;

            let filter = {};
            if (status) filter.status = status;
            if (location_id) filter.location_id = location_id;

            const sessions = await StocktakeSession.find(filter)
                .populate('location_id', 'code name')
                .populate('created_by', 'username full_name')
                .sort({ created_at: -1 });

            res.json(sessions);
        } catch (error) {
            console.error('Get stocktake sessions error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Create new stocktake session
    router.post('/sessions', authenticateToken, requireRole('admin', 'supervisor'), async (req, res) => {
        try {
            const { location_id, description } = req.body;

            if (!location_id) {
                return res.status(400).json({ error: 'Location is required' });
            }

            // Verify location exists
            const location = await Location.findById(location_id);
            if (!location) {
                return res.status(404).json({ error: 'Location not found' });
            }

            // Check if there's already an active session for this location
            const activeSession = await StocktakeSession.findOne({
                location_id,
                status: 'ACTIVE'
            });

            if (activeSession) {
                return res.status(409).json({ error: 'There is already an active stocktake session for this location' });
            }

            // Create new session
            const session = new StocktakeSession({
                location_id,
                description,
                status: 'ACTIVE',
                created_by: req.user.id
            });

            await session.save();

            // Get all products that currently have stock in this location
            const currentStock = await Stock.find({ location_id })
                .populate('product_id', 'code name');

            // Create stocktake details for each product
            const stocktakeDetails = currentStock.map(stock => ({
                session_id: session._id,
                product_id: stock.product_id._id,
                system_quantity: stock.quantity,
                counted_quantity: null
            }));

            if (stocktakeDetails.length > 0) {
                await StocktakeDetail.insertMany(stocktakeDetails);
            }

            // Log audit
            const auditLog = new AuditLog({
                user_id: req.user.id,
                action: 'CREATE_STOCKTAKE_SESSION',
                details: JSON.stringify({ session_id: session._id, location_id }),
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });
            await auditLog.save();

            const populatedSession = await StocktakeSession.findById(session._id)
                .populate('location_id', 'code name')
                .populate('created_by', 'username full_name');

            res.status(201).json({
                message: 'Stocktake session created successfully',
                session: populatedSession,
                products_to_count: stocktakeDetails.length
            });

        } catch (error) {
            console.error('Create stocktake session error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Get stocktake session details
    router.get('/sessions/:id', authenticateToken, requireRole('admin', 'supervisor'), async (req, res) => {
        try {
            const { id } = req.params;

            const session = await StocktakeSession.findById(id)
                .populate('location_id', 'code name')
                .populate('created_by', 'username full_name');

            if (!session) {
                return res.status(404).json({ error: 'Stocktake session not found' });
            }

            const details = await StocktakeDetail.find({ session_id: id })
                .populate('product_id', 'code name')
                .sort({ 'product_id.code': 1 });

            res.json({
                session,
                details
            });

        } catch (error) {
            console.error('Get stocktake session details error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Update stocktake count
    router.put('/sessions/:sessionId/products/:productId', authenticateToken, async (req, res) => {
        try {
            const { sessionId, productId } = req.params;
            const { counted_quantity, notes } = req.body;

            if (counted_quantity === undefined || counted_quantity < 0) {
                return res.status(400).json({ error: 'Valid counted quantity is required' });
            }

            // Verify session exists and is active
            const session = await StocktakeSession.findById(sessionId);
            if (!session) {
                return res.status(404).json({ error: 'Stocktake session not found' });
            }

            if (session.status !== 'ACTIVE') {
                return res.status(400).json({ error: 'Stocktake session is not active' });
            }

            // Update stocktake detail
            const detail = await StocktakeDetail.findOneAndUpdate(
                { session_id: sessionId, product_id: productId },
                { 
                    counted_quantity: parseInt(counted_quantity),
                    notes,
                    counted_by: req.user.id,
                    counted_at: new Date()
                },
                { new: true }
            ).populate('product_id', 'code name');

            if (!detail) {
                return res.status(404).json({ error: 'Product not found in this stocktake session' });
            }

            // Calculate variance
            const variance = detail.counted_quantity - detail.system_quantity;

            // Log audit
            const auditLog = new AuditLog({
                user_id: req.user.id,
                action: 'UPDATE_STOCKTAKE_COUNT',
                details: JSON.stringify({ 
                    session_id: sessionId, 
                    product_id: productId, 
                    counted_quantity,
                    variance
                }),
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });
            await auditLog.save();

            res.json({
                message: 'Count updated successfully',
                detail: {
                    ...detail.toObject(),
                    variance
                }
            });

        } catch (error) {
            console.error('Update stocktake count error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Complete stocktake session
    router.post('/sessions/:id/complete', authenticateToken, requireRole('admin', 'supervisor'), async (req, res) => {
        try {
            const { id } = req.params;
            const { apply_adjustments = false } = req.body;

            // Verify session exists and is active
            const session = await StocktakeSession.findById(id);
            if (!session) {
                return res.status(404).json({ error: 'Stocktake session not found' });
            }

            if (session.status !== 'ACTIVE') {
                return res.status(400).json({ error: 'Stocktake session is not active' });
            }

            // Get all stocktake details
            const details = await StocktakeDetail.find({ session_id: id })
                .populate('product_id', 'code name');

            // Check if all products have been counted
            const uncountedProducts = details.filter(detail => detail.counted_quantity === null);
            if (uncountedProducts.length > 0) {
                return res.status(400).json({ 
                    error: 'Not all products have been counted',
                    uncounted_count: uncountedProducts.length
                });
            }

            // Calculate variances and apply adjustments if requested
            let adjustmentsSummary = [];
            
            if (apply_adjustments) {
                for (const detail of details) {
                    const variance = detail.counted_quantity - detail.system_quantity;
                    
                    if (variance !== 0) {
                        // Update stock level
                        await Stock.findOneAndUpdate(
                            { product_id: detail.product_id._id, location_id: session.location_id },
                            { 
                                quantity: detail.counted_quantity,
                                last_updated: new Date()
                            }
                        );

                        adjustmentsSummary.push({
                            product_code: detail.product_id.code,
                            product_name: detail.product_id.name,
                            system_quantity: detail.system_quantity,
                            counted_quantity: detail.counted_quantity,
                            variance
                        });
                    }
                }
            }

            // Mark session as completed
            session.status = 'COMPLETED';
            session.completed_at = new Date();
            session.completed_by = req.user.id;
            await session.save();

            // Log audit
            const auditLog = new AuditLog({
                user_id: req.user.id,
                action: 'COMPLETE_STOCKTAKE_SESSION',
                details: JSON.stringify({ 
                    session_id: id, 
                    apply_adjustments,
                    adjustments_count: adjustmentsSummary.length
                }),
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });
            await auditLog.save();

            res.json({
                message: 'Stocktake session completed successfully',
                adjustments_applied: apply_adjustments,
                adjustments_summary: adjustmentsSummary
            });

        } catch (error) {
            console.error('Complete stocktake session error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Cancel stocktake session
    router.post('/sessions/:id/cancel', authenticateToken, requireRole('admin', 'supervisor'), async (req, res) => {
        try {
            const { id } = req.params;
            const { reason } = req.body;

            // Verify session exists and is active
            const session = await StocktakeSession.findById(id);
            if (!session) {
                return res.status(404).json({ error: 'Stocktake session not found' });
            }

            if (session.status !== 'ACTIVE') {
                return res.status(400).json({ error: 'Only active stocktake sessions can be cancelled' });
            }

            // Mark session as cancelled
            session.status = 'CANCELLED';
            session.completed_at = new Date();
            session.completed_by = req.user.id;
            if (reason) session.description = `${session.description} - CANCELLED: ${reason}`;
            await session.save();

            // Log audit
            const auditLog = new AuditLog({
                user_id: req.user.id,
                action: 'CANCEL_STOCKTAKE_SESSION',
                details: JSON.stringify({ session_id: id, reason }),
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });
            await auditLog.save();

            res.json({
                message: 'Stocktake session cancelled successfully'
            });

        } catch (error) {
            console.error('Cancel stocktake session error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Get stocktake variances report
    router.get('/sessions/:id/variances', authenticateToken, requireRole('admin', 'supervisor'), async (req, res) => {
        try {
            const { id } = req.params;

            const session = await StocktakeSession.findById(id)
                .populate('location_id', 'code name');

            if (!session) {
                return res.status(404).json({ error: 'Stocktake session not found' });
            }

            const details = await StocktakeDetail.find({ session_id: id })
                .populate('product_id', 'code name')
                .populate('counted_by', 'username full_name');

            const variances = details
                .filter(detail => detail.counted_quantity !== null)
                .map(detail => ({
                    product_code: detail.product_id.code,
                    product_name: detail.product_id.name,
                    system_quantity: detail.system_quantity,
                    counted_quantity: detail.counted_quantity,
                    variance: detail.counted_quantity - detail.system_quantity,
                    variance_percentage: detail.system_quantity > 0 ? 
                        ((detail.counted_quantity - detail.system_quantity) / detail.system_quantity * 100).toFixed(2) : 
                        'N/A',
                    counted_by: detail.counted_by?.full_name || 'Unknown',
                    counted_at: detail.counted_at,
                    notes: detail.notes
                }))
                .filter(item => item.variance !== 0)
                .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));

            res.json({
                session: {
                    id: session._id,
                    location: session.location_id,
                    description: session.description,
                    status: session.status,
                    created_at: session.created_at,
                    completed_at: session.completed_at
                },
                variances,
                summary: {
                    total_products_counted: details.filter(d => d.counted_quantity !== null).length,
                    products_with_variances: variances.length,
                    positive_variances: variances.filter(v => v.variance > 0).length,
                    negative_variances: variances.filter(v => v.variance < 0).length
                }
            });

        } catch (error) {
            console.error('Get stocktake variances error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Debug endpoint to test authentication without role check
    router.get('/debug-auth', authenticateToken, (req, res) => {
        console.log('Debug auth endpoint called');
        console.log('User from JWT:', JSON.stringify(req.user, null, 2));
        res.json({ 
            message: 'Authentication working',
            user: req.user,
            timestamp: new Date().toISOString() 
        });
    });

    // Test endpoint to verify deployment
    router.get('/test', (req, res) => {
        console.log('Stocktake test endpoint called');
        res.json({ 
            message: 'Stocktake routes working', 
            timestamp: new Date().toISOString(),
            deployment: 'updated-with-debug' 
        });
    });

    // Debug endpoint to manually test role checking
    router.get('/debug-role', authenticateToken, (req, res) => {
        console.log('Debug role endpoint called');
        console.log('User role:', req.user?.role);
        console.log('Is admin?', req.user?.role === 'admin');
        console.log('Is supervisor?', req.user?.role === 'supervisor');
        console.log('Role check with includes:', ['admin', 'supervisor'].includes(req.user?.role));
        
        res.json({ 
            message: 'Role check debug',
            userRole: req.user?.role,
            isAdmin: req.user?.role === 'admin',
            isSupervisor: req.user?.role === 'supervisor',
            hasAccess: ['admin', 'supervisor'].includes(req.user?.role),
            timestamp: new Date().toISOString() 
        });
    });

    console.log('Stocktake router created with routes:', router.stack?.length || 'unknown');
    return router;
};

module.exports = createStocktakeRoutes;
