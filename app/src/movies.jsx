import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CardMedia, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, Grid, IconButton, MenuItem, NativeSelect, TextField, Typography } from '@mui/material';
import LocalMovies from '@mui/icons-material/LocalMovies';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import EditIcon from '@mui/icons-material/Edit';
import EditOffIcon from '@mui/icons-material/EditOff';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageIcon from '@mui/icons-material/Image';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { cssVars } from './styles.jsx';
import MovieInfo from './movieInfo.jsx';
import CoverPicker from './coverPicker.jsx';

const BASE = process.env.BASE_HOST;
const API_ROOT = BASE + ':3000/api/v1/movie';
const COVER_ROOT = BASE + ':3000/api/v1/cover';
const CATEGORY_LIST = BASE + ':3000/api/v1/categories';

const getQueryParams = () => new URLSearchParams(window.location.search);

/* The two calls the shared cover picker needs. A search answers
   { results, provider, message } - message being a provider that replied with
   a complaint rather than posters - and a save hands the server the poster URL
   to fetch, so the cover folder stays the one place covers come from. */
const searchMovieCovers = (q) => fetch(`${API_ROOT}/cover-search?q=${encodeURIComponent(q)}`)
    .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
        return body;
    });

const setMovieCover = (id, url) => fetch(`${API_ROOT}/${encodeURIComponent(id)}/cover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
}).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
});

/* Hoisted out of the card. Emotion caches on object identity, so a literal
   written inside the component is re-serialised for every card on every render,
   and this grid runs to a thousand of them. */
const cardSx = { height: '100%', width: 200, display: 'flex', flexDirection: 'column', position: 'relative' };
const deleteButtonSx = {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#f44',
    '&:hover': { backgroundColor: 'rgba(0,0,0,0.85)' }
};
const coverButtonSx = {
    position: 'absolute',
    top: 4,
    left: 4,
    zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: cssVars.green,
    '&:hover': { backgroundColor: 'rgba(0,0,0,0.85)' }
};
// Over the cover, out of the way of the edit-mode buttons in the top corners.
const infoButtonSx = {
    position: 'absolute',
    bottom: 4,
    right: 4,
    zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: cssVars.green,
    '&:hover': { backgroundColor: 'rgba(0,0,0,0.85)' }
};
const coverBoxSx = { position: 'relative', height: 260 };
const cardFallbackSx = { height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const cardMediaSx = { height: 260 };
const cardContentSx = { py: 1 };
const cardTitleSx = { cursor: 'pointer' };
/* A plain wrapping flex row. MUI's Grid item resolves the theme and its
   breakpoints per child, and memoising the card cannot help because the Grid is
   the card's parent - it re-renders regardless. The cards are a fixed 200px, so
   wrapping is all the Grid was buying. */
const movieGridSx = { display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' };

/* The details modal: the cover down the left, the OMDb panel filling the rest,
   stacking on a narrow screen. */
const detailsBodySx = { display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' };
const detailsCoverSx = { width: 200, height: 300, objectFit: 'cover', borderRadius: 1, flexShrink: 0 };
const detailsCoverFallbackSx = { ...detailsCoverSx, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,255,0,0.08)' };
const detailsInfoSx = { flex: 1, minWidth: 240 };

/* Memoised: the page holds a dozen pieces of dialog state, and without this
   every keystroke in the parental or cover-search field re-rendered the whole
   grid. Its handler props have to keep their identity for that to hold. */
const coverUrlOf = (id, coverV) => `${COVER_ROOT}/${encodeURIComponent(id)}${coverV ? `?v=${coverV}` : ''}`;

const MovieCard = React.memo(function MovieCard({ id, title, editMode, onDelete, onChangeCover, onDetails, coverV }) {
    const [imgError, setImgError] = useState(false);
    const coverUrl = coverUrlOf(id, coverV);

    useEffect(() => { setImgError(false); }, [coverV]);

    return (
        <Card sx={cardSx}>
            {editMode && (
                <>
                    <IconButton
                        size="small"
                        onClick={() => onDelete({ id, title })}
                        title={`Delete ${title}`}
                        sx={deleteButtonSx}
                    >
                        <DeleteIcon fontSize="small"/>
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => onChangeCover({ id, title })}
                        title={`Change cover for ${title}`}
                        sx={coverButtonSx}
                    >
                        <ImageIcon fontSize="small"/>
                    </IconButton>
                </>
            )}
            <Box sx={coverBoxSx}>
                {imgError ? (
                    <Box sx={cardFallbackSx}>
                        <LocalMovies/>
                    </Box>
                ) : (
                    <CardMedia
                        component="img"
                        image={coverUrl}
                        alt={title}
                        sx={cardMediaSx}
                        onError={() => setImgError(true)}
                    />
                )}
                <IconButton
                    size="small"
                    onClick={() => onDetails({ id, title })}
                    title={`Details for ${title}`}
                    sx={infoButtonSx}
                >
                    <InfoOutlinedIcon fontSize="small"/>
                </IconButton>
            </Box>

            <CardContent sx={cardContentSx}>
                <Typography
                    component="a"
                    href={`#/play/${id}`}
                    variant="subtitle1"
                    sx={cardTitleSx}
                    noWrap
                    title={title}
                >
                    {title}
                </Typography>
            </CardContent>
        </Card>
    );
});

