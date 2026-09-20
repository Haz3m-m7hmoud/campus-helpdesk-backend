const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runAnalyticsTest() {
    try {
        // 1. ترقية آخر مستخدم تم إنشاؤه لمدير
        const latestUser = await prisma.user.findFirst({
            orderBy: { createdAt: 'desc' }
        });

        await prisma.user.update({
            where: { id: latestUser.id },
            data: { role: 'MANAGER' }
        });
        console.log(`✅ User ${latestUser.email} upgraded to MANAGER`);

        // 2. تسجيل الدخول للحصول على توكن المدير
        const loginRes = await fetch('http://localhost:5000/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: latestUser.email, 
                password: 'password123' // نفس الباسورد اللي عملنا بيه الحساب
            })
        });
        
        const loginData = await loginRes.json();
        const token = loginData.token;

        if (!token) throw new Error("Failed to get manager token");
        console.log("✅ Manager token received!");

        // 3. جلب بيانات التحليلات لتيم الداتا
        const analyticsRes = await fetch('http://localhost:5000/api/tickets/analytics', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const analyticsData = await analyticsRes.json();
        
        // طباعة النتيجة بشكل منظم
        console.log("📊 Analytics Data Returned:");
        console.log(JSON.stringify(analyticsData, null, 2));

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

runAnalyticsTest();