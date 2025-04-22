const axios = require('axios');
const fs = require('fs');
const os = require('os');
const config = require('./config');
const osPathCharacter = os.platform() === 'win32' ? '\\' : '/';
const downloader = {};

downloader.downloadCoverArt = function (url, savePath, id, handleExt = true) {
    return axios({ url, responseType: 'stream' }).then((response) => {
            return new Promise((resolve, reject) => {
                const ext = url.substring(url.length - 4);
                let filePath = ''
                if(handleExt){
                    filePath = savePath + osPathCharacter + id + ext;
                } else {
                    filePath = savePath + osPathCharacter + id + '.jpg';
                }
                response.data.pipe(fs.createWriteStream(filePath)).on('finish', () => {
                    return resolve(filePath);
                }).on('error', (e) => {
                    console.error('------->e', e);
                    return reject(e);
                });
            });
        }
    ).catch((e) => {
        console.error('------->COVER ART ERROR:' + e);
    });
};

downloader.fetchBookMeta = async function (title) {
    const q = encodeURIComponent(`intitle:${title}`);
    const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1&key=${config.goog}`;

    const { data } = await axios.get(url);

    if (!data.items?.length) return {};

    const vol      = data.items[0].volumeInfo;
    const isbn     = vol.industryIdentifiers?.find(id => id.type.includes('ISBN'))?.identifier;
    const img      = vol.imageLinks;
    const coverUrl = img?.extraLarge || img?.large || img?.thumbnail; // pick best available

    return { isbn, coverUrl };
};

module.exports = downloader;