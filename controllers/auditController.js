const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ==========================================
// جلب سجلات النظام (مخصصة للمدير والمراجع فقط)
// ==========================================
const getAuditLogs = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const logs = await prisma.aUDIT_LOG.findMany({
            skip: skip,
            take: limit,
            orderBy: { created_at: 'desc' }, // الأحدث أولاً
            include: { 
                user: { select: { name: true, role: true, email: true } } 
            }
        });

        const totalLogs = await prisma.aUDIT_LOG.count();

        res.status(200).json({ 
            success: true, 
            pagination: { totalLogs, currentPage: page, totalPages: Math.ceil(totalLogs / limit) },
            data: logs 
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getAuditLogs };