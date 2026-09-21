const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ==========================================
// 1. إضافة تعليق جديد (عادي أو ملاحظة داخلية)
// ==========================================
const addComment = async (req, res, next) => {
    try {
        const { id } = req.params; // ده الـ ticket_id
        const { body, is_internal } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;

        if (!body) {
            return res.status(400).json({ success: false, message: "محتوى التعليق مطلوب" });
        }

        // التأكد إن التيكت موجودة
        const ticket = await prisma.tICKET.findUnique({
            where: { ticket_id: id }
        });

        if (!ticket) {
            return res.status(404).json({ success: false, message: "التيكت غير موجودة" });
        }

        // 🚨 حماية الصلاحيات (Access Control) اللي الـ AI طلبها
        if (userRole === 'REPORTER' && ticket.reporter_id !== userId) {
            return res.status(403).json({ success: false, message: 'غير مصرح لك بالتعليق على هذه التيكت (ليست ملكك)' });
        }
        if (userRole === 'TECHNICIAN' && ticket.assignee_id !== userId) {
            return res.status(403).json({ success: false, message: 'غير مصرح لك بالتعليق لأن التيكت غير محولة لك' });
        }

        // الطالب (REPORTER) مينفعش يعمل تعليق داخلي، فهنجبره يكون false
        const isInternalNote = userRole === 'REPORTER' ? false : (is_internal || false);

        // إنشاء التعليق
        const newComment = await prisma.cOMMENT.create({
            data: {
                ticket_id: id,
                author_id: userId,
                body,
                is_internal: isInternalNote
            },
            include: {
                author: { select: { name: true, role: true } }
            }
        });

        res.status(201).json({ success: true, data: newComment });
    } catch (error) {
        next(error);
    }
};

// ==========================================
// 2. جلب تعليقات تيكت معينة (مع إخفاء الداخلي عن الطالب)
// ==========================================
const getTicketComments = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        // التأكد من التيكت أولاً لحماية الصلاحيات
        const ticket = await prisma.tICKET.findUnique({
            where: { ticket_id: id }
        });

        if (!ticket) {
            return res.status(404).json({ success: false, message: "التيكت غير موجودة" });
        }

        // 🚨 حماية الصلاحيات (Access Control)
        if (userRole === 'REPORTER' && ticket.reporter_id !== userId) {
            return res.status(403).json({ success: false, message: 'غير مصرح لك بعرض هذه التيكت' });
        }

        // فلتر: لو اللي بيستعلم ده طالب، هنخفي عنه أي تعليق داخلي
        const filter = { ticket_id: id };
        if (userRole === 'REPORTER') {
            filter.is_internal = false;
        }

        const comments = await prisma.cOMMENT.findMany({
            where: filter,
            include: {
                author: { select: { name: true, role: true } }
            },
            orderBy: { created_at: 'asc' } // ترتيب من القديم للجديد
        });

        res.status(200).json({ success: true, count: comments.length, data: comments });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    addComment,
    getTicketComments
};