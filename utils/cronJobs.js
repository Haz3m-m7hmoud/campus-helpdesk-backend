const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { logAudit } = require('./auditLogger'); // تأكد من مسار ملف auditLogger اللي عملناه

const prisma = new PrismaClient();

const startCronJobs = () => {
    console.log('⏰ Initializing Background Cron Jobs...');

    // ====================================================
    // 1. SLA Breach Escalation (بتشتغل كل ساعة: الدقيقة 0)
    // ====================================================
    cron.schedule('0 * * * *', async () => {
        try {
            const now = new Date();
            
            // هنجيب التيكتات المفتوحة اللي وقت الحل بتاعها خلص ومحدش حلها
            const breachedTickets = await prisma.tICKET.findMany({
                where: {
                    status: { notIn: ['Resolved', 'Closed'] },
                    resolution_sla_due_at: { lt: now },
                    is_escalated: false // نفترض إنك ضفت الحقل ده في الداتابيز، لو لأ ممكن نشيله
                }
            });

            if (breachedTickets.length > 0) {
                console.log(`[Cron] Found ${breachedTickets.length} SLA breached tickets. Escalating...`);
                
                for (const ticket of breachedTickets) {
                    // هنا ممكن نغير حالتها أو نسجل في الـ Audit Log بس
                    await logAudit({
                        action: 'SLA_BREACH_DETECTED',
                        entity_type: 'TICKET',
                        entity_id: ticket.ticket_id,
                        user_id: 'SYSTEM', // لأن السيستم هو اللي عمل كده
                        details: `Ticket SLA breached. Due date was: ${ticket.resolution_sla_due_at}`
                    });

                    // (اختياري) ممكن تعمل update للتيكت عشان تعلم عليها إنها اتصعدت
                    // await prisma.tICKET.update({
                    //     where: { ticket_id: ticket.ticket_id },
                    //     data: { is_escalated: true }
                    // });
                }
            }
        } catch (error) {
            console.error('[Cron] SLA Check Error:', error.message);
        }
    });

    // ====================================================
    // 2. Auto-close Resolved Tickets (بتشتغل كل يوم الساعة 12 بليل)
    // ====================================================
    cron.schedule('0 0 * * *', async () => {
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7); // نرجع 7 أيام ورا

            // هنجيب التيكتات المحلولة اللي اتعملت من أكتر من 7 أيام
            const resolvedTicketsToClose = await prisma.tICKET.findMany({
                where: {
                    status: 'Resolved',
                    resolved_at: { lt: sevenDaysAgo }
                }
            });

            if (resolvedTicketsToClose.length > 0) {
                console.log(`[Cron] Auto-closing ${resolvedTicketsToClose.length} old resolved tickets...`);
                
                for (const ticket of resolvedTicketsToClose) {
                    await prisma.tICKET.update({
                        where: { ticket_id: ticket.ticket_id },
                        data: { 
                            status: 'Closed',
                            closed_at: new Date()
                        }
                    });

                    // نسجل في الهيستوري بتاع التيكت
                    await prisma.tICKET_STATUS_HISTORY.create({
                        data: { 
                            ticket_id: ticket.ticket_id, 
                            old_status: 'Resolved', 
                            new_status: 'Closed', 
                            changed_by: 'SYSTEM' // أو ID حساب وهمي للسيستم
                        }
                    });
                }
            }
        } catch (error) {
            console.error('[Cron] Auto-close Error:', error.message);
        }
    });

    console.log('✅ Cron Jobs scheduled successfully.');
};

module.exports = { startCronJobs };