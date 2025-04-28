let express = require('express');
let serveStatic = require('serve-static');
var path = require('path')

let app = express();

app.use(serveStatic(`${__dirname}/public`, {'index': ['index.html', 'index.htm', 'favicon.ico']}));
app.use(serveStatic(path.join(__dirname, '../node_modules')))
app.listen(80);
//For Local Testing Only
