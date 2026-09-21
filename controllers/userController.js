const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

// ==========================================
// 1. تسجيل الدخول (Login)
// ==========================================
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'الرجاء إدخال الإيميل وكلمة المرور' });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'بيانات الدخول غير صحيحة' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'بيانات الدخول غير صحيحة' });
        }

        // 👈 الـ Token دلوقتي شايل الـ role والـ team_id زي ما الـ AI طلب
        const token = jwt.sign(
            { id: user.id, role: user.role, team_id: user.team_id },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.status(200).json({
            success: true,
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role, team_id: user.team_id }
        });
    } catch (error) {
        next(error);
    }
};

// ==========================================
// 2. تسجيل طالب جديد (Public Register)
// ==========================================
const register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'هذا الإيميل مسجل مسبقاً' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // 👈 التسجيل العام بيدي صلاحية REPORTER (طالب) إجباري
        await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: 'REPORTER' 
            }
        });

        res.status(201).json({ success: true, message: 'تم إنشاء الحساب بنجاح' });
    } catch (error) {
        next(error);
    }
};

// ==========================================
// 3. جلب بيانات المستخدم الحالي (Get Me)
// ==========================================
const getMe = async (req, res, next) => {
    try {
        // بنجيب بيانات اليوزر من غير الباسورد
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, name: true, email: true, role: true, team_id: true, createdAt: true, team: true }
        });

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};

// ==========================================
// 4. إنشاء حساب موظف (Manager Only Endpoint)
// ==========================================
const createStaff = async (req, res, next) => {
    try {
        const { name, email, password, role, team_id } = req.body;

        // التأكد إن الصلاحية المطلوبة مش طالب (المدير بيعمل فنيين أو أوديتور بس)
        const allowedRoles = ['AGENT', 'TECHNICIAN', 'AUDITOR'];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ success: false, message: 'هذه الصلاحية غير مدعومة لإنشاء موظفين' });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'الإيميل مستخدم بالفعل' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const staff = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                team_id: team_id || null 
            },
            select: { id: true, name: true, email: true, role: true, team_id: true }
        });

        res.status(201).json({ success: true, message: 'تم إنشاء حساب الموظف بنجاح', data: staff });
    } catch (error) {
        next(error);
    }
};

module.exports = { login, register, getMe, createStaff };