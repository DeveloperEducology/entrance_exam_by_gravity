const http = require('http');
http.get('http://localhost:3000/api/lesson/expanded-form', (res) => {
  let rawData = '';
  res.on('data', (chunk) => { rawData += chunk; });
  res.on('end', () => {
    try { console.log(rawData); } catch (e) { console.error(e.message); }
  });
});
