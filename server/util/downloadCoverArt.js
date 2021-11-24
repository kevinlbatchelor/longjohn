const axios = require('axios');
const fs = require('fs');
const os = require('os');
const osPathCharacter = os.platform() === 'win32' ? '\\' : '/';
const downloader = {};

downloader.downloadCoverArt = function (url, savePath, name) {
    return axios({ url, responseType: 'stream' }).then((response) => {
            return new Promise((resolve, reject) => {
                const ext = url.substring(url.length - 4);
                const filePath = savePath + osPathCharacter + name + ext;
                response.data.pipe(fs.createWriteStream(filePath)).on('finish', () => {
                    return resolve(filePath);
                }).on('error', (e) => {
                    return reject(e);
                });
            });
        }
    ).catch((e) => {
        console.log('------->COVER ART ERROR:');
    });
};

module.exports = downloader;