const r = await fetch('http://127.0.0.1:3001/api/admin/session', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Origin': 'http://127.0.0.1:3001'
  },
  body: JSON.stringify({ password: 'admin1234567' })
});
console.log(r.status, await r.json());
