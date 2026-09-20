fetch('http://localhost:5000/api/tickets/1', { 
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        status: 'IN_PROGRESS'
    })
})
.then(res => res.json())
.then(data => console.log('Update Response:', data))
.catch(err => console.error('Error:', err));