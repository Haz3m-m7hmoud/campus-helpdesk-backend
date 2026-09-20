fetch('http://localhost:5000/api/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        title: 'مشكلة في الواي فاي',
        description: 'شبكة الكلية مش بتوصل في مدرج 3',
        location: 'مبنى علوم الحاسب',
        reporterId: 1  // ده الـ ID بتاعك اللي لسه عاملينه
    })
})
.then(res => res.json())
.then(data => console.log('API Response:', data))
.catch(err => console.error(err));