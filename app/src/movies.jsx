import React, { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CardMedia, CircularProgress, FormControl, Grid, MenuItem, NativeSelect, TextField, Typography } from '@mui/material';
import LocalMovies from '@mui/icons-material/LocalMovies';
import { cssVars } from './styles.jsx';

const BASE = process.env.BASE_HOST;
const API_ROOT = BASE + ':3000/api/v1/movie';
const COVER_ROOT = BASE + ':3000/api/v1/cover';
const CATEGORY_LIST = BASE + ':3000/api/v1/categories';

const getQueryParams = () => new URLSearchParams(window.location.search);

function MovieCard({ id, title }) {
    const [imgError, setImgError] = useState(false);
    const coverUrl = `${COVER_ROOT}/${encodeURIComponent(id)}`;

    return (
        <Card sx={{ height: '100%', width: 200, display: 'flex', flexDirection: 'column' }}>
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

    if (loading) return <Centered><CircularProgress sx={{ color: cssVars.green }}/></Centered>;
    if (error) return <Centered><Alert severity="error">Load error – {error}</Alert></Centered>;

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
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
                        <MovieCard id={id} title={name}/>
                    </Grid>
                ))}
            </Grid>
        </div>
    );
}

const Centered = ({ children }) => (
    <Grid container justifyContent="center" alignItems="center" sx={{ mt: 8 }}>
        {children}
    </Grid>
);
