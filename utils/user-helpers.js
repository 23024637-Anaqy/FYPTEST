const { User } = require('../models');

/**
 * Helper function to resolve user ID for MongoDB operations
 * Handles both ObjectId format and legacy numeric IDs
 */
async function resolveUserId(userFromToken) {
    if (!userFromToken || !userFromToken.id) {
        return null;
    }

    // If it's already a valid ObjectId, return it
    if (typeof userFromToken.id === 'string' && userFromToken.id.match(/^[0-9a-fA-F]{24}$/)) {
        return userFromToken.id;
    }

    // If it's a numeric ID or invalid ObjectId, find by username
    if (userFromToken.username) {
        try {
            const user = await User.findOne({ username: userFromToken.username });
            return user ? user._id : null;
        } catch (error) {
            console.error('Error resolving user ID:', error);
            return null;
        }
    }

    return null;
}

/**
 * Helper function to validate ObjectId format
 */
function isValidObjectId(id) {
    return typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/);
}

/**
 * Helper function to safely find user by ID or username
 */
async function findUserSafely(userInfo) {
    if (!userInfo) return null;

    try {
        // Try by ObjectId first
        if (isValidObjectId(userInfo.id)) {
            return await User.findById(userInfo.id);
        }

        // Fallback to username
        if (userInfo.username) {
            return await User.findOne({ username: userInfo.username });
        }

        return null;
    } catch (error) {
        console.error('Error finding user safely:', error);
        return null;
    }
}

module.exports = {
    resolveUserId,
    isValidObjectId,
    findUserSafely
};
