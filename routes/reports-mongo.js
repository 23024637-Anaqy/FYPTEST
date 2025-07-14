const express = require('express');
const { Product, Location, Stock, Transaction, StocktakeSession, AuditLog } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');

const createReportsRoutes = () => {
    const router = express.Router();

    // Stock levels report
    router.get('/stock-levels', authenticateToken, async (req, res) => {
        try {
            const { location_id, category, low_stock_only, format } = req.query;

            // Build aggregation pipeline
            let pipeline = [
                {
                    $lookup: {
                        from: 'products',
                        localField: 'product_id',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $lookup: {
                        from: 'locations',
                        localField: 'location_id',
                        foreignField: '_id',
                        as: 'location'
                    }
                },
                { $unwind: '$product' },
                { $unwind: '$location' },
                {
                    $match: {
                        'product.is_active': true,
                        'location.is_active': true
                    }
                }
            ];

            // Add filters
            if (location_id) {
                pipeline.push({
                    $match: { location_id: location_id }
                });
            }

            if (category) {
                pipeline.push({
                    $match: { 'product.category': category }
                });
            }

            if (low_stock_only === 'true') {
                pipeline.push({
                    $match: {
                        $expr: { $lt: ['$quantity', '$product.min_level'] }
                    }
                });
            }

            // Add final projection
            pipeline.push({
                $project: {
                    product_code: '$product.code',
                    product_name: '$product.name',
                    product_category: '$product.category',
                    location_code: '$location.code',
                    location_name: '$location.name',
                    current_quantity: '$quantity',
                    min_level: '$product.min_level',
                    max_level: '$product.max_level',
                    last_updated: '$last_updated',
                    status: {
                        $cond: {
                            if: { $eq: ['$quantity', 0] },
                            then: 'OUT_OF_STOCK',
                            else: {
                                $cond: {
                                    if: { $lt: ['$quantity', '$product.min_level'] },
                                    then: 'LOW_STOCK',
                                    else: {
                                        $cond: {
                                            if: { $gt: ['$quantity', '$product.max_level'] },
                                            then: 'OVERSTOCK',
                                            else: 'NORMAL'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            // Sort by product code
            pipeline.push({
                $sort: { product_code: 1 }
            });

            const stockLevels = await Stock.aggregate(pipeline);

            // Calculate summary statistics
            const summary = {
                total_products: stockLevels.length,
                out_of_stock: stockLevels.filter(item => item.status === 'OUT_OF_STOCK').length,
                low_stock: stockLevels.filter(item => item.status === 'LOW_STOCK').length,
                normal_stock: stockLevels.filter(item => item.status === 'NORMAL').length,
                overstock: stockLevels.filter(item => item.status === 'OVERSTOCK').length,
                total_value: stockLevels.reduce((sum, item) => sum + (item.current_quantity || 0), 0)
            };

            res.json({
                report_type: 'stock_levels',
                generated_at: new Date(),
                filters: { location_id, category, low_stock_only },
                summary,
                data: stockLevels
            });

        } catch (error) {
            console.error('Stock levels report error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Transaction summary report
    router.get('/transactions', authenticateToken, async (req, res) => {
        try {
            const { 
                start_date, 
                end_date, 
                type, 
                location_id, 
                product_id, 
                user_id,
                group_by = 'day'
            } = req.query;

            // Build date filter
            let dateFilter = {};
            if (start_date || end_date) {
                dateFilter.created_at = {};
                if (start_date) dateFilter.created_at.$gte = new Date(start_date);
                if (end_date) dateFilter.created_at.$lte = new Date(end_date);
            }

            // Build other filters
            let additionalFilters = {};
            if (type) additionalFilters.type = type;
            if (location_id) additionalFilters.location_id = location_id;
            if (product_id) additionalFilters.product_id = product_id;
            if (user_id) additionalFilters.created_by = user_id;

            // Combine filters
            const matchFilter = { ...dateFilter, ...additionalFilters };

            // Build aggregation pipeline
            let pipeline = [
                { $match: matchFilter },
                {
                    $lookup: {
                        from: 'products',
                        localField: 'product_id',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $lookup: {
                        from: 'locations',
                        localField: 'location_id',
                        foreignField: '_id',
                        as: 'location'
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'created_by',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                { $unwind: '$product' },
                { $unwind: '$location' },
                { $unwind: '$user' }
            ];

            // Group by specified period
            let groupBy;
            switch (group_by) {
                case 'hour':
                    groupBy = {
                        year: { $year: '$created_at' },
                        month: { $month: '$created_at' },
                        day: { $dayOfMonth: '$created_at' },
                        hour: { $hour: '$created_at' }
                    };
                    break;
                case 'month':
                    groupBy = {
                        year: { $year: '$created_at' },
                        month: { $month: '$created_at' }
                    };
                    break;
                default: // day
                    groupBy = {
                        year: { $year: '$created_at' },
                        month: { $month: '$created_at' },
                        day: { $dayOfMonth: '$created_at' }
                    };
            }

            pipeline.push({
                $group: {
                    _id: {
                        period: groupBy,
                        type: '$type'
                    },
                    transaction_count: { $sum: 1 },
                    total_quantity: { $sum: '$quantity' },
                    transactions: {
                        $push: {
                            id: '$_id',
                            product_code: '$product.code',
                            product_name: '$product.name',
                            location_code: '$location.code',
                            location_name: '$location.name',
                            quantity: '$quantity',
                            reference_number: '$reference_number',
                            user_name: '$user.full_name',
                            created_at: '$created_at'
                        }
                    }
                }
            });

            // Sort by period
            pipeline.push({
                $sort: {
                    '_id.period.year': 1,
                    '_id.period.month': 1,
                    '_id.period.day': 1,
                    '_id.period.hour': 1
                }
            });

            const transactionSummary = await Transaction.aggregate(pipeline);

            // Get overall statistics
            const overallStats = await Transaction.aggregate([
                { $match: matchFilter },
                {
                    $group: {
                        _id: '$type',
                        count: { $sum: 1 },
                        total_quantity: { $sum: '$quantity' }
                    }
                }
            ]);

            res.json({
                report_type: 'transaction_summary',
                generated_at: new Date(),
                filters: { start_date, end_date, type, location_id, product_id, user_id, group_by },
                overall_statistics: overallStats,
                summary_by_period: transactionSummary
            });

        } catch (error) {
            console.error('Transaction summary report error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Inbound report
    router.get('/inbound', authenticateToken, async (req, res) => {
        try {
            const { start_date, end_date, location_id, product_id } = req.query;

            let filter = { type: 'INBOUND' };
            
            if (start_date || end_date) {
                filter.created_at = {};
                if (start_date) filter.created_at.$gte = new Date(start_date);
                if (end_date) filter.created_at.$lte = new Date(end_date);
            }
            
            if (location_id) filter.location_id = location_id;
            if (product_id) filter.product_id = product_id;

            const inboundTransactions = await Transaction.find(filter)
                .populate('product_id', 'code name category')
                .populate('location_id', 'code name')
                .populate('created_by', 'username full_name')
                .sort({ created_at: -1 });

            // Calculate summary
            const summary = {
                total_transactions: inboundTransactions.length,
                total_quantity: inboundTransactions.reduce((sum, t) => sum + t.quantity, 0),
                unique_products: new Set(inboundTransactions.map(t => t.product_id._id.toString())).size,
                unique_locations: new Set(inboundTransactions.map(t => t.location_id._id.toString())).size
            };

            res.json({
                report_type: 'inbound',
                generated_at: new Date(),
                filters: { start_date, end_date, location_id, product_id },
                summary,
                transactions: inboundTransactions
            });

        } catch (error) {
            console.error('Inbound report error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Outbound report
    router.get('/outbound', authenticateToken, async (req, res) => {
        try {
            const { start_date, end_date, location_id, product_id } = req.query;

            let filter = { type: 'OUTBOUND' };
            
            if (start_date || end_date) {
                filter.created_at = {};
                if (start_date) filter.created_at.$gte = new Date(start_date);
                if (end_date) filter.created_at.$lte = new Date(end_date);
            }
            
            if (location_id) filter.location_id = location_id;
            if (product_id) filter.product_id = product_id;

            const outboundTransactions = await Transaction.find(filter)
                .populate('product_id', 'code name category')
                .populate('location_id', 'code name')
                .populate('created_by', 'username full_name')
                .sort({ created_at: -1 });

            // Calculate summary
            const summary = {
                total_transactions: outboundTransactions.length,
                total_quantity: outboundTransactions.reduce((sum, t) => sum + t.quantity, 0),
                unique_products: new Set(outboundTransactions.map(t => t.product_id._id.toString())).size,
                unique_locations: new Set(outboundTransactions.map(t => t.location_id._id.toString())).size
            };

            res.json({
                report_type: 'outbound',
                generated_at: new Date(),
                filters: { start_date, end_date, location_id, product_id },
                summary,
                transactions: outboundTransactions
            });

        } catch (error) {
            console.error('Outbound report error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // User activity report
    router.get('/user-activity', authenticateToken, requireRole(['admin', 'supervisor']), async (req, res) => {
        try {
            const { start_date, end_date, user_id, action } = req.query;

            let filter = {};
            
            if (start_date || end_date) {
                filter.created_at = {};
                if (start_date) filter.created_at.$gte = new Date(start_date);
                if (end_date) filter.created_at.$lte = new Date(end_date);
            }
            
            if (user_id) filter.user_id = user_id;
            if (action) filter.action = action;

            const activities = await AuditLog.find(filter)
                .populate('user_id', 'username full_name role')
                .sort({ created_at: -1 })
                .limit(1000); // Limit to prevent large responses

            // Group by user and action
            const activitySummary = activities.reduce((acc, activity) => {
                const userId = activity.user_id._id.toString();
                const userName = activity.user_id.full_name;
                const action = activity.action;

                if (!acc[userId]) {
                    acc[userId] = {
                        user_name: userName,
                        user_role: activity.user_id.role,
                        actions: {},
                        total_activities: 0
                    };
                }

                if (!acc[userId].actions[action]) {
                    acc[userId].actions[action] = 0;
                }

                acc[userId].actions[action]++;
                acc[userId].total_activities++;

                return acc;
            }, {});

            res.json({
                report_type: 'user_activity',
                generated_at: new Date(),
                filters: { start_date, end_date, user_id, action },
                summary: activitySummary,
                detailed_activities: activities.slice(0, 100) // Return first 100 for detailed view
            });

        } catch (error) {
            console.error('User activity report error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Low stock alert report
    router.get('/low-stock', authenticateToken, async (req, res) => {
        try {
            const { location_id, category } = req.query;

            let pipeline = [
                {
                    $lookup: {
                        from: 'products',
                        localField: 'product_id',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $lookup: {
                        from: 'locations',
                        localField: 'location_id',
                        foreignField: '_id',
                        as: 'location'
                    }
                },
                { $unwind: '$product' },
                { $unwind: '$location' },
                {
                    $match: {
                        'product.is_active': true,
                        'location.is_active': true,
                        $expr: { $lt: ['$quantity', '$product.min_level'] }
                    }
                }
            ];

            // Add filters
            if (location_id) {
                pipeline.push({
                    $match: { location_id: location_id }
                });
            }

            if (category) {
                pipeline.push({
                    $match: { 'product.category': category }
                });
            }

            pipeline.push({
                $project: {
                    product_code: '$product.code',
                    product_name: '$product.name',
                    product_category: '$product.category',
                    location_code: '$location.code',
                    location_name: '$location.name',
                    current_quantity: '$quantity',
                    min_level: '$product.min_level',
                    shortage: { $subtract: ['$product.min_level', '$quantity'] },
                    last_updated: '$last_updated'
                }
            });

            pipeline.push({
                $sort: { shortage: -1 }
            });

            const lowStockItems = await Stock.aggregate(pipeline);

            res.json({
                report_type: 'low_stock',
                generated_at: new Date(),
                filters: { location_id, category },
                summary: {
                    total_low_stock_items: lowStockItems.length,
                    total_shortage: lowStockItems.reduce((sum, item) => sum + item.shortage, 0)
                },
                items: lowStockItems
            });

        } catch (error) {
            console.error('Low stock report error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Stocktake variance report
    router.get('/stocktake-variances', authenticateToken, requireRole(['admin', 'supervisor']), async (req, res) => {
        try {
            const { session_id, start_date, end_date } = req.query;

            let sessionFilter = { status: 'COMPLETED' };
            
            if (session_id) {
                sessionFilter._id = session_id;
            }
            
            if (start_date || end_date) {
                sessionFilter.completed_at = {};
                if (start_date) sessionFilter.completed_at.$gte = new Date(start_date);
                if (end_date) sessionFilter.completed_at.$lte = new Date(end_date);
            }

            const sessions = await StocktakeSession.find(sessionFilter)
                .populate('location_id', 'code name')
                .populate('created_by', 'username full_name')
                .populate('completed_by', 'username full_name');

            const results = [];

            for (const session of sessions) {
                const details = await StocktakeDetail.find({ session_id: session._id })
                    .populate('product_id', 'code name')
                    .populate('counted_by', 'username full_name');

                const variances = details
                    .filter(detail => detail.counted_quantity !== null && detail.counted_quantity !== detail.system_quantity)
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
                        counted_at: detail.counted_at
                    }));

                if (variances.length > 0) {
                    results.push({
                        session: {
                            id: session._id,
                            location: session.location_id,
                            description: session.description,
                            created_at: session.created_at,
                            completed_at: session.completed_at,
                            created_by: session.created_by,
                            completed_by: session.completed_by
                        },
                        variances,
                        summary: {
                            total_variances: variances.length,
                            positive_variances: variances.filter(v => v.variance > 0).length,
                            negative_variances: variances.filter(v => v.variance < 0).length,
                            net_variance: variances.reduce((sum, v) => sum + v.variance, 0)
                        }
                    });
                }
            }

            res.json({
                report_type: 'stocktake_variances',
                generated_at: new Date(),
                filters: { session_id, start_date, end_date },
                sessions_with_variances: results
            });

        } catch (error) {
            console.error('Stocktake variances report error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    return router;
};

module.exports = createReportsRoutes;
