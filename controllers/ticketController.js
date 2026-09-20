const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ==========================================
// 🕒 دالة حساب أوقات الـ SLA (إجازة الخميس والجمعة، ساعات العمل 8 ص - 6 م)
// ==========================================
const calculateSLADueDate = (startDate, slaHours) => {
    let current = new Date(startDate);
    let remainingHours = slaHours;

    while (remainingHours > 0) {
        let day = current.getDay(); 
        
        if (day === 4 || day === 5) {
            current.setDate(current.getDate() + (day === 4 ? 2 : 1));
            current.setHours(8, 0, 0, 0);
            continue;
        }

        if (current.getHours() < 8) {
            current.setHours(8, 0, 0, 0);
        }

        if (current.getHours() >= 18) {
            current.setDate(current.getDate() + 1);
            current.setHours(8, 0, 0, 0);
            continue;
        }

        let endOfDay = new Date(current);
        endOfDay.setHours(18, 0, 0, 0);
        
        let msLeftToday = endOfDay.getTime() - current.getTime();
        let hoursLeftToday = msLeftToday / (1000 * 60 * 60);

        if (remainingHours <= hoursLeftToday) {
            current.setTime(current.getTime() + (remainingHours * 60 * 60 * 1000));
            remainingHours = 0;
        } else {
            remainingHours -= hoursLeftToday;
            current.setDate(current.getDate() + 1);
            current.setHours(8, 0, 0, 0);
        }
    }
    return current;
};

// 1. Create a new ticket
const createTicket = async (req, res, next) => {
    try {
        const { 
            title, description, category_id, location_id, 
            issue_type, urgency, impact, priority 
        } = req.body;
        
        const floor = Math.floor(location_id / 100); 
        const room = location_id % 100; 

        if (floor < 1 || floor > 4 || room < 1 || room > 20) {
            return res.status(400).json({ 
                success: false, 
                message: "رقم المكان غير صحيح" 
            });
        }
        
        let slaPolicy = await prisma.sLA_POLICY.findFirst({
            where: { priority: priority }
        });

        if (!slaPolicy) {
            const fallbackSLAs = {
                'Critical': { response_sla_hours: 1, resolution_sla_hours: 4 },
                'High': { response_sla_hours: 2, resolution_sla_hours: 8 },
                'Medium': { response_sla_hours: 4, resolution_sla_hours: 24 },
                'Low': { response_sla_hours: 8, resolution_sla_hours: 48 }
            };
            slaPolicy = fallbackSLAs[priority] || fallbackSLAs['Medium'];
        }

        const now = new Date();
        const response_sla_due_at = calculateSLADueDate(now, slaPolicy.response_sla_hours);
        const resolution_sla_due_at = calculateSLADueDate(now, slaPolicy.resolution_sla_hours);

        const reporter_id = req.user.id; 
        
        const newTicket = await prisma.tICKET.create({
            data: {
                title,
                description,
                category_id,
                location_id,
                issue_type,
                urgency,
                impact,
                priority,
                reporter_id,
                response_sla_due_at,
                resolution_sla_due_at
            }
        });
        
        res.status(201).json({ success: true, data: newTicket });
    } catch (error) {
        next(error); // 👈 إرسال الخطأ لصائد الأخطاء العام
    }
};

// 2. Get all tickets (Smart View with Pagination)
const getAllTickets = async (req, res, next) => {
    try {
        let filter = {};
        
        // فلترة التيكتات لو اليوزر طالب عادي
        if (req.user.role !== 'MANAGER' && req.user.role !== 'AGENT' && req.user.role !== 'TECHNICIAN') {
            filter = { where: { reporter_id: req.user.id } };
        }

        // 👈 إعدادات تقسيم الصفحات (Pagination)
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const tickets = await prisma.tICKET.findMany({
            ...filter,
            skip: skip,
            take: limit,
            include: { category: true, location: true }
        });
        
        // حساب إجمالي عدد التيكتات عشان الفرونت إند يعرف عدد الصفحات
        const totalTickets = await prisma.tICKET.count({
            where: filter.where // عشان لو طالب، يعد تيكتاته هو بس
        });

        res.status(200).json({ 
            success: true, 
            results: tickets.length,
            pagination: {
                totalTickets,
                currentPage: page,
                totalPages: Math.ceil(totalTickets / limit)
            },
            data: tickets 
        });
    } catch (error) {
        next(error); // 👈 إرسال الخطأ لصائد الأخطاء العام
    }
};

// 3. Update ticket (With Smart Timestamping)
const updateTicket = async (req, res, next) => {
    try {
        const { id } = req.params; 
        const { status } = req.body; 

        const existingTicket = await prisma.tICKET.findUnique({
            where: { ticket_id: id }
        });

        if (!existingTicket) {
            return res.status(404).json({ success: false, message: "Ticket not found" });
        }

        const updateData = { status };
        const now = new Date();

        if (status === 'In Progress' && !existingTicket.first_response_at) {
            updateData.first_response_at = now;
        }
        
        if (status === 'Resolved' && !existingTicket.resolved_at) {
            updateData.resolved_at = now;
        }

        if (status === 'Closed' && !existingTicket.closed_at) {
            updateData.closed_at = now;
        }

        const updatedTicket = await prisma.tICKET.update({
            where: { ticket_id: id }, 
            data: updateData
        });

        res.status(200).json({ success: true, data: updatedTicket });
    } catch (error) {
        next(error); // 👈 إرسال الخطأ لصائد الأخطاء العام
    }
};

// 4. Delete ticket
const deleteTicket = async (req, res, next) => {
    try {
        const { id } = req.params;

        await prisma.tICKET.delete({
            where: { ticket_id: id }
        });

        res.status(200).json({ success: true, message: "Ticket deleted successfully" });
    } catch (error) {
        next(error); // 👈 إرسال الخطأ لصائد الأخطاء العام
    }
};

// 5. AI & DATA TEAM ENDPOINT
const getAnalyticsData = async (req, res, next) => {
    try {
        const tickets = await prisma.tICKET.findMany({
            include: {
                category: true,
                location: true,
                sla_policy: true,
                prediction: true,
                history: true,
                assignments: true,
                feedback: true
            }
        });
        res.status(200).json({ success: true, count: tickets.length, data: tickets });
    } catch (error) {
        next(error); // 👈 إرسال الخطأ لصائد الأخطاء العام
    }
};

module.exports = {
    createTicket,
    getAllTickets,
    updateTicket,
    deleteTicket,
    getAnalyticsData
};