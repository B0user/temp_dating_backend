const { z } = require('zod');
const { createBot } = require('../services/admin.service');

const botSchema = z.object({
    telegramId: z.string().min(1),
    name: z.string().min(1),
    gender: z.enum(['male', 'female', 'other']),
    wantToFind: z.enum(['male', 'female', 'all']),
    birthDay: z.string().datetime(),
    country: z.string().min(1),
    city: z.string().min(1),
    latitude: z.number(),
    longitude: z.number(),
    purpose: z.string().min(1),
    interests: z.array(z.string()),
    photos: z.array(z.string().url()),
    audioMessage: z.string().url().optional().nullable(),
    isVerified: z.boolean(),
    verification: z.object({
        photo: z.string().nullable(),
        status: z.enum(['pending', 'approved', 'rejected']),
        reviewedBy: z.string().nullable(),
        reviewedAt: z.string().datetime().nullable(),
        reason: z.string().nullable()
    }),
    wallet: z.object({
        balance: z.number(),
        transactions: z.array(z.object({
            type: z.enum(['deposit', 'withdrawal', 'subscription', 'gift']),
            amount: z.number(),
            status: z.enum(['pending', 'completed', 'failed']),
            createdAt: z.string().datetime()
        })),
        subscription: z.object({
            type: z.enum(['free', 'premium']),
            expiresAt: z.string().datetime()
        })
    }),
    preferences: z.object({
        ageRange: z.object({
            min: z.number(),
            max: z.number()
        }),
        distance: z.number(),
        gender: z.enum(['male', 'female', 'other'])
    }),
    lastActive: z.string().datetime(),
    createdAt: z.string().datetime()
});

const createBot = async (req, res) => {
    try {
        // Validate request body against schema
        const validatedData = botSchema.parse(req.body);

        // Create bot
        const bot = await createBot(validatedData);

        res.status(201).json({
            success: true,
            data: bot
        });
    } catch (error) {
        console.error('Error creating bot:', error);
        
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                details: error.errors
            });
        }

        res.status(500).json({
            success: false,
            error: 'Error creating bot'
        });
    }
};

module.exports = {
    createBot
}; 