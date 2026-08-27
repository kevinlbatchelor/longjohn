import React, { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CardMedia, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, Grid, IconButton, MenuItem, NativeSelect, TextField, Typography } from '@mui/material';
import LocalMovies from '@mui/icons-material/LocalMovies';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import EditIcon from '@mui/icons-material/Edit';
import EditOffIcon from '@mui/icons-material/EditOff';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageIcon from '@mui/icons-material/Image';
import { cssVars } from './styles.jsx';

const BASE = process.env.BASE_HOST;
const API_ROOT = BASE + ':3000/api/v1/movie';
const COVER_ROOT = BASE + ':3000/api/v1/cover';
const CATEGORY_LIST = BASE + ':3000/api/v1/categories';

const getQueryParams = () => new URLSearchParams(window.location.search);

function MovieCard({ id, title, editMode, onDelete, onChangeCover, coverV }) {
    const [imgError, setImgError] = useState(false);
    const coverUrl = `${COVER_ROOT}/${encodeURIComponent(id)}${coverV ? `?v=${coverV}` : ''}`;

    useEffect(() => { setImgError(false); }, [coverV]);

    return (
        <Card sx={{ height: '100%', width: 200, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {editMode && (
                <>
                    <IconButton
                        size="small"
                        onClick={() => onDelete({ id, title })}
                        title={`Delete ${title}`}
                        sx={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            zIndex: 2,
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            color: '#f44',
                            '&:hover': { backgroundColor: 'rgba(0,0,0,0.85)' }
                        }}
                    >
                        <DeleteIcon fontSize="small"/>
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => onChangeCover({ id, title })}
                        title={`Change cover for ${title}`}
                        sx={{
                            position: 'absolute',
                            top: 4,
                            left: 4,
                            zIndex: 2,
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            color: cssVars.green,
                            '&:hover': { backgroundColor: 'rgba(0,0,0,0.85)' }
                        }}
                    >
                        <ImageIcon fontSize="small"/>
                    </IconButton>
                </>
            )}
            {imgError ? (
                <Box sx={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <LocalMovies/>
                </Box>
            ) : (
                <CardMedia
                    component="img"
                    image={coverUrl}
                    alt={title}
                    sx={{ height: 260 }}
                    onError={() => setImgError(true)}
                />
            )}

            <CardContent sx={{ py: 1 }}>
                <Typography
                    component="a"
                    href={`#/play/${id}`}
                    variant="subtitle1"
                    sx={{ cursor: 'pointer' }}
                    noWrap
                    title={title}
                >
                    {title}
                </Typography>
            </CardContent>
        </Card>
    );
}

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

    // Cover-picker states
    const [coverTarget, setCoverTarget] = useState(null);
    const [coverQuery, setCoverQuery] = useState('');
    const [coverResults, setCoverResults] = useState([]);
    const [coverProvider, setCoverProvider] = useState(null);
    const [coverSearching, setCoverSearching] = useState(false);
    const [coverError, setCoverError] = useState(null);
    const [coverSaving, setCoverSaving] = useState(null); // result.id being saved
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

    const openCoverPicker = ({ id, title }) => {
        setCoverTarget({ id, title });
        setCoverQuery(title);
        setCoverResults([]);
        setCoverError(null);
        setCoverSaving(null);
        runCoverSearch(title);
    };

    const runCoverSearch = (q) => {
        const query = (q ?? coverQuery).trim();
        if (!query) {
            setCoverResults([]);
            return;
        }
        setCoverSearching(true);
        setCoverError(null);
        fetch(`${API_ROOT}/cover-search?q=${encodeURIComponent(query)}`)
            .then(async r => {
                const body = await r.json().catch(() => ({}));
                if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
                return body;
            })
            .then(body => {
                setCoverResults(body.results || []);
                setCoverProvider(body.provider || null);
                if (body.message) setCoverError(body.message);
                setCoverSearching(false);
            })
            .catch(err => {
                setCoverError(err.message);
                setCoverSearching(false);
            });
    };

    const handlePickCover = (result) => {
        if (!coverTarget) return;
        const { id } = coverTarget;
        setCoverSaving(result.id);
        setCoverError(null);
        fetch(`${API_ROOT}/${encodeURIComponent(id)}/cover`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: result.poster })
        })
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then(() => {
                setCoverVersions(v => ({ ...v, [id]: Date.now() }));
                setCoverSaving(null);
                setCoverTarget(null);
            })
            .catch(err => {
                setCoverError(err.message);
                setCoverSaving(null);
            });
    };

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

            {/* Cover picker dialog */}
            <Dialog
                open={!!coverTarget}
                onClose={() => !coverSaving && setCoverTarget(null)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Change cover – {coverTarget?.title}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        <TextField
                            autoFocus
                            fullWidth
                            variant="standard"
                            label={`Search ${coverProvider === 'both' ? 'TMDb + OMDb' : coverProvider === 'tmdb' ? 'TMDb' : 'OMDb'}`}
                            value={coverQuery}
                            onChange={(e) => setCoverQuery(e.target.value)}
                            onKeyPress={(e) => { if (e.key === 'Enter') runCoverSearch(); }}
                        />
                        <Button onClick={() => runCoverSearch()} disabled={coverSearching}>
                            {coverSearching ? '…' : 'Search'}
                        </Button>
                    </Box>

                    {coverError && (
                        <Alert severity="error" sx={{ mb: 2 }}>{coverError}</Alert>
                    )}

                    {coverSearching ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress sx={{ color: cssVars.green }}/>
                        </Box>
                    ) : (
                        <Grid container spacing={2}>
                            {coverResults.map(r => (
                                <Grid item key={`${r.source || ''}-${r.type || ''}-${r.id}`} xs={6} sm={4} md={3}>
                                    <Card
                                        onClick={() => !coverSaving && handlePickCover(r)}
                                        sx={{
                                            cursor: coverSaving ? 'wait' : 'pointer',
                                            opacity: coverSaving && coverSaving !== r.id ? 0.4 : 1,
                                            position: 'relative'
                                        }}
                                    >
                                        {r.source && (
                                            <Box sx={{
                                                position: 'absolute',
                                                top: 4,
                                                left: 4,
                                                px: 0.75,
                                                py: 0.1,
                                                borderRadius: 0.5,
                                                fontSize: 10,
                                                fontFamily: '"Source Code Pro", monospace',
                                                color: cssVars.green,
                                                backgroundColor: 'rgba(0,0,0,0.7)',
                                                zIndex: 1
                                            }}>
                                                {r.source.toUpperCase()}
                                            </Box>
                                        )}
                                        <CardMedia
                                            component="img"
                                            image={r.poster}
                                            alt={r.title}
                                            sx={{ height: 220 }}
                                        />
                                        {coverSaving === r.id && (
                                            <Box sx={{
                                                position: 'absolute', inset: 0,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                backgroundColor: 'rgba(0,0,0,0.6)'
                                            }}>
                                                <CircularProgress size={28} sx={{ color: cssVars.green }}/>
                                            </Box>
                                        )}
                                        <CardContent sx={{ py: 1 }}>
                                            <Typography variant="caption" noWrap title={`${r.title} (${r.year})`}>
                                                {r.title} ({r.year})
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                            {!coverSearching && coverResults.length === 0 && coverQuery && (
                                <Grid item xs={12}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        No results.
                                    </Typography>
                                </Grid>
                            )}
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'space-between' }}>
                    {(coverProvider === 'tmdb' || coverProvider === 'both') ? (
                        <Typography variant="caption" sx={{ color: 'text.secondary', pl: 2 }}>
                            This product uses the TMDb API but is not endorsed or certified by TMDb.
                        </Typography>
                    ) : <span/>}
                    <Button disabled={!!coverSaving} onClick={() => setCoverTarget(null)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* error fetching categories (non-fatal) */}
            {catError && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Couldn’t load category list – showing none ({catError})
                </Alert>
            )}

            {/* movie grid */}
            <Grid container spacing={2} style={{ justifyContent: 'center' }}>
                {filteredMovies.map(({ name, id }) => (
                    <Grid item key={id} xs={12} sm={6} md={3} >
                        <MovieCard
                            id={id}
                            title={name}
                            editMode={editMode}
                            onDelete={setDeleteTarget}
                            onChangeCover={openCoverPicker}
                            coverV={coverVersions[id]}
                        />
                    </Grid>
                ))}
            </Grid>

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
