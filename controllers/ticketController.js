const { PrismaClient } = require('@prisma/client');
const axios = require('axios'); 
const prisma = new PrismaClient();

// ==========================================
// 1. Helper Functions (SLA & Priority)
// ==========================================
const calculateSLADueDate = (startDate, slaHours) => {
    let current = new Date(startDate);
    let remainingHours = slaHours;

    while (remainingHours > 0) {
        let day = current.getDay(); 
        
        // الإجازة: الخميس (4) والجمعة (5)
        if (day === 4 || day === 5) {
            current.setDate(current.getDate() + (day === 4 ? 2 : 1));
            current.setHours(0, 0, 0, 0);
            continue;
        }

        // حساب اليوم كامل 24 ساعة بدلاً من ساعات العمل فقط
        let endOfDay = new Date(current);
        endOfDay.setHours(23, 59, 59, 999);
        
        let msLeftToday = endOfDay.getTime() - current.getTime();
        let hoursLeftToday = msLeftToday / (1000 * 60 * 60);

        if (remainingHours <= hoursLeftToday) {
            current.setTime(current.getTime() + (remainingHours * 60 * 60 * 1000));
            remainingHours = 0;
        } else {
            remainingHours -= hoursLeftToday;
            current.setDate(current.getDate() + 1);
            current.setHours(0, 0, 0, 0);
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
            location_note, 
            issue_type, urgency, impact,
            is_emergency 
        } = req.body;
        
        const locNumber = Number(location_id);
        
        if (isNaN(locNumber) || locNumber < 101 || locNumber > 420) {
            return res.status(400).json({ success: false, message: "Invalid location ID. Must be between 101 and 420." });
        }

        const floor = Math.floor(locNumber / 100);
        const room = locNumber % 100;

        if (room < 1 || room > 20) {
            return res.status(400).json({ success: false, message: `Invalid room number (${room}) on floor ${floor}. Rooms must be between 1 and 20.` });
        }
        
        // ==========================================
        // Priority and Emergency Handling
        // ==========================================
        const calculatedPriority = calculatePriority(impact, urgency);
        
        // Check for emergency keywords in title
        const emergencyKeywords = ['fire', 'emergency', 'leak', 'explosion', 'disaster', 'urgent', 'critical'];
        const titleHasEmergency = emergencyKeywords.some(keyword => title.toLowerCase().includes(keyword));

        // Emergency triggers if selected by user, title contains keywords, or priority is Critical
        const finalIsEmergency = is_emergency === true || titleHasEmergency || (calculatedPriority === 'Critical');

        let slaPolicy = await prisma.sLA_POLICY.findFirst({
            where: { priority: calculatedPriority }
        });

        if (!slaPolicy) {
            // أوقات الـ SLA الجديدة والسريعة (بالساعات)
            const fallbackSLAs = {
                'Critical': { response_sla_hours: 0.25, resolution_sla_hours: 0.5 }, // نصف ساعة للحل
                'High': { response_sla_hours: 0.5, resolution_sla_hours: 2 },        // ساعتين للحل
                'Medium': { response_sla_hours: 1, resolution_sla_hours: 4 },        // 4 ساعات للحل
                'Low': { response_sla_hours: 2, resolution_sla_hours: 8 }            // 8 ساعات للحل
            };
            slaPolicy = fallbackSLAs[calculatedPriority] || fallbackSLAs['Medium'];
        }

        const now = new Date();
        const response_sla_due_at = calculateSLADueDate(now, slaPolicy.response_sla_hours);
        const resolution_sla_due_at = calculateSLADueDate(now, slaPolicy.resolution_sla_hours);

        const reporter_id = req.user.id; 
        
        // ==========================================
        // Reference ID Generation
        // ==========================================
        const ticketCount = await prisma.tICKET.count();
        const nextSequence = String(ticketCount + 1).padStart(6, '0');
        const reference_id = `HLP-${nextSequence}`;
        
        const newTicket = await prisma.tICKET.create({
            data: {
                reference_id,
                title,
                description,
                category_id,
                location_id: locNumber,
                location_note, 
                issue_type: issue_type || 'Incident', 
                urgency,
                impact,
                priority: calculatedPriority,
                is_emergency: finalIsEmergency, 
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
        // AI Integration Background Job
        // ==========================================
        setImmediate(async () => {
            try {
                const openTickets = await prisma.tICKET.findMany({
                    where: { status: { in: ['New', 'Assigned', 'In_Progress', 'Waiting'] } },
                    select: { 
                        reference_id: true,
                        description: true, 
                        priority: true,
                        is_emergency: true,
                        location: {
                            select: { name: true }
                        }
                    }
                });

                const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000/api/ai/analyze';
                
                await axios.post(aiServiceUrl, {
                    new_ticket: newTicket,
                    open_tickets_queue: openTickets
                });
                
                console.log(`[AI Triggered] Sent ticket ${reference_id} and ${openTickets.length} open tickets to AI model.`);
            } catch (err) {
                console.error('[AI Warning] Could not reach AI service.', err.message);
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
            include: { 
                category: true, 
                location: true,
                reporter: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            } 
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
// 4. Get Ticket By ID (With Timeline Support)
// ==========================================
const getTicketById = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const includeComments = req.user.role === 'REPORTER' 
            ? { where: { is_internal: false }, include: { author: { select: { name: true, role: true } } } } 
            : { include: { author: { select: { name: true, role: true } } } };

        const ticket = await prisma.tICKET.findUnique({
            where: { ticket_id: id },
            include: { 
                category: true, 
                location: true, 
                history: true, // Used by frontend to draw the Timeline Tracker
                comments: includeComments,
                reporter: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        if (!ticket) {
            return res.status(404).json({ success: false, message: "Ticket not found." });
        }

        if (req.user.role === 'REPORTER' && ticket.reporter_id !== req.user.id) {
            return res.status(403).json({ success: false, message: "Unauthorized to view this ticket." });
        }
        if (req.user.role === 'TECHNICIAN' && ticket.assignee_id !== req.user.id) {
            return res.status(403).json({ success: false, message: "Unauthorized. Ticket not assigned to you." });
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
            return res.status(404).json({ success: false, message: "Ticket not found." });
        }

        if (userRole === 'TECHNICIAN' && existingTicket.assignee_id !== userId) {
            return res.status(403).json({ success: false, message: "Unauthorized action on unassigned ticket." });
        }

        const currentStatus = existingTicket.status;
        if (!status || status === currentStatus) {
            return res.status(200).json({ success: true, message: "No status change.", data: existingTicket });
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
            return res.status(400).json({ success: false, message: `Invalid transition: from '${currentStatus}' to '${status}'.` });
        }

        if (userRole === 'TECHNICIAN' && ['Closed', 'Triaged', 'Reopened', 'New'].includes(status)) {
            return res.status(403).json({ success: false, message: "Status can only be changed to Resolved or In_Progress." });
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
                message: "Cannot delete this ticket due to existing history records. Please close it instead." 
            });
        }

        await prisma.tICKET.delete({
            where: { ticket_id: id }
        });

        res.status(200).json({ success: true, message: "Ticket deleted successfully." });
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

        if (!existingTicket) return res.status(404).json({ success: false, message: "Ticket not found." });
        
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

        res.status(200).json({ success: true, message: "Ticket assigned successfully.", data: updatedTicket, history: historyRecord });
    } catch (error) {
        next(error);
    }
};

// ==========================================
// 9. Analyze Ticket (AI API Call)
// ==========================================
const analyzeTicket = async (req, res, next) => {
    try {
        const ticketId = req.params.id;
        const ticket = await prisma.tICKET.findUnique({ where: { ticket_id: ticketId } });
        
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found.' });
        }

        const oldTickets = await prisma.tICKET.findMany({
            where: { ticket_id: { not: ticketId } }, 
            take: 50,
            orderBy: { created_at: 'desc' }, 
            select: { reference_id: true, description: true, title: true }
        });

        const formattedHistory = oldTickets.map(t => ({
            id: t.reference_id,
            text: `${t.title} ${t.description}` 
        }));

        // Fetch available technicians to send to AI for Smart Assignment
        const technicians = await prisma.uSER.findMany({
            where: { role: 'TECHNICIAN' },
            select: { id: true, name: true }
        });

        const aiPayload = {
            title: ticket.title,
            description: ticket.description,
            location: String(ticket.location_id), 
            urgency: ticket.urgency || "Medium",
            historical_tickets: formattedHistory,
            available_technicians: technicians
        };

        const aiResponse = await axios.post('https://p5-ai-production.up.railway.app/ai/analyze', aiPayload);

        res.status(200).json({ success: true, suggestion: aiResponse.data });
    } catch (error) {
        console.error('[AI Error Details]:', error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, message: 'AI analysis failed.' });
    }
};

module.exports = {
    createTicket,
    getAllTickets,
    getTicketById,
    updateTicket,
    deleteTicket,
    getAnalyticsData,
    assignTicket,
    analyzeTicket 
};