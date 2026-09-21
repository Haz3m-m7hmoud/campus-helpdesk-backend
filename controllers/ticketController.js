const { PrismaClient } = require('@prisma/client');
const axios = require('axios'); // 👈 ضفنا مكتبة axios عشان نكلم الـ AI Endpoint
const prisma = new PrismaClient();

// ==========================================
// 🕒 1. دوال مساعدة (SLA & Priority)
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

const calculatePriority = (impact, urgency) => {
    const matrix = {
        High: { High: 'Critical', Medium: 'High', Low: 'Medium' },
        Medium: { High: 'High', Medium: 'Medium', Low: 'Low' },
        Low: { High: 'Medium', Medium: 'Low', Low: 'Low' }
    };
    return matrix[impact]?.[urgency] || 'Medium';
};

// ==========================================
// 2. Create a new ticket 
// ==========================================
const createTicket = async (req, res, next) => {
    try {
        const { 
            title, description, category_id, location_id, 
            issue_type, urgency, impact 
        } = req.body;
        
        const locNumber = Number(location_id);
        
        if (isNaN(locNumber) || locNumber < 101 || locNumber > 420) {
            return res.status(400).json({ success: false, message: "رقم المكان غير صحيح. يجب أن يكون بين 101 و 420" });
        }

        const floor = Math.floor(locNumber / 100);
        const room = locNumber % 100;

        if (room < 1 || room > 20) {
            return res.status(400).json({ success: false, message: `رقم الغرفة (${room}) غير صحيح في الدور ${floor}. الغرف من 1 لـ 20 فقط.` });
        }
        
        const calculatedPriority = calculatePriority(impact, urgency);
        const is_emergency = (calculatedPriority === 'Critical');

        let slaPolicy = await prisma.sLA_POLICY.findFirst({
            where: { priority: calculatedPriority }
        });

        if (!slaPolicy) {
            const fallbackSLAs = {
                'Critical': { response_sla_hours: 1, resolution_sla_hours: 4 },
                'High': { response_sla_hours: 2, resolution_sla_hours: 8 },
                'Medium': { response_sla_hours: 4, resolution_sla_hours: 24 },
                'Low': { response_sla_hours: 8, resolution_sla_hours: 48 }
            };
            slaPolicy = fallbackSLAs[calculatedPriority] || fallbackSLAs['Medium'];
        }

        const now = new Date();
        const response_sla_due_at = calculateSLADueDate(now, slaPolicy.response_sla_hours);
        const resolution_sla_due_at = calculateSLADueDate(now, slaPolicy.resolution_sla_hours);

        const reporter_id = req.user.id; 
        
        // 👈 توليد Reference ID أوتوماتيك (مثال: HLP-2026-0001)
        const currentYear = now.getFullYear();
        const ticketCount = await prisma.tICKET.count({
            where: { created_at: { gte: new Date(`${currentYear}-01-01T00:00:00.000Z`) } }
        });
        const reference_id = `HLP-${currentYear}-${String(ticketCount + 1).padStart(4, '0')}`;
        
        const newTicket = await prisma.tICKET.create({
            data: {
                reference_id,
                title,
                description,
                category_id,
                location_id: locNumber,
                issue_type,
                urgency,
                impact,
                priority: calculatedPriority,
                is_emergency,
                reporter_id,
                response_sla_due_at,
                resolution_sla_due_at,
                status: 'New',
                history: {
                    create: { new_status: 'New', changed_by: reporter_id }
                }
            }
        });
        
        res.status(201).json({ success: true, data: newTicket });

        // ==========================================
        // 🤖 AI Integration Background Job
        // ==========================================
        setImmediate(async () => {
            try {
                const openTickets = await prisma.tICKET.findMany({
                    where: { status: { in: ['New', 'Assigned', 'In_Progress', 'Waiting'] } },
                    select: { 
                        ticket_id: true, reference_id: true, title: true, 
                        description: true, status: true, created_at: true, priority: true 
                    }
                });

                // اللينك ده بتاع السيرفر اللي شايل موديل الـ Machine Learning
                const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000/api/ai/analyze';
                
                await axios.post(aiServiceUrl, {
                    new_ticket: newTicket,
                    open_tickets_queue: openTickets
                });
                
                console.log(`[AI Triggered] Sent ticket ${reference_id} and ${openTickets.length} open tickets to AI model.`);
            } catch (err) {
                console.error('[AI Warning] Could not reach AI service (Make sure your Python/ML server is running).', err.message);
            }
        });

    } catch (error) {
        next(error); 
    }
};

