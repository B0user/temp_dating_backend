const supportService = require('../services/support.service');

module.exports = (io) => {
    const supportNamespace = io.of('/support');

    supportNamespace.on('connection', (socket) => {
        console.log('Client connected to support namespace');

        // Join ticket room
        socket.on('join_ticket', (ticketId) => {
            socket.join(`ticket_${ticketId}`);
            console.log(`Client joined ticket room: ${ticketId}`);
        });

        // Leave ticket room
        socket.on('leave_ticket', (ticketId) => {
            socket.leave(`ticket_${ticketId}`);
            console.log(`Client left ticket room: ${ticketId}`);
        });

        // Handle new message
        socket.on('new_message', async (data) => {
            try {
                const { ticketId, content, userId, isAdmin } = data;
                
                // Add message to database
                const ticket = await supportService.addMessage(ticketId, userId, content, isAdmin);
                
                // Broadcast message to all clients in the ticket room
                supportNamespace.to(`ticket_${ticketId}`).emit('message_received', {
                    ticketId,
                    message: ticket.messages[ticket.messages.length - 1]
                });

                // Notify admins about new message if it's from a user
                if (!isAdmin) {
                    supportNamespace.emit('admin_notification', {
                        type: 'new_message',
                        ticketId,
                        userId
                    });
                }
            } catch (error) {
                console.error('Error handling new message:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        // Handle ticket status update
        socket.on('update_status', async (data) => {
            try {
                const { ticketId, status } = data;
                const ticket = await supportService.updateTicketStatus(ticketId, status);
                
                // Broadcast status update to all clients in the ticket room
                supportNamespace.to(`ticket_${ticketId}`).emit('status_updated', {
                    ticketId,
                    status
                });
            } catch (error) {
                console.error('Error updating ticket status:', error);
                socket.emit('error', { message: 'Failed to update status' });
            }
        });

        // Handle ticket priority update
        socket.on('update_priority', async (data) => {
            try {
                const { ticketId, priority } = data;
                const ticket = await supportService.updateTicketPriority(ticketId, priority);
                
                // Broadcast priority update to all clients in the ticket room
                supportNamespace.to(`ticket_${ticketId}`).emit('priority_updated', {
                    ticketId,
                    priority
                });
            } catch (error) {
                console.error('Error updating ticket priority:', error);
                socket.emit('error', { message: 'Failed to update priority' });
            }
        });

        // Handle ticket creation
        socket.on('ticket_created', async (data) => {
            try {
                const { userId, subject, message } = data;
                const ticket = await supportService.createTicket(userId, subject, message);
                
                // Notify admins about new ticket
                supportNamespace.emit('admin_notification', {
                    type: 'new_ticket',
                    ticketId: ticket._id,
                    userId
                });
            } catch (error) {
                console.error('Error creating ticket:', error);
                socket.emit('error', { message: 'Failed to create ticket' });
            }
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log('Client disconnected from support namespace');
        });
    });

    return supportNamespace;
};