export default function Movies() {
    /* movies */
    const [movieList, setMovieList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');

    const [categories, setCategories] = useState([]);
    const [catError, setCatError] = useState(null);

    // Parental control states
    const [parentalUnlocked, setParentalUnlocked] = useState(false);
    const [showCodeDialog, setShowCodeDialog] = useState(false);
    const [codeInput, setCodeInput] = useState('');
    const [codeError, setCodeError] = useState(false);
    const SECRET_CODE = '1234'; // Secret parental code

    // Edit-mode states
    const [editMode, setEditMode] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState(null);

    // Details modal: { id, title } of the movie being looked at, or null.
    const [detailsTarget, setDetailsTarget] = useState(null);
    const [detailsCoverError, setDetailsCoverError] = useState(false);

    // Which movie's cover is being picked, and the bust values that make the
    // cards re-fetch a cover that has just been replaced at the same URL.
    const [coverTarget, setCoverTarget] = useState(null); // { id, title }
    const [coverVersions, setCoverVersions] = useState({}); // id -> bust value

    useEffect(() => {
        const query = getQueryParams();
        const qName = query.get('name') || '';
        const qCategory = query.get('category') || '';

        setSearch(qName);
        setCategory(qCategory);

        fetch(`${API_ROOT}?type=Movie&name=${qName}&category=${qCategory}`)
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then(data => {
                setMovieList(data?.rows);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        fetch(CATEGORY_LIST)
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then(list => setCategories(list))
            .catch(err => setCatError(err.message));
    }, []);

    const searchRef = useRef('');

    const handleCategoryChange = e => setCategory(e.target.value);

    const handleSearchSubmit = () => {
        const searchValue = searchRef.current.value; // Get value from ref
        const url = new URL(window.location);
        url.searchParams.set('name', searchValue);
        url.searchParams.set('category', category);
        window.history.pushState({}, '', url);

        setLoading(true);
        fetch(`${API_ROOT}?type=Movie&name=${searchValue}&category=${category}`)
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then(data => {
                setMovieList(data.rows);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    };

    const handleParentalToggle = () => {
        if (parentalUnlocked) {
            // Lock it back
            setParentalUnlocked(false);
        } else {
            // Show dialog to unlock
            setShowCodeDialog(true);
            setCodeInput('');
            setCodeError(false);
        }
    };

    const handleCodeSubmit = () => {
        if (codeInput === SECRET_CODE) {
            setParentalUnlocked(true);
            setShowCodeDialog(false);
            setCodeInput('');
            setCodeError(false);
        } else {
            setCodeError(true);
        }
    };

    // A state setter, so the memoised cards never see a new handler.
    const openCoverPicker = useCallback(({ id, title }) => setCoverTarget({ id, title }), []);

    // A state setter, so the memoised cards never see a new handler.
    const openDetails = useCallback(({ id, title }) => {
        setDetailsCoverError(false);
        setDetailsTarget({ id, title });
    }, []);

    const handleConfirmDelete = () => {
        if (!deleteTarget) return;
        const { id } = deleteTarget;
        setDeleting(true);
        setDeleteError(null);
        fetch(`${API_ROOT}/${encodeURIComponent(id)}`, { method: 'DELETE' })
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then(() => {
                setMovieList(list => list.filter(m => m.id !== id));
                setDeleting(false);
                setDeleteTarget(null);
            })
            .catch(err => {
                setDeleteError(err.message);
                setDeleting(false);
            });
    };

    // Filter movies based on parental control
    const filteredMovies = parentalUnlocked 
        ? movieList 
        : movieList.filter(movie => movie.rating !== 'R');

    if (loading) return <Centered><CircularProgress sx={{ color: cssVars.green }}/></Centered>;
    if (error) return <Centered><Alert severity="error">Load error – {error}</Alert></Centered>;

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            {/* Parental Control Dialog */}
            <Dialog open={showCodeDialog} onClose={() => setShowCodeDialog(false)}>
                <DialogTitle>Enter Parental Control Code</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Secret Code"
                        type="password"
                        fullWidth
                        variant="standard"
                        value={codeInput}
                        onChange={(e) => setCodeInput(e.target.value)}
                        error={codeError}
                        helperText={codeError ? 'Incorrect code' : ''}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleCodeSubmit();
                            }
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowCodeDialog(false)}>Cancel</Button>
                    <Button onClick={handleCodeSubmit}>Unlock</Button>
                </DialogActions>
            </Dialog>

            {/* search bar + category select */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, width: '100%', maxWidth: 900 }}>
                <TextField
                    label="Search by Movie Name"
                    variant="standard"
                    inputRef={searchRef} // Assign ref here
                    defaultValue={search} // To preserve initial value from query params
                    sx={{ width: '45%', mr: 2 }}
                />;

                <FormControl variant="standard" label="Category" sx={{ width: '45%', marginTop: '15px' }}>
                    <NativeSelect value={category} onChange={handleCategoryChange} label="Category">
                        {/* default blank option */}
                        <MenuItem value=""><em>All</em></MenuItem>

                        {categories.map(cat => (
                            <option key={cat.name} value={cat.name}>{cat.name}</option>
                        ))}
                    </NativeSelect>
                </FormControl>

                <Button variant="contained" sx={{ alignSelf: 'center' }} onClick={handleSearchSubmit}>
                    Search
                </Button>

                <IconButton
                    onClick={handleParentalToggle}
                    sx={{ ml: 2 }}
                    color={parentalUnlocked ? 'success' : 'default'}
                    title={parentalUnlocked ? 'Lock Parental Controls' : 'Unlock Parental Controls'}
                >
                    {parentalUnlocked ? <LockOpenIcon /> : <LockIcon />}
                </IconButton>

                <IconButton
                    onClick={() => setEditMode(v => !v)}
                    sx={{ ml: 1 }}
                    color={editMode ? 'error' : 'default'}
                    title={editMode ? 'Exit edit mode' : 'Edit (delete movies)'}
                >
                    {editMode ? <EditOffIcon/> : <EditIcon/>}
                </IconButton>
            </Box>

            {/* Delete confirmation dialog */}
            <Dialog open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)}>
                <DialogTitle>Delete movie?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Permanently delete "{deleteTarget?.title}" and remove its file from disk? This cannot be undone.
                    </DialogContentText>
                    {deleteError && (
                        <Alert severity="error" sx={{ mt: 2 }}>Delete failed – {deleteError}</Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button disabled={deleting} onClick={() => setDeleteTarget(null)}>Cancel</Button>
                    <Button disabled={deleting} color="error" onClick={handleConfirmDelete}>
                        {deleting ? 'Deleting…' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Details modal: the cover plus everything OMDb had on the title */}
            <Dialog open={!!detailsTarget} onClose={() => setDetailsTarget(null)} maxWidth="md" fullWidth>
                <DialogTitle>{detailsTarget?.title}</DialogTitle>
                <DialogContent>
                    {detailsTarget && (
                        <Box sx={detailsBodySx}>
                            {detailsCoverError ? (
                                <Box sx={detailsCoverFallbackSx}><LocalMovies/></Box>
                            ) : (
                                <Box
                                    component="img"
                                    src={coverUrlOf(detailsTarget.id, coverVersions[detailsTarget.id])}
                                    alt={detailsTarget.title}
                                    sx={detailsCoverSx}
                                    onError={() => setDetailsCoverError(true)}
                                />
                            )}
                            <Box sx={detailsInfoSx}>
                                <MovieInfo id={detailsTarget.id} flush/>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button component="a" href={`#/play/${detailsTarget?.id}`}>Play ▶</Button>
                    <Button onClick={() => setDetailsTarget(null)}>Close</Button>
                </DialogActions>
            </Dialog>

            {coverTarget && (
                <CoverPicker
                    name={coverTarget.title}
                    kind="movie"
                    search={searchMovieCovers}
                    save={(url) => setMovieCover(coverTarget.id, url)}
                    onClose={() => setCoverTarget(null)}
                    onSaved={() => setCoverVersions((v) => ({ ...v, [coverTarget.id]: Date.now() }))}
                />
            )}

            {/* error fetching categories (non-fatal) */}
            {catError && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Couldn’t load category list – showing none ({catError})
                </Alert>
            )}

            {/* movie grid */}
            <Box sx={movieGridSx}>
                {filteredMovies.map(({ name, id }) => (
                    <MovieCard
                        key={id}
                        id={id}
                        title={name}
                        editMode={editMode}
                        onDelete={setDeleteTarget}
                        onChangeCover={openCoverPicker}
                        onDetails={openDetails}
                        coverV={coverVersions[id]}
                    />
                ))}
            </Box>

            {/* Show message if content is filtered */}
            {!parentalUnlocked && movieList.length > filteredMovies.length && (
                <Typography variant="caption" sx={{ mt: 2, color: 'text.secondary' }}>
                    Some content is hidden due to parental controls
                </Typography>
            )}
        </div>
    );
}

const Centered = ({ children }) => (
    <Grid container justifyContent="center" alignItems="center" sx={{ mt: 8 }}>
        {children}
    </Grid>
);
