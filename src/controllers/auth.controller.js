const authService = require('../services/auth.service');
const { z } = require('zod');

exports.telegramLogin = async (req, res) => {
  try {
    const { user, token } = await authService.verifyTelegramAuth(req.body);
    res.json({ user, token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.register = async (req, res) => {
  try {
    // Check if request body is empty or only contains empty values
    if (!req.body || Object.keys(req.body).length === 0) {
      console.log('Empty request body detected');
      return res.status(400).json({ 
        error: 'Empty request body',
        message: 'No registration data provided'
      });
    }

    // console.log('req.files', req.files);

    const { user, token } = await authService.register(req.body, req.files);
    res.status(201).json({ user, token });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.message === 'User with this Telegram ID already exists') {
      res.status(409).json({ error: error.message });
    } else if (error instanceof z.ZodError) {
      res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors 
      });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

exports.login = async (req, res) => {
  try {
    const { telegramId } = req.body;
    const { user, token } = await authService.login(telegramId);
    res.json({ user, token });
  } catch (error) {
    if (error.message === 'User not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};

exports.validateToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const user = await authService.validateUser(token);
    res.json({ user });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

exports.verifyToken = async (req, res) => {
  try {
    res.status(200).json({
      status: 'success',
      data: {
        user: req.user
      }
    });
  } catch (error) {
    res.status(401).json({
      status: 'error',
      message: 'Invalid token'
    });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];
    const { newToken, user } = await authService.refreshToken(token);

    res.status(200).json({
      status: 'success',
      data: {
        token: newToken,
        user
      }
    });
  } catch (error) {
    res.status(401).json({
      status: 'error',
      message: error.message || 'Invalid token'
    });
  }
};

exports.logout = async (req, res) => {
  try {
    // In a real implementation, you might want to:
    // 1. Add the token to a blacklist
    // 2. Update user's lastActive timestamp
    // 3. Clear any active sessions

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error during logout'
    });
  }
};

exports.adminLogin = async (req, res) => {
  try {
    console.log('Admin login request received');
    const { username, password } = req.body;
    
    if (!username || !password) {
      console.log('Missing username or password');
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const { admin, token } = await authService.adminLogin(username, password);
    console.log('Admin login successful, sending response');
    res.json({ admin, token });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(401).json({ error: error.message });
  }
};

exports.adminLogout = async (req, res) => {
  try {
    console.log('Admin logout request received');
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.log('No token provided for logout');
      return res.status(401).json({ error: 'No token provided' });
    }

    await authService.adminLogout(token);
    console.log('Admin logout successful');
    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Admin logout error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error during logout'
    });
  }
};

exports.adminRefresh = async (req, res) => {
  try {
    console.log('Admin refresh token request received');
    const { token } = req.body;
    
    if (!token) {
      console.log('No token provided for refresh');
      return res.status(401).json({ error: 'Token is required' });
    }

    const { newToken, admin } = await authService.adminRefresh(token);
    console.log('Admin token refresh successful');
    res.json({ token: newToken, admin });
  } catch (error) {
    console.error('Admin refresh token error:', error);
    res.status(401).json({ error: error.message });
  }
};

exports.adminCreateUser = async (req, res) => {
  try {
    console.log('Admin create user request received');
    const { username, password } = req.body;
    
    if (!username || !password) {
      console.log('Missing username or password for admin creation');
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const { admin, token } = await authService.adminCreateUser(username, password);
    console.log('Admin user created successfully');
    res.status(201).json({ admin, token });
  } catch (error) {
    console.error('Admin create user error:', error);
    if (error.message.includes('already exists')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};