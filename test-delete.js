fetch('http://localhost:5000/api/tickets/1', { 
    method: 'DELETE'
})
.then(res => res.json())
.then(data => console.log('Delete Response:', data))
.catch(err => console.error('Error:', err));