const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seeding...');

    // 1. Seed Support Teams
    const teams = [
        { team_id: 1, name: 'IT Support', team_type: 'Technical' },
        { team_id: 2, name: 'Electrical Maintenance', team_type: 'Electrical' },
        { team_id: 3, name: 'Facilities', team_type: 'Facilities' },
        { team_id: 4, name: 'General Services', team_type: 'Service' }
    ];
    for (const team of teams) {
        await prisma.sUPPORT_TEAM.upsert({ 
            where: { team_id: team.team_id }, 
            update: {}, 
            create: team 
        });
    }
    console.log('✅ Support Teams seeded.');

    // 2. Seed Categories
    const categories = [
        { category_id: 1, name: 'Network', default_team_id: 1 },
        { category_id: 2, name: 'WiFi', default_team_id: 1 },
        { category_id: 3, name: 'Computer', default_team_id: 1 },
        { category_id: 4, name: 'Projector', default_team_id: 1 },
        { category_id: 5, name: 'Software', default_team_id: 1 },
        { category_id: 6, name: 'Printer', default_team_id: 1 },
        { category_id: 7, name: 'Electricity', default_team_id: 2 },
        { category_id: 8, name: 'Air Conditioning', default_team_id: 3 },
        { category_id: 9, name: 'Furniture', default_team_id: 3 },
        { category_id: 10, name: 'Lighting', default_team_id: 2 },
        { category_id: 11, name: 'Cleanliness', default_team_id: 4 },
        { category_id: 12, name: 'Plumbing', default_team_id: 3 },
        { category_id: 13, name: 'Other', default_team_id: 4 }
    ];
    for (const cat of categories) {
        await prisma.cATEGORY.upsert({ 
            where: { name: cat.name }, 
            update: {}, 
            create: cat 
        });
    }
    console.log('✅ Categories seeded.');

    // 3. Seed SLA Policies
    const slaPolicies = [
        { priority: 'Critical', response_sla_hours: 1, resolution_sla_hours: 4 },
        { priority: 'High', response_sla_hours: 2, resolution_sla_hours: 8 },
        { priority: 'Medium', response_sla_hours: 4, resolution_sla_hours: 24 },
        { priority: 'Low', response_sla_hours: 8, resolution_sla_hours: 48 }
    ];
    for (const sla of slaPolicies) {
        await prisma.sLA_POLICY.upsert({ 
            where: { priority: sla.priority }, 
            update: {}, 
            create: sla 
        });
    }
    console.log('✅ SLA Policies seeded.');

    // 4. Seed Specific Numeric Locations (101-120, 201-220, 301-320, 401-420)
    console.log('🏢 Building rooms per floor (101-120, 201-220, etc.)...');
    
    // من الدور الأول للدور الرابع
    for (let floor = 1; floor <= 4; floor++) {
        // من الغرفة 1 للغرفة 20 في كل دور
        for (let room = 1; room <= 20; room++) {
            const location_id = (floor * 100) + room; // هيطلع 101, 102 ... 201, 202
            
            await prisma.lOCATION.upsert({
                where: { location_id: location_id },
                update: {},
                create: {
                    location_id: location_id,
                    name: `${location_id}`, 
                    type: 'Room' 
                }
            });
        }
    }
    console.log('✅ Exact floor rooms seeded (80 locations total).');

    console.log('🎉 Database seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });