import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert, Autocomplete, Box, Button, Card, CardContent, CardMedia, CircularProgress,
    Dialog, DialogActions, DialogContent, DialogTitle, FormControl, Grid, IconButton,
    InputLabel, NativeSelect, TextField, Typography
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import EditOffIcon from '@mui/icons-material/EditOff';
import ImageIcon from '@mui/icons-material/Image';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import CoverPicker from './coverPicker.jsx';
import { cssVars } from './styles.jsx';

/* A shelf of books --------------------------------------------------------------
 * The one page behind both the audiobook and the eBook routes: a searchable,
 * filterable grid of covers with a download on each, and in edit mode a
 * cover picker and a category editor per book. What differs between the two
 * shelves comes in as props:
 *
 *   apiRoot        the list, cover and category routes live under this
 *   keyOf(book)    what the server keys a book's routes by - name or id
 *   coverIdOf(book) the cover file's name in the cover folder, minus .jpg
 *   downloadHref(book) where the download button points
 *   Icon           what a book with no cover shows
 *   emptyHint      what to say when the shelf is bare
 *   kind           'book' - wording in the cover picker
 *
 * The list route answers one entry per book:
 * { name, authors, categories, series, added, ... } with authors and
 * categories from Audible, so both are empty for a book it did not know. */

import { BASE } from './baseHost';
const COVER_ROOT = BASE + ':3000/api/v1/cover';

const fetchJson = (url, opts) => fetch(url, opts).then((r) => {
    if (r.ok) return r.json();
    return r.json().catch(() => ({})).then((body) => {
        throw new Error(body.error || `HTTP ${r.status}`);
    });
});

const jsonBody = (method, body) => ({
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
});

/* The version is a cache buster. The cover lives at one URL per book and a new
   one is written over the old file, so without it the browser keeps showing the
   cover it has already cached. */
const coverUrlFor = (coverId, version) =>
    `${COVER_ROOT}/${encodeURIComponent(coverId)}${version ? `?v=${version}` : ''}`;

/* Filters live in the query string, as on the movie page, so a filtered view
   survives a reload and can be bookmarked. Only values that differ from the
   default are written, so the plain page keeps its plain URL. */
const SORTS = [
    { value: 'name', label: 'Title A–Z' },
    { value: 'author', label: 'Author' },
    { value: 'added', label: 'Recently added' }
];
const DEFAULT_FILTERS = { name: '', author: '', category: '', sort: 'name' };

const readFilters = () => {
    const q = new URLSearchParams(window.location.search);
    const sort = q.get('sort');
    return {
        name: q.get('name') || '',
        author: q.get('author') || '',
        category: q.get('category') || '',
        sort: SORTS.some((s) => s.value === sort) ? sort : 'name'
    };
};

const writeFilters = (filters) => {
    const url = new URL(window.location);
    Object.keys(DEFAULT_FILTERS).forEach((key) => {
        if (filters[key] && filters[key] !== DEFAULT_FILTERS[key]) url.searchParams.set(key, filters[key]);
        else url.searchParams.delete(key);
    });
    window.history.replaceState({}, '', url);
};

const uniqueSorted = (values) => Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));

const firstAuthor = (book) => (book.authors.length ? book.authors[0] : '');

const compareFor = (sort) => {
    if (sort === 'added') return (a, b) => new Date(b.added) - new Date(a.added) || a.name.localeCompare(b.name);
    if (sort === 'author') {
        // Books with no author go last, then title within an author.
        return (a, b) => {
            const aa = firstAuthor(a);
            const ba = firstAuthor(b);
            if (!aa !== !ba) return aa ? -1 : 1;
            return aa.localeCompare(ba) || a.name.localeCompare(b.name);
        };
    }
    return (a, b) => a.name.localeCompare(b.name);
};

/* Every sx object below is hoisted out of render. Emotion caches on object
   identity, so a literal written inside a map is re-serialised for every card
   on every render. */
const pageSx = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' };
const toolbarSx = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
    width: '100%',
    maxWidth: 900,
    mb: 2,
    px: 2
};
const searchSx = { minWidth: 220, flex: 1 };
/* A native select sizes itself to its longest option, so one long author or
   category would stretch the whole toolbar. Fixed width instead, with the
   chosen value clipped to an ellipsis, and the option labels themselves cut
   short - the value behind each stays the full name, so filtering is exact. */
