const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  let token;

  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1]?.trim();
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  // Skip verify for obviously invalid token formats to avoid noisy stack traces.
  const tokenParts = token.split('.');
  if (tokenParts.length !== 3) {
    return res.status(401).json({ success: false, message: 'Not authorized, token invalid' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ success: false, message: 'Not authorized as admin' });
  }
};

module.exports = { protect, admin };

