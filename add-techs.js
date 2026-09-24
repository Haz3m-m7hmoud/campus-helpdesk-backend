const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function resetAndAddTechnicians() {
    try {
        console.log("⏳ جاري حذف الفنيين القدام لتنظيف القائمة...");
        
        await prisma.user.deleteMany({
            where: { role: 'TECHNICIAN' }
        });

        console.log("✅ تم حذف الفنيين القدام بنجاح.");
        console.log("⏳ جاري إضافة الفنيين الجدد بناءً على تصنيفات النظام...");

        const password = await bcrypt.hash('Password123', 10);
        
        // ربط أسماء الفنيين بالتصنيفات الموجودة في نظامك
        const techs = [
            { name: 'Mohamed (Network & WiFi)', email: 'mo.net@bua.edu.eg', password, role: 'TECHNICIAN' },
            { name: 'Ahmed (Computer & Software)', email: 'ahmed.comp@bua.edu.eg', password, role: 'TECHNICIAN' },
            { name: 'Mahmoud (Printer & Projector)', email: 'mah.print@bua.edu.eg', password, role: 'TECHNICIAN' },
            { name: 'Omar (Electricity & Lighting)', email: 'omar.elec@bua.edu.eg', password, role: 'TECHNICIAN' },
            { name: 'Kareem (AC & Plumbing)', email: 'kareem.plumb@bua.edu.eg', password, role: 'TECHNICIAN' },
            { name: 'Tarek (Furniture & Cleanliness)', email: 'tarek.clean@bua.edu.eg', password, role: 'TECHNICIAN' }
        ];
        
        for (const t of techs) {
            await prisma.user.create({
                data: t
            });
        }
        
        console.log("🎉 تم إضافة 6 فنيين بتخصصات النظام بالكامل بنجاح!");
    } catch (error) {
        console.error("❌ حصل مشكلة:", error);
    } finally {
        await prisma.$disconnect();
    }
}

resetAndAddTechnicians();