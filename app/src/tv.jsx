import React, { useEffect, useState } from 'react';
import {
    Box, Grid, Card, CardMedia, CardContent, Typography, Collapse,
    IconButton, CircularProgress, Alert, List, ListItemButton, ListItemText
} from '@mui/material';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { styled } from '@mui/material/styles';

const BASE = process.env.BASE_HOST;
const API_ROOT = BASE + ':3000/api/v1/tv?category=TV&name=%';
const COVER_ROOT = BASE + ':3000/api/v1/cover';

/* little helper so the expand icon rotates                                    */
const ExpandMore = styled(IconButton, {
    shouldForwardProp: (prop) => prop !== 'expand'
})(({ expand }) => ({
    transform: expand ? 'rotate(180deg)' : 'rotate(0deg)',
    transition: 'transform 0.2s'
}));

/* card for ONE show – internally manages its “open/closed” state             */
function ShowCard({ show }) {
    const [ open, setOpen ] = useState(false);
    const [ imgError, setImgError ] = useState(false);

    /* cover: try first episode’s ID, fall back to icon if it 404s */
    const firstEpId = show.episodes[0]?.name;
    const coverUrl = `${COVER_ROOT}/${encodeURIComponent(firstEpId)}`;

    return (
        <Card sx={{ width: 200, display: 'flex', flexDirection: 'column' }}>
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
                <Typography variant="subtitle1" noWrap sx={{ mr: 1 }}>
                    {show.name}
                </Typography>
                <ExpandMore
                    expand={open ? 1 : 0}
                    onClick={() => setOpen(!open)}
                    aria-label="show episodes"
                >
                    <ExpandMoreIcon/>
                </ExpandMore>
            </CardContent>

            <Collapse in={open} timeout="auto" unmountOnExit>
                <List dense disablePadding sx={{ background: '#000' }}>
                    {show.episodes
                        .slice()                      // shallow-copy so we can sort
                        .sort((a, b) => a.episode.localeCompare(b.episode, undefined, { numeric: true }))
                        .map((ep, idx, arr) => {

                            const queue = arr.slice(idx + 1).map(e => {
                                const queItem = e.id +':'+ e.episode;
                                return queItem;
                            }).join(',');

                            return (
                                <ListItemButton
                                    key={ep.id}
                                    component="a"
                                    href={`#/play/${ep.id}${queue ? `?queue=${queue}&name=${ep?.name}` : ''}`}
                                    sx={{ pl: 2 }}
                                >
                                    <ListItemText
                                        primary={ep.episode}
                                        primaryTypographyProps={{ noWrap: true, sx: { color: '#0f0' } }}
                                    />
                                </ListItemButton>
                            );
                        })
                    }
                </List>
            </Collapse>
        </Card>
    );
}

export default function TV() {
    const [ shows, setShows ] = useState([]);
    const [ loading, setLoading ] = useState(true);
    const [ error, setError ] = useState(null);

    useEffect(() => {
        fetch(API_ROOT)
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then((data) => {
                setShows(data.rows);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    if (loading) return <Centered><CircularProgress sx={{ color: '#0f0' }}/></Centered>;
    if (error) return <Centered><Alert severity="error">Load error – {error}</Alert></Centered>;

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <Grid container spacing={2} style={{ justifyContent: 'center' }}>
                {shows.map((show) => (
                    <Grid item key={show.name} xs={12} sm={6} md={3}>
                        <ShowCard show={show}/>
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
