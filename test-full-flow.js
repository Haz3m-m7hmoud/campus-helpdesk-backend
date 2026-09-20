async function runTest() {
    const randomEmail = `student${Date.now()}@bua.edu.eg`; 
    
    // 1. Register a new user
    await fetch('http://localhost:5000/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            name: 'Hazem Mahmoud', 
            email: randomEmail, 
            password: 'password123' 
        })
    });
    
    // 2. Login to get the Token
    const loginRes = await fetch('http://localhost:5000/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            email: randomEmail, 
            password: 'password123' 
        })
    });
    
    const loginData = await loginRes.json();
    const token = loginData.token; // أو loginData.data.token حسب تصميمك

    if (!token) {
        return console.log("❌ Error getting token from login:", loginData);
    }
    console.log("✅ User logged in successfully. Token received!");

    // 3. Create a Ticket using the exact Data Team format
    const ticketRes = await fetch('http://localhost:5000/api/tickets', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            title: 'Projector not turning on',
            description: 'The projector is completely dead, checking the power cable did not help.',
            category_id: 4,      
            location_id: 205,    
            issue_type: 'Technical',
            urgency: 'Medium',
            impact: 'Medium',
            priority: 'Medium'   
        })
    });

    const ticketData = await ticketRes.json();
    console.log("🎟️ Create Ticket Response:", ticketData);
}

runTest();