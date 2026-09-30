import React from 'react';
import MenuBookRounded from '@mui/icons-material/MenuBookRounded';
import BookShelf from './bookShelf.jsx';

import { BASE } from './baseHost';
const API_ROOT = BASE + ':3000/api/v1/audioBooks';

/* Audiobooks are keyed by name - a book is a folder of tracks, folded into
   one entry by the list route - and downloaded as a zip of the folder. */
const shelf = {
    apiRoot: API_ROOT,
    kind: 'book',
    Icon: MenuBookRounded,
    emptyHint: 'No audiobooks yet – run Find Audio from Admin.',
    keyOf: (book) => book.name,
    coverIdOf: (book) => `${book.name}-audio`,
    downloadHref: (book) => `${API_ROOT}/${encodeURIComponent(book.name)}/zip`
};

export default function Audiobooks() {
    return <BookShelf shelf={shelf}/>;
}
