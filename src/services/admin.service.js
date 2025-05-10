const Admin = require('../models/admin.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');


class AdminService {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET;
        this.jwtExpiresIn = process.env.JWT_EXPIRES_IN;
    }

    async generateToken(user) {
        if (!this.jwtSecret) {
          console.error('JWT_SECRET is not set in environment variables');
          throw new Error('JWT_SECRET is not configured');
        }
    
        return jwt.sign(
          { userId: user._id },
          this.jwtSecret,
          { expiresIn: this.jwtExpiresIn || '365d' }
        );
    }

    async hashPassword(password) {
        return bcrypt.hash(password, 10);
    }

    async comparePasswords(password, hashedPassword) {
        return bcrypt.compare(password, hashedPassword);
    }


    async login(username, password) {
        console.log('Attempting admin login for:', username);
        const admin = await Admin.findOne({ username });
        if (!admin) {
          console.log('Admin not found:', username);
          throw new Error('Invalid credentials');
        }
    
        const isValidPassword = await this.comparePasswords(password, admin.password);
        if (!isValidPassword) {
          console.log('Invalid password for admin:', username);
          throw new Error('Invalid credentials');
        }
    
        console.log('Admin login successful:', username);
        const token = await this.generateToken(admin);
        console.log('Admin token:', token);
        return { admin, token };
    }

    async logout(token) {
    try {
        console.log('Attempting admin logout');
        // In a real implementation, you might want to:
        // 1. Add the token to a blacklist
        // 2. Update admin's lastActive timestamp
        // 3. Clear any active sessions
        console.log('Admin logout successful');
        return true;
    } catch (error) {
        console.error('Error during admin logout:', error);
        throw error;
    }
    }

    async refresh(token) {
    try {
        console.log('Attempting admin token refresh');
        // Verify the token without checking expiration
        const decoded = jwt.verify(token, this.jwtSecret, { ignoreExpiration: true });
        
        // Find the admin
        const admin = await Admin.findById(decoded.userId);
        if (!admin) {
        console.log('Admin not found during token refresh');
        throw new Error('Admin not found');
        }

        // Generate a new token
        const newToken = this.generateToken(admin);
        console.log('Admin token refresh successful');
        return { newToken, admin };
    } catch (error) {
        console.error('Error during admin token refresh:', error);
        throw new Error('Invalid token');
    }
    }

    async createUser(username, password) {
    try {
        console.log('Attempting to create admin user:', username);
        
        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ username });
        if (existingAdmin) {
        console.log('Admin already exists:', username);
        throw new Error('Admin with this username already exists');
        }

        // Hash the password
        const hashedPassword = await this.hashPassword(password);

        // Create new admin
        const admin = new Admin({ 
        username, 
        password: hashedPassword,
        createdAt: new Date(),
        lastActive: new Date()
        });

        await admin.save();
        console.log('Admin created successfully:', username);
        
        const token = this.generateToken(admin);
        return { admin, token };
    } catch (error) {
        console.error('Error creating admin:', error);
        throw error;
    }
    }

    async verifyToken(token) {
    try {
        const decoded = jwt.verify(token, this.jwtSecret);
        return decoded;
    } catch (error) {
        throw new Error('Invalid token');
    }
    }    
}

module.exports = new AdminService();