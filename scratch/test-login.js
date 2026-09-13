const http = require('http');

const data = JSON.stringify({ password: 'admin1234567' });

const options = {
  hostname: '127.0.0.1',
  port: 3001,
  path: '/api/admin/session',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Origin': 'http://127.0.0.1:3001',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log(`Status: ${res.statusCode} Body: ${body}`));
});

req.on('error', error => console.error(error));
req.write(data);
req.end();
