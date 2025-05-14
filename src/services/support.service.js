const SupportTicket = require('../models/support.model');

class SupportService {
    async createTicket(userId, subject, initialMessage) {
        const ticket = new SupportTicket({
            user: userId,
            subject,
            messages: [{
                sender: userId,
                content: initialMessage,
                isAdmin: false
            }]
        });
        return await ticket.save();
    }

    async getTickets(filters = {}, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const query = SupportTicket.find(filters)
            .populate('user', 'name email')
            .populate('messages.sender', 'name email')
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit);

        const [tickets, total] = await Promise.all([
            query.exec(),
            SupportTicket.countDocuments(filters)
        ]);

        return {
            tickets,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    }

    async getTicketById(ticketId) {
        return await SupportTicket.findById(ticketId)
            .populate('user', 'name email')
            .populate('messages.sender', 'name email');
    }

    async getUserTickets(userId, page = 1, limit = 10) {
        return this.getTickets({ user: userId }, page, limit);
    }

    async addMessage(ticketId, senderId, content, isAdmin = false) {
        const ticket = await SupportTicket.findById(ticketId);
        if (!ticket) {
            throw new Error('Ticket not found');
        }

        ticket.messages.push({
            sender: senderId,
            content,
            isAdmin
        });

        // Update ticket status if it was closed
        if (ticket.status === 'closed') {
            ticket.status = 'open';
        }

        return await ticket.save();
    }

    async updateTicketStatus(ticketId, status) {
        const ticket = await SupportTicket.findById(ticketId);
        if (!ticket) {
            throw new Error('Ticket not found');
        }

        ticket.status = status;
        return await ticket.save();
    }

    async updateTicketPriority(ticketId, priority) {
        const ticket = await SupportTicket.findById(ticketId);
        if (!ticket) {
            throw new Error('Ticket not found');
        }

        ticket.priority = priority;
        return await ticket.save();
    }

    async deleteTicket(ticketId) {
        return await SupportTicket.findByIdAndDelete(ticketId);
    }
}

module.exports = new SupportService();
