let express = require('express');
let logger = require('morgan');
let bodyParser = require('body-parser');
let _ = require('lodash');

let config = require('./util/config');
let router = require('./util/router');
let app = express();
let cors = require('cors');

app.use(cors({
    origin: '*'
}));

app.use(logger('dev'));
app.use(bodyParser.json());

app.use(express.static('public'));

app.use('/', require('./util/status'));

app.use('/', require('./movie/movieRoutes'));
app.use('/', require('./tv/tvRoutes.js'));
app.use('/', require('./movie/subTitleRoutes'));
app.use('/', require('./audioBooks/audioBookRoutes'));
app.use('/', require('./movie/movieCategoryRoutes'));
app.use('/', require('./scanner/scannerRoutes'));

// If no route is matched by now, it must be a 404
app.use(function (req, res, next) {
    let err = new Error('Path Not Found');
    err.url = req.url;
    err.status = 404;
    next(err);
});

app.use(function (err, req, res, next) {
    console.log(err);
    if (res.headersSent) {
        return next(err);
    }

    if (_.isObject(err)) {
        res.status(err.code || 500);
        res.json({error: err.msg || 'Unknown server error'});
        if (err.stack) {
            console.log('Express Stack: ', err.stack);
        }
    } else {
        res.status(500);
        res.json({error: err});
    }
});
// Start the server

app.set('port', config.server.port);

require('http').createServer(app).listen(app.get('port'));
console.log('starting server...')
