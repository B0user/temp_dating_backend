const adminService = require('../services/admin.service');

const isAdmin = async (req, res, next) => {
  try {
    console.log('isAdmin middleware');
    console.log('Admin token:', req.headers.authorization);
    const token = req.headers.authorization.split(' ')[1];
    const decoded = await adminService.verifyToken(token);
    console.log('Decoded token:', decoded);
    if (!decoded) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin privileges required.' 
      });
    }
    next();
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Error checking admin privileges' 
    });
  }
};

module.exports = { isAdmin }; 