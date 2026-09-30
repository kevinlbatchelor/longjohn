let express = require('express');
let logger = require('morgan');
let _ = require('lodash');

let config = require('./util/config');
let router = require('./util/router');
let app = express();
let cors = require('cors');

app.use(cors({
    origin: '*'
}));

app.use(logger('dev'));
app.use(express.json());
// Pinned to the repo rather than the working directory: under pm2 or a
// cron @reboot the process can start from anywhere, and APKs and the like
// parked in public/ must still be found.
app.use(express.static(require('path').join(__dirname, '..', 'public')));
app.use('/', require('./util/status'));
app.use('/', require('./movie/movieRoutes'));
app.use('/', require('./tv/tvRoutes.js'));
app.use('/', require('./movie/subTitleRoutes'));
app.use('/', require('./audioBooks/audioBookRoutes'));
app.use('/', require('./eBooks/eBookRoutes'));
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
        /* Only a real HTTP status goes to res.status: a file error's code is
           a string like ENOENT, and handing that over threw inside this very
           handler and took the server down with it. */
        const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
        res.status(status);
        res.json({error: err.msg || err.message || 'Unknown server error'});
        if (err.stack) {
            console.log('Express Stack: ', err.stack);
        }
    } else {
        res.status(500);
        res.json({error: err});
    }
});
// Tables and columns that arrived after the first release are added on an
// older database here, without touching the rows.
require('./audioBooks/audioBook').ensureSchema().catch((e) => {
    console.error('LONG-JOHN audiobook table update failed:', e.message);
});
require('./eBooks/eBook').ensureSchema().catch((e) => {
    console.error('LONG-JOHN ebook table update failed:', e.message);
});

/* A rejection nothing caught would take the whole server down on Node 15 and
   later. Logged instead: the request that caused it has already failed, and
   everyone else's stream carries on. */
process.on('unhandledRejection', (reason) => {
    console.error('LONG-JOHN unhandled rejection:', reason instanceof Error ? reason.stack : reason);
});

// Start the server

app.set('port', config.server.port);

require('http').createServer(app).listen(app.get('port'));
console.log('starting server...')
