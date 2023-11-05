const error = function (next, msg, code) {
    const err = {
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
