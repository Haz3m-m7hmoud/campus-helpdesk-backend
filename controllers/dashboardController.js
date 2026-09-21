const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ==========================================
// 1. Service Dashboard (أداء الخدمة والـ SLA)
// ==========================================
const getServiceDashboard = async (req, res, next) => {
    try {
        const totalTickets = await prisma.tICKET.count();
        const resolvedTickets = await prisma.tICKET.count({ where: { status: 'Resolved' } });
        
        const now = new Date();
        const slaBreached = await prisma.tICKET.count({
            where: {
                status: { notIn: ['Resolved', 'Closed'] },
                resolution_sla_due_at: { lt: now }
            }
        });

        const reopened = await prisma.tICKET.count({ where: { reopened: true } });

        res.status(200).json({
            success: true,
            data: {
                total_tickets: totalTickets,
                resolved_tickets: resolvedTickets,
                sla_breached: slaBreached,
                reopened_tickets: reopened,
                sla_compliance_rate: totalTickets ? (((totalTickets - slaBreached) / totalTickets) * 100).toFixed(2) + '%' : '100%'
            }
        });
    } catch (error) { next(error); }
};

// ==========================================
// 2. Demand Dashboard (حجم الطلب والضغط)
// ==========================================
const getDemandDashboard = async (req, res, next) => {
    try {
        // الضغط حسب الفئة
        const byCategory = await prisma.tICKET.groupBy({
            by: ['category_id'],
            _count: { ticket_id: true }
        });

        // الضغط حسب الأماكن (عشان نعرف أكتر أماكن بتعطل)
        const byLocation = await prisma.tICKET.groupBy({
            by: ['location_id'],
            _count: { ticket_id: true }
        });

        res.status(200).json({
            success: true,
            data: { category_demand: byCategory, location_demand: byLocation }
        });
    } catch (error) { next(error); }
};

// ==========================================
// 3. Manager Summary (ملخص المدير لضغط الفرق)
// ==========================================
const getManagerSummary = async (req, res, next) => {
    try {
        // ضغط الشغل المفتوح على كل فني
        const workloadByAssignee = await prisma.tICKET.groupBy({
            by: ['assignee_id'],
            where: { assignee_id: { not: null }, status: { in: ['Assigned', 'In_Progress'] } },
            _count: { ticket_id: true }
        });

        res.status(200).json({
            success: true,
            data: { active_workload_by_assignee: workloadByAssignee }
        });
    } catch (error) { next(error); }
};

module.exports = { getServiceDashboard, getDemandDashboard, getManagerSummary };