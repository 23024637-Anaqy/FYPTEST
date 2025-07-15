const jwt = require('jsonwebtoken');
const config = require('../config/config');

// Debug: Log JWT secret info (without exposing the actual secret)
console.log('Auth middleware loaded. JWT_SECRET configured:', !!config.JWT_SECRET);
console.log('JWT_SECRET length:', config.JWT_SECRET?.length || 0);

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('authenticateToken: checking token for path:', req.path);
    console.log('authenticateToken: auth header:', authHeader ? 'present' : 'missing');
    console.log('authenticateToken: token:', token ? 'present' : 'missing');

    if (!token) {
        console.log('authenticateToken: No token provided');
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, config.JWT_SECRET, (err, user) => {
        if (err) {
            console.log('authenticateToken: JWT verification failed:', err.message);
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        
        console.log('authenticateToken: JWT verified successfully. User:', user);
        req.user = user;
        next();
    });
};

const requireRole = (...roles) => {
    console.log('requireRole middleware called with roles:', roles);
    console.log('roles array length:', roles.length);
    console.log('roles array contents:', JSON.stringify(roles));
    
    return (req, res, next) => {
        console.log('requireRole middleware executing...');
        
        if (!req.user) {
            console.log('requireRole: No user in request');
            return res.status(401).json({ error: 'Authentication required' });
        }

        console.log('requireRole check DETAILED:', {
            userRole: req.user.role,
            userRoleType: typeof req.user.role,
            requiredRoles: roles,
            requiredRolesType: typeof roles,
            requiredRolesLength: roles.length,
            includesCheck: roles.includes(req.user.role),
            isAdmin: req.user.role === 'admin',
            rolesAsString: roles.join(',')
        });

        const hasPermission = roles.includes(req.user.role);
        console.log('Permission check result:', hasPermission);

        if (!hasPermission) {
            console.log(`requireRole: ACCESS DENIED. User role '${req.user.role}' not in allowed roles:`, roles);
            console.log('Exact comparison results:');
            roles.forEach((role, index) => {
                console.log(`  Role ${index}: '${role}' === '${req.user.role}' ? ${role === req.user.role}`);
            });
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        console.log('requireRole: ACCESS GRANTED');
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
