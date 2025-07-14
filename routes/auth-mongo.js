const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { authenticateToken } = require('../middleware/auth');
const { User, AuditLog } = require('../models');

const createAuthRoutes = () => {
    const router = express.Router();

    // Login
    router.post('/login', async (req, res) => {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                return res.status(400).json({ error: 'Username and password are required' });
            }

            // Get user from database
            const user = await User.findOne({ username: username.toLowerCase() });

            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            if (!user.is_active) {
                return res.status(401).json({ error: 'Account is disabled' });
            }

            // Verify password
            const validPassword = await bcrypt.compare(password, user.password_hash);
            if (!validPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Generate JWT token
            const token = jwt.sign(
                { 
                    id: user._id, 
                    username: user.username, 
                    role: user.role,
                    full_name: user.full_name
                },
                config.JWT_SECRET,
                { expiresIn: config.JWT_EXPIRES_IN }
            );

            // Log successful login
            const auditLog = new AuditLog({
                user_id: user._id,
                action: 'LOGIN',
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });
            await auditLog.save();

            res.json({
                token,
                user: {
                    id: user._id,
                    username: user.username,
                    role: user.role,
                    full_name: user.full_name,
                    email: user.email
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Get current user info
    router.get('/me', authenticateToken, async (req, res) => {
        try {
            const user = await User.findById(req.user.id).select('-password_hash');

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json(user);
        } catch (error) {
            console.error('Get user error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Change password
    router.post('/change-password', authenticateToken, async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return res.status(400).json({ error: 'Current password and new password are required' });
            }

            if (newPassword.length < 6) {
                return res.status(400).json({ error: 'New password must be at least 6 characters long' });
            }

            // Get current user
            const user = await User.findById(req.user.id);

            // Verify current password
            const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
            if (!validPassword) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, config.BCRYPT_ROUNDS);

            // Update password
            await User.findByIdAndUpdate(req.user.id, { password_hash: hashedPassword });

            // Log password change
            const auditLog = new AuditLog({
                user_id: req.user.id,
                action: 'PASSWORD_CHANGE',
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });
            await auditLog.save();

            res.json({ message: 'Password changed successfully' });

        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Logout
    router.post('/logout', authenticateToken, async (req, res) => {
        try {
            // Log logout action
            const auditLog = new AuditLog({
                user_id: req.user.id,
                action: 'LOGOUT',
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });
            await auditLog.save();

            res.json({ message: 'Logged out successfully' });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    return router;
};

module.exports = createAuthRoutes;