// ==========================================
// 3. Get all tickets
// ==========================================
const getAllTickets = async (req, res, next) => {
    try {
        let filter = { where: {} };
        
        if (req.user.role === 'TECHNICIAN') {
            filter.where = { assignee_id: req.user.id }; 
        } 
        else if (req.user.role !== 'MANAGER' && req.user.role !== 'AGENT' && req.user.role !== 'AUDITOR') {
            filter.where = { reporter_id: req.user.id };
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const tickets = await prisma.tICKET.findMany({
            where: filter.where,
            skip: skip,
            take: limit,
            include: { category: true, location: true } 
        });
        
        const totalTickets = await prisma.tICKET.count({ where: filter.where });

        res.status(200).json({ 
            success: true, 
            results: tickets.length,
            pagination: { totalTickets, currentPage: page, totalPages: Math.ceil(totalTickets / limit) },
            data: tickets 
        });
    } catch (error) {
        next(error); 
    }
};

// ==========================================
// 4. Get Ticket By ID (With Internal Notes Security)
// ==========================================
const getTicketById = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // 👈 حماية الكومنتات: لو طالب، هيشوف التعليقات العامة بس
        const includeComments = req.user.role === 'REPORTER' 
            ? { where: { is_internal: false }, include: { author: { select: { name: true, role: true } } } } 
            : { include: { author: { select: { name: true, role: true } } } };

        const ticket = await prisma.tICKET.findUnique({
            where: { ticket_id: id },
            include: { 
                category: true, 
                location: true, 
                history: true, 
                comments: includeComments 
            }
        });

        if (!ticket) {
            return res.status(404).json({ success: false, message: "التيكت غير موجودة" });
        }

        if (req.user.role === 'REPORTER' && ticket.reporter_id !== req.user.id) {
            return res.status(403).json({ success: false, message: "غير مصرح لك بعرض هذه التيكت" });
        }
        if (req.user.role === 'TECHNICIAN' && ticket.assignee_id !== req.user.id) {
            return res.status(403).json({ success: false, message: "غير مصرح لك بعرض هذه التيكت لأنها غير محولة لك" });
        }

        res.status(200).json({ success: true, data: ticket });
    } catch (error) {
        next(error);
    }
};

// ==========================================
// 5. Update ticket
// ==========================================
const updateTicket = async (req, res, next) => {
    try {
        const { id } = req.params; 
        const { status } = req.body; 
        const userId = req.user.id;
        const userRole = req.user.role;

        const existingTicket = await prisma.tICKET.findUnique({
            where: { ticket_id: id }
        });

        if (!existingTicket) {
            return res.status(404).json({ success: false, message: "Ticket not found" });
        }

        if (userRole === 'TECHNICIAN' && existingTicket.assignee_id !== userId) {
            return res.status(403).json({ success: false, message: "لا تملك صلاحية تعديل هذه التيكت لأنها ليست من اختصاصك" });
        }

        const currentStatus = existingTicket.status;
        if (!status || status === currentStatus) {
            return res.status(200).json({ success: true, message: "No status change", data: existingTicket });
        }

        const allowedTransitions = {
            'New': ['Triaged', 'Assigned', 'Closed'], 
            'Triaged': ['Assigned', 'Closed'],
            'Assigned': ['In_Progress', 'Resolved'],
            'In_Progress': ['Resolved', 'Waiting'],
            'Waiting': ['In_Progress', 'Resolved', 'Closed'],
            'Resolved': ['Closed', 'Reopened'],
            'Reopened': ['Assigned', 'In_Progress'],
            'Closed': ['Reopened'] 
        };

        const validNextStates = allowedTransitions[currentStatus] || [];
        if (!validNextStates.includes(status)) {
            return res.status(400).json({ success: false, message: `انتقال غير مسموح: من '${currentStatus}' إلى '${status}'` });
        }

        if (userRole === 'TECHNICIAN' && ['Closed', 'Triaged', 'Reopened', 'New'].includes(status)) {
            return res.status(403).json({ success: false, message: "يجب تحويلها إلى Resolved فقط." });
        }

        const updateData = { status };
        const now = new Date();

        if (status === 'In_Progress' && !existingTicket.first_response_at) updateData.first_response_at = now;
        if (status === 'Resolved' && !existingTicket.resolved_at) updateData.resolved_at = now;
        if (status === 'Closed' && !existingTicket.closed_at) updateData.closed_at = now;

        const [updatedTicket, historyRecord] = await prisma.$transaction([
            prisma.tICKET.update({ where: { ticket_id: id }, data: updateData }),
            prisma.tICKET_STATUS_HISTORY.create({
                data: { ticket_id: id, old_status: currentStatus, new_status: status, changed_by: userId }
            })
        ]);

        res.status(200).json({ success: true, data: updatedTicket, history: historyRecord });
    } catch (error) {
        next(error); 
    }
};

