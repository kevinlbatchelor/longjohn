let http = require('http');
let fs = require('fs');

http.createServer(function (request, response) {
    response.writeHead(200, { 'Content-Type': 'video/mp4' });
    let rs = fs.createReadStream('c:/movies/BigBuck.mp4');
    rs.pipe(response);
}).listen(3000);
