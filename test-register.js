fetch('http://localhost:5000/api/users/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        name: 'Ahmed Support',
        email: 'ahmed@test.com',
        password: 'MySecretPassword123',
        role: 'AGENT' // حددنا إن ده حساب موظف دعم
    })
})
.then(res => res.json())
.then(data => console.log('Register Response:', data))
.catch(err => console.error('Error:', err));