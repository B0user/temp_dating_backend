const express = require('express');
const router = express.Router();
const supportController = require('../controllers/support.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/admin.middleware');
// User routes
router.post('/', authMiddleware, supportController.createTicket);
router.get('/my-tickets', authMiddleware, supportController.getUserTickets);
router.get('/my-tickets/:id', authMiddleware, supportController.getTicketById);
router.post('/my-tickets/:id/messages', authMiddleware, supportController.addMessage);

// Admin routes
router.get('/', isAdmin, supportController.getTickets);

router.get('/:id', isAdmin, supportController.getTicketById);

router.post('/:id/messages', isAdmin, supportController.addMessage);

router.patch('/:id/status', isAdmin, supportController.updateTicketStatus);

router.patch('/:id/priority', isAdmin, supportController.updateTicketPriority);

router.delete('/:id', isAdmin, supportController.deleteTicket);

module.exports = router;
