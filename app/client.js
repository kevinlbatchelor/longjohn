let express = require('express');
let serveStatic = require('serve-static');

console.log('------->express.static', __dirname + '/../node_modules/lodash');
let app = express();

app.use(serveStatic(`${__dirname}/public`, {'index': ['index.html', 'index.htm', 'favicon.ico']}));
app.use('/lodash',  express.static(__dirname + '/node_modules/lodash')); // redirect JS jquery
app.use('/angular-sanitize',  express.static(__dirname + '../node_modules/angular-sanitize')); // redirect JS jquery
app.use('/angular-route',  express.static(__dirname + '../node_modules/angular-route')); // redirect JS jquery
app.use('/angular',  express.static(__dirname + '../node_modules/angular')); // redirect JS jquery
app.listen(80);