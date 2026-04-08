import httpProxy from 'http-proxy';
import http from 'http';
import dns from 'dns';

// Force resolution to the working IP for Supabase to bypass ISP block
const originalLookup = dns.lookup;
dns.lookup = (hostname, options, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (hostname === 'gfbyqabgrxfzwdbailyy.supabase.co') {
    if (options.all) {
      return callback(null, [{ address: '104.18.38.10', family: 4 }]);
    }
    return callback(null, '104.18.38.10', 4);
  }
  return originalLookup(hostname, options, callback);
};

// Create a proxy server
const proxy = httpProxy.createProxyServer({
    target: 'https://gfbyqabgrxfzwdbailyy.supabase.co',
    secure: true,
    changeOrigin: true
});

proxy.on('error', function (err, req, res) {
    console.error('Proxy error:', err);
    res.writeHead(500, {
        'Content-Type': 'text/plain'
    });
    res.end('Something went wrong with the proxy.');
});

// Setup proxy server to listen on port 54321
const server = http.createServer(function(req, res) {
    // Add CORS headers to bypass browser restrictions
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type, Authorization, apikey');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    proxy.web(req, res);
});

console.log("Supabase Local Proxy starting... listening on port 54321");
server.listen(54321);
