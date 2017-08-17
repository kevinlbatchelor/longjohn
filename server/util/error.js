var error = function (next, msg, code) {
    var err = {
        msg: msg,
        code: code
    };
    if (!code) {
        err.code = 500
    }

    next(err);
    return Promise.reject(err);
};

module.exports = error;
