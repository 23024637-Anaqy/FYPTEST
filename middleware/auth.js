const jwt = require('jsonwebtoken');
const config = require('../config/config');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, config.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        next();
    };
};

const logUserAction = (db) => {
    return async (req, res, next) => {
        const originalSend = res.send;
        
        res.send = function(data) {
            // Log successful actions
            if (res.statusCode < 400 && req.user) {
                const logData = {
                    user_id: req.user.id,
                    action: `${req.method} ${req.path}`,
                    ip_address: req.ip,
                    user_agent: req.get('User-Agent'),
                    timestamp: new Date().toISOString()
                };

                // Don't wait for logging to complete
                db.run(
                    'INSERT INTO audit_logs (user_id, action, ip_address, user_agent, timestamp) VALUES (?, ?, ?, ?, ?)',
                    [logData.user_id, logData.action, logData.ip_address, logData.user_agent, logData.timestamp]
                ).catch(err => console.error('Logging error:', err));
            }
            
            originalSend.call(this, data);
        };
        
        next();
    };
};

module.exports = {
    authenticateToken,
    requireRole,
    logUserAction
};
