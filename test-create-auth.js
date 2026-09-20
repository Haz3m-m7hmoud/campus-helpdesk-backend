const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6IkFHRU5UIiwiaWF0IjoxNzg5ODU3NzUwLCJleHAiOjE3OTI0NDk3NTB9.Fc3arQ5ueMzeoIGkz4tmOSZZfhK-OFWurdiWEXTjBG8'; 

fetch('http://localhost:5000/api/tickets', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // This is how we present our "ID card" to the middleware
    },
    body: JSON.stringify({
        title: 'Internet connection dropping',
        description: 'The Wi-Fi in the main lab keeps disconnecting every 5 minutes.',
        location: 'Main Lab - Building A',
        reporterId: 1 // The ID of the user we just created
    })
})
.then(res => res.json())
.then(data => console.log('Create Ticket Response:', data))
.catch(err => console.error('Error:', err));