// ==========================================
// 6. Delete ticket 
// ==========================================
const deleteTicket = async (req, res, next) => {
    try {
        const { id } = req.params;

        const historyCount = await prisma.tICKET_STATUS_HISTORY.count({ where: { ticket_id: id } });
        
        if (historyCount > 0) {
            return res.status(400).json({ 
                success: false, 
                message: "لا يمكن حذف هذه التيكت لأن لها سجل حركات. يرجى تغيير حالتها إلى 'Closed' بدلاً من الحذف." 
            });
        }

        await prisma.tICKET.delete({
            where: { ticket_id: id }
        });

        res.status(200).json({ success: true, message: "Ticket deleted successfully" });
    } catch (error) {
        next(error); 
    }
};

// ==========================================
// 7. Analytics Data 
// ==========================================
const getAnalyticsData = async (req, res, next) => {
    try {
        const totalTickets = await prisma.tICKET.count();

        const statusCountRaw = await prisma.tICKET.groupBy({
            by: ['status'],
            _count: { status: true }
        });
        const ticketsByStatus = statusCountRaw.map(item => ({
            status: item.status,
            count: item._count.status
        }));

        const priorityCountRaw = await prisma.tICKET.groupBy({
            by: ['priority'],
            _count: { priority: true }
        });
        const ticketsByPriority = priorityCountRaw.map(item => ({
            priority: item.priority,
            count: item._count.priority
        }));

        const now = new Date();
        const slaBreachedCount = await prisma.tICKET.count({
            where: {
                status: { notIn: ['Resolved', 'Closed'] },
                resolution_sla_due_at: { lt: now } 
            }
        });

        const openTickets = await prisma.tICKET.count({
            where: {
                status: { in: ['New', 'Assigned', 'In_Progress', 'Waiting'] }
            }
        });

        res.status(200).json({ 
            success: true, 
            data: {
                overview: {
                    total_tickets: totalTickets,
                    open_tickets: openTickets,
                    sla_breached: slaBreachedCount,
                },
                by_status: ticketsByStatus,
                by_priority: ticketsByPriority
            } 
        });
    } catch (error) {
        next(error); 
    }
};

// ==========================================
// 8. Assign Ticket
// ==========================================
const assignTicket = async (req, res, next) => {
    try {
        const { id } = req.params; 
        const { technician_id } = req.body; 
        const userId = req.user.id;

        const existingTicket = await prisma.tICKET.findUnique({
            where: { ticket_id: id }
        });

        if (!existingTicket) return res.status(404).json({ success: false, message: "التيكت غير موجودة" });
        
        const currentStatus = existingTicket.status;

        const [updatedTicket, historyRecord] = await prisma.$transaction([
            prisma.tICKET.update({
                where: { ticket_id: id },
                data: { assignee_id: technician_id, status: 'Assigned', assigned_at: new Date() }
            }),
            prisma.tICKET_STATUS_HISTORY.create({
                data: { ticket_id: id, old_status: currentStatus, new_status: 'Assigned', changed_by: userId }
            })
        ]);

        res.status(200).json({ success: true, message: "تم تحويل التيكت", data: updatedTicket, history: historyRecord });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createTicket,
    getAllTickets,
    getTicketById,
    updateTicket,
    deleteTicket,
    getAnalyticsData,
    assignTicket 
};