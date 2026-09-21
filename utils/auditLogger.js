const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// دالة جاهزة تستدعيها في أي مكان في المشروع لتسجيل أي حركة مريبة
const logAudit = async ({ action, entity_type, entity_id, user_id, details }) => {
    try {
        await prisma.aUDIT_LOG.create({
            data: {
                action,         // مثال: "UNAUTHORIZED_ACCESS", "INVALID_TRANSITION"
                entity_type,    // مثال: "TICKET", "DASHBOARD"
                entity_id,      // الـ ID بتاع التيكت أو اليوزر
                user_id,        // الشخص اللي عمل الحركة دي
                details         // تفاصيل اللي حصل
            }
        });
    } catch (error) {
        console.error('❌ Audit Log Error:', error.message);
    }
};

module.exports = { logAudit };