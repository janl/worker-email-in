var http = require('http');
var port = process.env["PORT"] || 8888;

http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello Worker');
}).listen(port, '0.0.0.0');

console.log('Server running at http://0.0.0.0:' + port);
