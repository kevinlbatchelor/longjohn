import React, { useEffect, useState } from 'react';
import {
    Grid, Card, CardMedia, CardContent, Typography, CircularProgress, Alert,
    Box, TextField, Select, MenuItem, InputLabel, FormControl, Button
} from '@mui/material';
import LocalMovies from '@mui/icons-material/LocalMovies';

const API_ROOT      = 'http://192.168.1.12:3000/api/v1/movie';
const COVER_ROOT    = 'http://192.168.1.12:3000/api/v1/cover';
const CATEGORY_LIST = 'http://192.168.1.12:3000/api/v1/categories';

const getQueryParams = () => new URLSearchParams(window.location.search);

/* --------------------------------- cards ---------------------------------- */
function MovieCard({ id, title }) {
    const [imgError, setImgError] = useState(false);
    const coverUrl = `${COVER_ROOT}/${encodeURIComponent(id)}`;

    return (
        <Card sx={{ height: '100%', width: 200, display: 'flex', flexDirection: 'column' }}>
            {imgError ? (
                <Box sx={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <LocalMovies />
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

/* --------------------------------- grid ----------------------------------- */
export default function Movies() {
    /* movies */
    const [movieList, setMovieList] = useState([]);
    const [loading,   setLoading]   = useState(true);
    const [error,     setError]     = useState(null);

    /* search / filter */
    const [search,   setSearch]   = useState('');
    const [category, setCategory] = useState('');

    /* categories for the <Select> */
    const [categories, setCategories] = useState([]);        // ← NEW
    const [catError,   setCatError]   = useState(null);      // optional: show separate error

    /* ------------ fetch movies once on mount (URL params honoured) ---------- */
    useEffect(() => {
        const query     = getQueryParams();
        const qName     = query.get('name')     || '';
        const qCategory = query.get('category') || '';

        setSearch(qName);
        setCategory(qCategory);

        fetch(`${API_ROOT}?type=Movie&name=${qName}&category=${qCategory}`)
            .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
            .then(data => { setMovieList(data?.rows); setLoading(false); })
            .catch(err => { setError(err.message);   setLoading(false); });
    }, []);

    /* ------------ fetch category list once on mount ------------------------- */
    useEffect(() => {
        fetch(CATEGORY_LIST)
            .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
            .then(list => setCategories(list))      // assume API returns ["Action", "Comedy", …]
            .catch(err => setCatError(err.message));
    }, []);

    /* handlers --------------------------------------------------------------- */
    const handleSearchChange   = e => setSearch(e.target.value);
    const handleCategoryChange = e => setCategory(e.target.value);

    const handleSearchSubmit = () => {
        const url = new URL(window.location);
        url.searchParams.set('name',     search);
        url.searchParams.set('category', category);
        window.history.pushState({}, '', url);

        setLoading(true);
        fetch(`${API_ROOT}?type=Movie&name=${search}&category=${category}`)
            .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
            .then(data => { setMovieList(data.rows); setLoading(false); })
            .catch(err => { setError(err.message);   setLoading(false); });
    };

    /* ------------------------- render -------------------------------------- */
    if (loading) return <Centered><CircularProgress sx={{ color: '#0f0' }} /></Centered>;
    if (error)   return <Centered><Alert severity="error">Load error – {error}</Alert></Centered>;

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            {/* search bar + category select */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, width: '100%', maxWidth: 900 }}>
                <TextField
                    label="Search by Movie Name"
                    variant="outlined"
                    value={search}
                    onChange={handleSearchChange}
                    sx={{ width: '45%', mr: 2 }}
                />

                <FormControl variant="outlined" sx={{ width: '45%', mr: 2 }}>
                    <InputLabel>Category</InputLabel>
                    <Select value={category} onChange={handleCategoryChange} label="Category">
                        {/* default blank option */}
                        <MenuItem value=""><em>All</em></MenuItem>

                        {/* dynamic list — if it fails to load, fall back to nothing */}
                        {categories.map(cat => (
                            <MenuItem key={cat.name} value={cat.name}>{cat.name}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <Button variant="contained" sx={{ alignSelf: 'center' }} onClick={handleSearchSubmit}>
                    Search
                </Button>
            </Box>

            {/* error fetching categories (non-fatal) */}
            {catError && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Couldn’t load category list – showing none ({catError})
                </Alert>
            )}

            {/* movie grid */}
            <Grid container spacing={2}>
                {movieList.map(({ name, id }) => (
                    <Grid item key={id} xs={12} sm={6} md={3}>
                        <MovieCard id={id} title={name} />
                    </Grid>
                ))}
            </Grid>
        </div>
    );
}

/* center helper */
const Centered = ({ children }) => (
    <Grid container justifyContent="center" alignItems="center" sx={{ mt: 8 }}>
        {children}
    </Grid>
);
