const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// ==========================================
// 🛡️ SECURITY MIDDLEWARES
// ==========================================

// 1. Helmet: Secure HTTP headers and hide Express signature
app.use(helmet());

// 2. Strict CORS: Only allow requests from your specific frontend URL
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
};
app.use(cors(corsOptions));

// 3. Global Rate Limiting: Max 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' }
});
app.use('/api', globalLimiter);

// 4. Login Specific Rate Limiting: Max 5 failed attempts per 15 minutes
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { success: false, message: 'Too many login attempts, please try again after 15 minutes.' }
});

// ==========================================
// 🛠️ STANDARD MIDDLEWARES
// ==========================================
app.use(express.json({ limit: '10kb' }));

// ==========================================
// 🔗 ROUTES
// ==========================================
const ticketRoutes = require('./routes/ticketRoutes');
app.use('/api/tickets', ticketRoutes);

const userRoutes = require('./routes/userRoutes');
app.use('/api/users/login', loginLimiter); 
app.use('/api/users', userRoutes);

// Master Data Routes (Categories & Locations)
const masterRoutes = require('./routes/masterRoutes');
app.use('/api', masterRoutes);

// Health check route
app.get('/api/health', (req, res) => {
    res.json({ status: 'success', message: 'Secure Helpdesk Server is running!' });
});

// ==========================================
// 🚨 GLOBAL ERROR HANDLER
// ==========================================
// التعامل مع أي مسار غير موجود (404)
app.all('*', (req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Can't find ${req.originalUrl} on this server!`
    });
});

// صائد الأخطاء العام (بيمنع السيرفر إنه يقع)
app.use((err, req, res, next) => {
    console.error('Error 💥:', err.message);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
    });
});

// ==========================================
// 🚀 START SERVER
// ==========================================
app.listen(PORT, () => {
    console.log(`Secure server is running on port ${PORT}`);
});