const selectSx = {
    width: 170,
    '& select': { textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }
};
const LABEL_MAX = 28;
const shortLabel = (text) => (text.length > LABEL_MAX ? text.slice(0, LABEL_MAX - 1).trimEnd() + '…' : text);
const countSx = { color: cssVars.green, fontSize: 12, mb: 1 };
const emptySx = { color: cssVars.green, mt: 4 };
const gridSx = { display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' };
const spinnerSx = { color: cssVars.green };
const centeredSx = { mt: 8 };

const cardSx = { width: 200, display: 'flex', flexDirection: 'column', position: 'relative' };
const mediaSx = { height: 260 };
const fallbackSx = { height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const contentSx = { py: 1, display: 'flex', alignItems: 'center', gap: 0.5 };
const titlesSx = { minWidth: 0, flex: 1 };
const authorSx = { color: 'text.secondary', display: 'block' };
const downloadSx = { color: cssVars.green };
// Top-left corner in edit mode, matching where the TV grid keeps it.
const coverButtonSx = {
    position: 'absolute',
    top: 4,
    left: 4,
    zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: cssVars.green,
    '&:hover': { backgroundColor: 'rgba(0,0,0,0.85)' }
};
// The other corner: nothing on this grid is destructive, so both are green.
const tagButtonSx = { ...coverButtonSx, left: 'auto', right: 4 };
const tagFieldSx = { mt: 1, minWidth: 320 };
const tagHintSx = { color: 'text.secondary', mt: 1, display: 'block' };

// The line under the title: the author, or the series, or how many tracks.
const subtitleOf = (book) => {
    if (book.authors.length) return book.authors.join(', ');
    if (book.series && book.series.name) return book.series.name;
    if (book.tracks) return `${book.tracks} track${book.tracks === 1 ? '' : 's'}`;
    return '';
};

const BookCard = React.memo(function BookCard({ book, shelf, editMode, onChangeCover, onEditTags, coverV }) {
    const [ imgError, setImgError ] = useState(false);
    const { Icon } = shelf;

    // A book that had no cover has one now - give the image another go rather
    // than leaving the fallback icon there until the page is reloaded.
    useEffect(() => { setImgError(false); }, [coverV]);

    const subtitle = subtitleOf(book);

    return (
        <Card sx={cardSx}>
            {editMode && (
                <IconButton
                    size="small"
                    onClick={() => onChangeCover(book)}
                    title={`Change cover for ${book.name}`}
                    sx={coverButtonSx}
                >
                    <ImageIcon fontSize="small"/>
                </IconButton>
            )}
            {editMode && (
                <IconButton
                    size="small"
                    onClick={() => onEditTags(book)}
                    title={`Categories for ${book.name}`}
                    sx={tagButtonSx}
                >
                    <LocalOfferIcon fontSize="small"/>
                </IconButton>
            )}
            {imgError ? (
                <Box sx={fallbackSx}>
                    <Icon/>
                </Box>
            ) : (
                <CardMedia
                    component="img"
                    image={coverUrlFor(shelf.coverIdOf(book), coverV)}
                    alt={book.name}
                    sx={mediaSx}
                    onError={() => setImgError(true)}
                />
            )}
            <CardContent sx={contentSx}>
                <Box sx={titlesSx}>
                    <Typography variant="subtitle2" noWrap title={book.name}>
                        {book.name}
                    </Typography>
                    <Typography variant="caption" noWrap title={subtitle} sx={authorSx}>
                        {subtitle}
                    </Typography>
                </Box>
                <IconButton
                    size="small"
                    component="a"
                    href={shelf.downloadHref(book)}
                    title={`Download ${book.name}`}
                    aria-label={`Download ${book.name}`}
                    sx={downloadSx}
                >
                    <DownloadIcon fontSize="small"/>
                </IconButton>
            </CardContent>
        </Card>
    );
});

/* Category editor. Mounted per book and unmounted on close, like the cover
   picker, so its draft goes with it. Existing categories across the shelf
   are the suggestions; anything typed and entered becomes a new one. */
function CategoryEditor({ book, shelf, options, onClose, onSaved }) {
    const [ tags, setTags ] = useState(book.categories);
    const [ saving, setSaving ] = useState(false);
    const [ error, setError ] = useState(null);

    const save = () => {
        setSaving(true);
        setError(null);

        fetchJson(`${shelf.apiRoot}/${encodeURIComponent(shelf.keyOf(book))}/categories`, jsonBody('PUT', { categories: tags }))
            .then((body) => {
                onSaved(book, body.categories);
                onClose();
            })
            .catch((err) => {
                setError(err.message);
                setSaving(false);
            });
    };

    return (
        <Dialog open onClose={() => !saving && onClose()} maxWidth="sm" fullWidth>
            <DialogTitle>Categories – {book.name}</DialogTitle>
            <DialogContent>
                <Autocomplete
                    multiple
                    freeSolo
                    autoSelect
                    options={options}
                    value={tags}
                    onChange={(e, value) => setTags(value)}
                    renderInput={(params) => (
                        <TextField {...params} autoFocus variant="standard" label="Categories" sx={tagFieldSx}/>
                    )}
                />
                <Typography variant="caption" sx={tagHintSx}>
                    Pick from the list or type a new one and press Enter.
                </Typography>
                {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            </DialogContent>
            <DialogActions>
                <Button disabled={saving} onClick={onClose}>Cancel</Button>
                <Button disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</Button>
            </DialogActions>
        </Dialog>
    );
}

export default function BookShelf({ shelf }) {
    const [ books, setBooks ] = useState([]);
    const [ loading, setLoading ] = useState(true);
    const [ error, setError ] = useState(null);

    const [ filters, setFilters ] = useState(readFilters);

    const [ editMode, setEditMode ] = useState(false);
    // Which book's cover is being picked, and the bust values that make the
    // cards re-fetch a cover that has just been replaced at the same URL.
    const [ coverTarget, setCoverTarget ] = useState(null);
    const [ coverVersions, setCoverVersions ] = useState({}); // book key -> bust value
    const [ tagTarget, setTagTarget ] = useState(null); // the book whose categories are being edited

    useEffect(() => {
        let live = true;

        fetchJson(shelf.apiRoot)
            .then((rows) => {
                if (!live) return;
                setBooks(rows);
                setLoading(false);
            })
            .catch((err) => {
                if (!live) return;
                setError(err.message);
                setLoading(false);
            });

        return () => { live = false; };
    }, [shelf.apiRoot]);

    const setFilter = (key) => (e) => {
        const value = e.target.value;
        setFilters((current) => {
            const next = { ...current, [key]: value };
            writeFilters(next);
            return next;
        });
    };

    // The choices on offer are whatever the shelf actually holds.
    const authors = useMemo(() => uniqueSorted(books.flatMap((b) => b.authors)), [books]);
    const categories = useMemo(() => uniqueSorted(books.flatMap((b) => b.categories)), [books]);

    const visible = useMemo(() => {
        const term = filters.name.trim().toLowerCase();

        const matches = books.filter((b) =>
            (!term || b.name.toLowerCase().includes(term) || b.authors.some((a) => a.toLowerCase().includes(term)))
            && (!filters.author || b.authors.includes(filters.author))
            && (!filters.category || b.categories.includes(filters.category))
        );

        return matches.sort(compareFor(filters.sort));
    }, [books, filters]);

    /* Stable, so a re-render of the grid does not re-render every memoised
       card along with it. */
    const openCoverPicker = useCallback((book) => setCoverTarget(book), []);
    const openTagEditor = useCallback((book) => setTagTarget(book), []);

    const handleCoverSaved = useCallback((key) => {
        // Same URL, new file - the card needs a reason to fetch it again.
        setCoverVersions((v) => ({ ...v, [key]: Date.now() }));
    }, []);

    // The dropdown's choices follow from the books, so a new category is on
    // offer as soon as it is saved.
    const handleTagsSaved = useCallback((book, saved) => {
        const key = shelf.keyOf(book);
        setBooks((list) => list.map((b) => (shelf.keyOf(b) === key ? { ...b, categories: saved } : b)));
    }, [shelf]);

    if (loading) return <Centered><CircularProgress sx={spinnerSx}/></Centered>;
    if (error) return <Centered><Alert severity="error">Load error – {error}</Alert></Centered>;

    const coverKey = coverTarget ? shelf.keyOf(coverTarget) : null;
    const coverRoute = coverTarget ? `${shelf.apiRoot}/${encodeURIComponent(coverKey)}/cover` : null;

    return (
        <Box sx={pageSx}>
            <Box sx={toolbarSx}>
                <TextField
                    label="Search title or author"
                    variant="standard"
                    value={filters.name}
                    onChange={setFilter('name')}
                    sx={searchSx}
                />
                {/* Always drawn, even with nothing but All to offer: a shelf
                    that has not been scanned yet has no authors or categories,
                    and a control that is missing looks broken rather than empty. */}
                <FormControl variant="standard" sx={selectSx}>
                    <InputLabel shrink htmlFor="shelf-author">Author</InputLabel>
                    <NativeSelect id="shelf-author" value={filters.author} onChange={setFilter('author')}>
                        <option value="">All</option>
                        {authors.map((a) => <option key={a} value={a}>{shortLabel(a)}</option>)}
                    </NativeSelect>
                </FormControl>
                <FormControl variant="standard" sx={selectSx}>
                    <InputLabel shrink htmlFor="shelf-category">Category</InputLabel>
                    <NativeSelect id="shelf-category" value={filters.category} onChange={setFilter('category')}>
                        <option value="">All</option>
                        {categories.map((c) => <option key={c} value={c}>{shortLabel(c)}</option>)}
                    </NativeSelect>
                </FormControl>
                <FormControl variant="standard" sx={selectSx}>
                    <InputLabel shrink htmlFor="shelf-sort">Sort</InputLabel>
                    <NativeSelect id="shelf-sort" value={filters.sort} onChange={setFilter('sort')}>
                        {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </NativeSelect>
                </FormControl>
                <IconButton
                    size="small"
                    onClick={() => setEditMode((v) => !v)}
                    color={editMode ? 'error' : 'default'}
                    title={editMode ? 'Exit edit mode' : 'Edit (covers and categories)'}
                >
                    {editMode ? <EditOffIcon fontSize="small"/> : <EditIcon fontSize="small"/>}
                </IconButton>
            </Box>

            {books.length > 0 && (
                <Typography sx={countSx}>
                    {visible.length === books.length
                        ? `${books.length} book${books.length === 1 ? '' : 's'}`
                        : `${visible.length} of ${books.length} books`}
                </Typography>
            )}

            {books.length === 0 && <Typography sx={emptySx}>{shelf.emptyHint}</Typography>}
            {books.length > 0 && visible.length === 0 && <Typography sx={emptySx}>No books match.</Typography>}

            <Box sx={gridSx}>
                {visible.map((book) => (
                    <BookCard
                        key={shelf.keyOf(book)}
                        book={book}
                        shelf={shelf}
                        editMode={editMode}
                        onChangeCover={openCoverPicker}
                        onEditTags={openTagEditor}
                        coverV={coverVersions[shelf.keyOf(book)]}
                    />
                ))}
            </Box>

            {tagTarget && (
                <CategoryEditor
                    book={tagTarget}
                    shelf={shelf}
                    options={categories}
                    onClose={() => setTagTarget(null)}
                    onSaved={handleTagsSaved}
                />
            )}

            {coverTarget && (
                <CoverPicker
                    name={coverTarget.name}
                    kind={shelf.kind}
                    search={(q) => fetchJson(`${shelf.apiRoot}/cover-search?q=${encodeURIComponent(q)}`)}
                    save={(url) => fetchJson(coverRoute, jsonBody('POST', { url }))}
                    remove={() => fetchJson(coverRoute, { method: 'DELETE' })}
                    onClose={() => setCoverTarget(null)}
                    onSaved={() => handleCoverSaved(coverKey)}
                />
            )}
        </Box>
    );
}

const Centered = ({ children }) => (
    <Grid container justifyContent="center" alignItems="center" sx={centeredSx}>
        {children}
    </Grid>
);
