import React from 'react';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import BookShelf from './bookShelf.jsx';

const BASE = process.env.BASE_HOST;
const API_ROOT = BASE + ':3000/api/v1/eBooks';

/* eBooks are keyed by row id - one file is one book - and downloaded as the
   file itself. The download link ends in the file's own name and extension,
   which is what a Kindle's browser goes by when deciding to keep it. */
const fileNameOf = (book) => `${book.name.replace(/[\\/:*?"<>|]+/g, ' ').trim()}.${book.format || 'mobi'}`;

const shelf = {
    apiRoot: API_ROOT,
    kind: 'book',
    Icon: AutoStoriesIcon,
    emptyHint: 'No eBooks yet – run Find eBooks from Admin.',
    keyOf: (book) => String(book.id),
    coverIdOf: (book) => `${book.id}-ebook`,
    downloadHref: (book) => `${API_ROOT}/${book.id}/download/${encodeURIComponent(fileNameOf(book))}`
};

export default function EBooks() {
    return <BookShelf shelf={shelf}/>;
}
