const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ==========================================
// 1. رفع مرفق جديد للتيكت
// ==========================================
const uploadAttachment = async (req, res, next) => {
    try {
        const { id: ticket_id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'لم يتم إرفاق أي ملف' });
        }

        // التأكد من التيكت والصلاحيات (Access Control)
        const ticket = await prisma.tICKET.findUnique({ where: { ticket_id } });
        if (!ticket) return res.status(404).json({ success: false, message: 'التيكت غير موجودة' });

        if (userRole === 'REPORTER' && ticket.reporter_id !== userId) {
            return res.status(403).json({ success: false, message: 'غير مصرح لك بإضافة مرفقات لهذه التيكت' });
        }

        // الفني أو المدير يقدر يرفع ملف سري (Private)
        const is_private = userRole !== 'REPORTER' && req.body.is_private === 'true';

        // تخزين البيانات في الداتابيز
        const file_url = `/uploads/attachments/${req.file.filename}`;
        
        const attachment = await prisma.aTTACHMENT.create({
            data: {
                ticket_id,
                uploader_id: userId,
                file_url,
                file_name: req.file.originalname,
                file_type: req.file.mimetype,
                file_size: req.file.size,
                is_private
            }
        });

        res.status(201).json({ success: true, message: "تم رفع الملف بنجاح", data: attachment });
    } catch (error) {
        next(error);
    }
};

// ==========================================
// 2. جلب مرفقات التيكت (مع إخفاء السري عن الطالب)
// ==========================================
const getTicketAttachments = async (req, res, next) => {
    try {
        const { id: ticket_id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        const ticket = await prisma.tICKET.findUnique({ where: { ticket_id } });
        if (!ticket) return res.status(404).json({ success: false, message: 'التيكت غير موجودة' });

        if (userRole === 'REPORTER' && ticket.reporter_id !== userId) {
            return res.status(403).json({ success: false, message: 'غير مصرح لك بعرض هذه التيكت' });
        }

        const filter = { ticket_id };
        if (userRole === 'REPORTER') {
            filter.is_private = false; // الطالب ميشوفش الملفات الخاصة بالفنيين
        }

        const attachments = await prisma.aTTACHMENT.findMany({
            where: filter,
            orderBy: { created_at: 'asc' }
        });

        res.status(200).json({ success: true, count: attachments.length, data: attachments });
    } catch (error) {
        next(error);
    }
};

module.exports = { uploadAttachment, getTicketAttachments };