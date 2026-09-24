const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

// ==========================================
// 1. تسجيل الدخول (Login & Auto-Register)
// ==========================================
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'الرجاء إدخال الإيميل وكلمة المرور' });
        }

        // 👈 التأكد إن الإيميل جامعي
        if (!email.endsWith('@bua.edu.eg')) {
            return res.status(400).json({ success: false, message: 'يجب استخدام البريد الإلكتروني الجامعي (@bua.edu.eg)' });
        }

        let user = await prisma.user.findUnique({ where: { email } });
        
        if (!user) {
            // 👈 لو المستخدم مش موجود، نكريتله حساب فوراً
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // استخراج الاسم من الإيميل (مثلاً hazem.2023026092 -> hazem)
            const nameFromEmail = email.split('@')[0].replace(/[0-9.]/g, ' ').trim() || 'طالب جديد';

            user = await prisma.user.create({
                data: {
                    name: nameFromEmail,
                    email,
                    password: hashedPassword,
                    role: 'REPORTER' // صلاحية طالب إجبارية
                }
            });
        } else {
            // 👈 لو المستخدم موجود فعلاً، نتأكد من الباسورد
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'بيانات الدخول غير صحيحة' });
            }
        }

        // 👈 الـ Token دلوقتي شايل الـ role والـ team_id
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
// 2. تسجيل طالب جديد (Public Register - يمكن الاستغناء عنه الآن)
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

// ==========================================
// 5. جلب قائمة المستخدمين (لحفظ الفنيين في الـ Dropdown)
// ==========================================
const getUsers = async (req, res, next) => {
    try {
        const { role } = req.query;
        // لو مبعوت role في اللينك، هيفلتر بيه (مثلاً TECHNICIAN)، لو لأ هيجيب كله
        const whereClause = role ? { role: role } : {};
        
        const users = await prisma.user.findMany({
            where: whereClause,
            // 👈 تم حذف include نهائياً واكتفينا بـ select 
            select: { id: true, name: true, email: true, role: true, team: true }
        });
        
        res.status(200).json({ success: true, data: users });
    } catch (error) {
        next(error);
    }
};

// 👈 متنساش تصدر الدالة الجديدة هنا
module.exports = { login, register, getMe, createStaff, getUsers };