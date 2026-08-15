// Removed node-fetch dependency
// Actually, I'll use standard http to be safe, or assume fetch is available in the agent's node environment?
// Better to use a simple script that attempts to POST to the running server.

const http = require('http');

const data = JSON.stringify({
    username: "testuser_" + Date.now(),
    email: "test" + Date.now() + "@example.com",
    password: "password123"
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/signup',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let body = '';
    res.on('data', (chunk) => {
        body += chunk;
    });
    res.on('end', () => {
        console.log('BODY:', body);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
