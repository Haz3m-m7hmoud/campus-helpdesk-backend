fetch('http://localhost:5000/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        email: 'ahmed@test.com',
        password: 'MySecretPassword123' // نفس الباسوورد اللي سجلنا بيه
    })
})
.then(res => res.json())
.then(data => console.log('Login Response:', data))
.catch(err => console.error('Error:', err));