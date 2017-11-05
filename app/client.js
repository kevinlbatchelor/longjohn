let express = require('express');
let serveStatic = require('serve-static');

let app = express();

app.use(serveStatic(`${__dirname}/public`, {'index': ['index.html', 'index.htm']}));
app.listen(80);