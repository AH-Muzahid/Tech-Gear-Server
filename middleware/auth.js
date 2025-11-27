// Authentication middleware
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const verifyAuth = async (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized: No token provided' });
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Unauthorized: Invalid token' });
        }

        // Verify JWT token with NextAuth secret
        try {
            const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);

            // Verify user still exists in database
            const user = await User.findById(decoded.id || decoded.sub);
            if (!user) {
                return res.status(401).json({ message: 'Unauthorized: User not found' });
            }

            // Attach user info to request
            req.user = {
                id: user._id.toString(),
                email: user.email,
                role: user.role || 'user',
            };

            next();
        } catch (jwtError) {
            // Token is invalid or expired
            return res.status(401).json({ message: 'Unauthorized: Invalid or expired token' });
        }
    } catch (error) {
        logger.error('Auth middleware error:', error);
        res.status(401).json({ message: 'Unauthorized: Authentication failed' });
    }
};

// Check if user has admin role
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized: No user found' });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }

    next();
};

module.exports = { verifyAuth, requireAdmin };

