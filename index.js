require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const path = require('path'); 

// 👈 1. استدعاء ملف الـ Cron Jobs اللي عملناه
const { startCronJobs } = require('./utils/cronJobs'); 

// ==========================================
// 🚨 تأمين تشغيل السيرفر (التأكد من وجود مفتاح التشفير)
// ==========================================
if (!process.env.JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined in .env file");
    process.exit(1); 
}

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// ==========================================
// 📄 SWAGGER DOCUMENTATION (إضافة توثيق السواجر هنا)
// ==========================================
const swaggerDocs = require('./swagger');
swaggerDocs(app); 

// ==========================================
// 🛡️ SECURITY MIDDLEWARES
// ==========================================
app.set('trust proxy', 1);

app.use(helmet());

const corsOptions = {
    origin: true, // تم التعديل هنا ليقبل الاتصال من أي بورت (مثل 5173 الخاص بالفرونت إند)
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}
app.use(cors(corsOptions));

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' }
});
app.use('/api', globalLimiter);

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true, 
    message: { success: false, message: 'Too many login attempts, please try again after 15 minutes.' }
});

// ==========================================
// 🛠️ STANDARD MIDDLEWARES
// ==========================================
app.use(express.json({ limit: '10kb' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use((req, res, next) => {
    req.body = req.body ?? {};
    next();
});

// ==========================================
// 🔗 ROUTES (تم تعديل المسارات لتكون Routes كابيتال)
// ==========================================

const attachmentRoutes = require('./Routes/attachmentRoutes');
app.use('/api/tickets/:id/attachments', attachmentRoutes);

const commentRoutes = require('./Routes/commentRoutes'); 
app.use('/api/tickets/:id/comments', commentRoutes);

const ticketRoutes = require('./Routes/ticketRoutes');
app.use('/api/tickets', ticketRoutes);

const userRoutes = require('./Routes/userRoutes');
app.use('/api/users/login', loginLimiter); 
app.use('/api/users', userRoutes);

const masterRoutes = require('./Routes/masterRoutes');
app.use('/api', masterRoutes);

const dashboardRoutes = require('./Routes/dashboardRoutes');
app.use('/api/dashboard', dashboardRoutes);

const auditRoutes = require('./Routes/auditRoutes');
app.use('/api/audit-logs', auditRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'success', message: 'Secure Helpdesk Server is running!' });
});

// ==========================================
// 🚨 GLOBAL ERROR HANDLER
// ==========================================
app.use((req, res, next) => {
    if (!req.route) {
        return res.status(404).json({
            success: false,
            message: `Can't find ${req.originalUrl} on this server!`
        });
    }
    next();
});

app.use((err, req, res, next) => {
    console.error('Error 💥:', err.message);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
    });
});

// ==========================================
// 🚀 START BACKGROUND JOBS
// ==========================================
// 👈 2. تشغيل الـ Cron Jobs قبل ما السيرفر يقوم
startCronJobs();

// ==========================================
// 🚀 START SERVER
// ==========================================
app.listen(PORT, () => {
    console.log(`Secure server is running on port ${PORT}`);
});