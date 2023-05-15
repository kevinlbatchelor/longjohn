let express = require('express');
let serveStatic = require('serve-static');
var path = require('path')

console.log('------->path', path.join(__dirname, '../node_modules'));
let app = express();

app.use(serveStatic(`${__dirname}/public`, {'index': ['index.html', 'index.htm', 'favicon.ico']}));
// app.use('/lodash',  express.static(__dirname + '/node_modules/lodash')); // redirect JS jquery
// app.use('/angular-sanitize',  express.static(__dirname + '../node_modules/angular-sanitize')); // redirect JS jquery
// app.use('/angular-route',  express.static(__dirname + '../node_modules/angular-route')); // redirect JS jquery
app.use(serveStatic(path.join(__dirname, '../node_modules')))


// app.use('/angular',  express.static(__dirname + '../node_modules/angular')); // redirect JS jquery
app.listen(80);

