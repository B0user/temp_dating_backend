const supportService = require('../services/support.service');

class SupportController {
    async createTicket(req, res) {
        try {
            const { subject, message } = req.body;
            const userId = req.user._id;

            const ticket = await supportService.createTicket(userId, subject, message);
            res.status(201).json(ticket);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getTickets(req, res) {
        try {
            const { page = 1, limit = 10, status, priority } = req.query;
            const filters = {};

            if (status) filters.status = status;
            if (priority) filters.priority = priority;

            const result = await supportService.getTickets(filters, parseInt(page), parseInt(limit));
            res.json(result);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getTicketById(req, res) {
        try {
            const ticket = await supportService.getTicketById(req.params.id);
            if (!ticket) {
                return res.status(404).json({ message: 'Ticket not found' });
            }
            res.json(ticket);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getUserTickets(req, res) {
        try {
            const { page = 1, limit = 10 } = req.query;
            const userId = req.user._id;

            const result = await supportService.getUserTickets(userId, parseInt(page), parseInt(limit));
            res.json(result);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async addMessage(req, res) {
        try {
            const { content } = req.body;
            const ticketId = req.params.id;
            const userId = req.user?._id;

            const ticket = await supportService.addMessage(ticketId, userId, content);
            res.json(ticket);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async updateTicketStatus(req, res) {
        try {
            const { status } = req.body;
            const ticketId = req.params.id;

            const ticket = await supportService.updateTicketStatus(ticketId, status);
            res.json(ticket);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async updateTicketPriority(req, res) {
        try {
            const { priority } = req.body;
            const ticketId = req.params.id;

            const ticket = await supportService.updateTicketPriority(ticketId, priority);
            res.json(ticket);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async deleteTicket(req, res) {
        try {
            await supportService.deleteTicket(req.params.id);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

module.exports = new SupportController();
