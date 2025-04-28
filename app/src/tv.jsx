/* TV.jsx ------------------------------------------------------------------- */
import React, { useEffect, useState } from 'react';
import {
    Box, Grid, Card, CardMedia, CardContent, Typography, Collapse,
    IconButton, CircularProgress, Alert, List, ListItemButton, ListItemText
} from '@mui/material';
import LiveTvIcon          from '@mui/icons-material/LiveTv';
import ExpandMoreIcon      from '@mui/icons-material/ExpandMore';
import { styled }          from '@mui/material/styles';

const API_ROOT   = 'http://192.168.1.12:3000/api/v1/tv?category=TV&name=%';     // ← endpoint that returns the JSON shown
const COVER_ROOT = 'http://192.168.1.12:3000/api/v1/cover';

/* -------------------------------------------------------------------------- */
/* little helper so the expand icon rotates                                    */
const ExpandMore = styled(IconButton, {
    shouldForwardProp: (prop) => prop !== 'expand'
})(({ expand }) => ({
    transform: expand ? 'rotate(180deg)' : 'rotate(0deg)',
    transition: 'transform 0.2s'
}));

/* -------------------------------------------------------------------------- */
/* card for ONE show – internally manages its “open/closed” state             */
function ShowCard({ show }) {
    const [open, setOpen] = useState(false);
    const [imgError, setImgError] = useState(false);

    /* cover: try first episode’s ID, fall back to icon if it 404s */
    const firstEpId = show.episodes[0]?.name;
    const coverUrl  = `${COVER_ROOT}/${encodeURIComponent(firstEpId)}`;

    return (
        <Card sx={{ width: 240, background: '#111', display: 'flex', flexDirection: 'column' }}>
            {/* thumbnail ----------------------------------------------------------- */}
            {imgError ? (
                <Box sx={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <LiveTvIcon/>
                </Box>
            ) : (
                <CardMedia
                    component="img"
                    image={coverUrl}
                    alt={show.name}
                    sx={{ height: 260 }}
                    onError={() => setImgError(true)}
                />
            )}

            {/* title + expand icon ------------------------------------------------- */}
            <CardContent
                sx={{
                    py: 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer'
                }}
                onClick={() => setOpen(!open)}
            >
                <Typography variant="subtitle1" noWrap sx={{  mr: 1 }}>
                    {show.name}
                </Typography>
                <ExpandMore
                    expand={open ? 1 : 0}
                    onClick={() => setOpen(!open)}
                    aria-label="show episodes"
                >
                    <ExpandMoreIcon />
                </ExpandMore>
            </CardContent>

            {/* episode list -------------------------------------------------------- */}
            <Collapse in={open} timeout="auto" unmountOnExit>
                <List dense disablePadding sx={{ background: '#000' }}>
                    {show.episodes
                        .slice()                      // shallow-copy so we can sort
                        .sort((a, b) => a.episode.localeCompare(b.episode, undefined, { numeric: true }))
                        .map((ep) => (
                            <ListItemButton
                                key={ep.id}
                                component="a"
                                href={`#/play/${ep.id}`}
                                sx={{ pl: 2 }}
                            >
                                <ListItemText
                                    primary={ep.episode}
                                    primaryTypographyProps={{ noWrap: true, sx: { color: '#0f0' } }}
                                />
                            </ListItemButton>
                        ))}
                </List>
            </Collapse>
        </Card>
    );
}

/* -------------------------------------------------------------------------- */
/* top-level grid of shows                                                    */
export default function TV() {
    console.log('------->LOADING  TV', );
    const [shows,   setShows]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);

    useEffect(() => {
        fetch(API_ROOT)
            .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
            .then((data) => { setShows(data.rows); setLoading(false); })
            .catch((err) => { setError(err.message); setLoading(false); });
    }, []);

    if (loading) return <Centered><CircularProgress sx={{ color: '#0f0' }} /></Centered>;
    if (error)   return <Centered><Alert severity="error">Load error – {error}</Alert></Centered>;

    return (
        <Box sx={{ flex: 1, py: 3, px: 1, display: 'flex', justifyContent: 'center' }}>
            <Grid container spacing={2} sx={{ maxWidth: 1200 }}>
                {shows.map((show) => (
                    <Grid item key={show.name} xs={12} sm={6} md={3}>
                        <ShowCard show={show} />
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
}

/* helper – same as the other pages */
const Centered = ({ children }) => (
    <Grid container justifyContent="center" alignItems="center" sx={{ mt: 8 }}>
        {children}
    </Grid>
);
