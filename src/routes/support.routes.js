const express = require('express');
const router = express.Router();
const supportController = require('../controllers/support.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

// User routes
router.post('/', authMiddleware, supportController.createTicket);
router.get('/my-tickets', authMiddleware, supportController.getUserTickets);
router.get('/my-tickets/:id', authMiddleware, supportController.getTicketById);
router.post('/my-tickets/:id/messages', authMiddleware, supportController.addMessage);

// Admin routes
router.get('/', authMiddleware, (req, res, next) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    next();
}, supportController.getTickets);

router.get('/:id', authMiddleware, (req, res, next) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    next();
}, supportController.getTicketById);

router.post('/:id/messages', authMiddleware, (req, res, next) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    next();
}, supportController.addMessage);

router.patch('/:id/status', authMiddleware, (req, res, next) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    next();
}, supportController.updateTicketStatus);

router.patch('/:id/priority', authMiddleware, (req, res, next) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    next();
}, supportController.updateTicketPriority);

router.delete('/:id', authMiddleware, (req, res, next) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    next();
}, supportController.deleteTicket);

module.exports = router;
