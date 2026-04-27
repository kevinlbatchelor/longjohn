import React, { useEffect, useState } from 'react';
import {
    Box, Grid, Card, CardMedia, CardContent, Typography,
    IconButton, CircularProgress, Alert,
    Dialog, DialogActions, DialogContent, DialogTitle, TextField, Button
} from '@mui/material';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const BASE = process.env.BASE_HOST;
const API_ROOT = BASE + ':3000/api/v1/tv?category=TV&name=%';
const COVER_ROOT = BASE + ':3000/api/v1/cover';

const PARENTAL_KEY = 'parentalUnlocked';

function ShowCard({ show, parentalUnlocked }) {
    const [ imgError, setImgError ] = useState(false);

    const firstEpId = show.episodes[0]?.name;
    const coverUrl = `${COVER_ROOT}/${encodeURIComponent(firstEpId)}`;

    const filteredEpisodes = parentalUnlocked
        ? show.episodes
        : show.episodes.filter(ep => ep.rating !== 'R');

    if (filteredEpisodes.length === 0) return null;

    return (
        <Card
            component="a"
            href={`#/show/${encodeURIComponent(show.name)}`}
            sx={{
                width: 200,
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                textDecoration: 'none'
            }}
        >
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
            <CardContent sx={{ py: 1 }}>
                <Typography variant="subtitle1" noWrap>
                    {show.name}
                </Typography>
            </CardContent>
        </Card>
    );
}

export function ShowEpisodes({ name }) {
    const [ show, setShow ] = useState(null);
    const [ loading, setLoading ] = useState(true);
    const [ error, setError ] = useState(null);
    const parentalUnlocked = sessionStorage.getItem(PARENTAL_KEY) === '1';

    useEffect(() => {
        fetch(API_ROOT)
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then((data) => {
                const found = data.rows.find((s) => s.name === name);
                setShow(found || null);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    }, [name]);

    if (loading) return <Centered><CircularProgress sx={{ color: '#0f0' }}/></Centered>;
    if (error) return <Centered><Alert severity="error">Load error – {error}</Alert></Centered>;
    if (!show) return <Centered><Alert severity="warning">Show not found</Alert></Centered>;

    const filteredEpisodes = parentalUnlocked
        ? show.episodes
        : show.episodes.filter(ep => ep.rating !== 'R');

    const sortedEpisodes = filteredEpisodes
        .slice()
        .sort((a, b) => a.episode.localeCompare(b.episode, undefined, { numeric: true }));

    return (
        <Box sx={{ p: 2, width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                <Button
                    href="#/tv"
                    startIcon={<ArrowBackIcon sx={{ fontSize: 32 }}/>}
                    sx={{
                        color: '#0f0',
                        fontSize: '1.25rem',
                        minHeight: 64,
                        minWidth: 140,
                        border: '2px solid #0f0'
                    }}
                >
                    Back
                </Button>
                <Typography variant="h4" sx={{ color: '#0f0' }}>
                    {show.name}
                </Typography>
            </Box>

            <Grid container spacing={2} justifyContent="center">
                {sortedEpisodes.map((ep, idx, arr) => {
                    const match = ep.episode.match(/([Ss]\d{2}[Ee]\d{2})/);
                    const label = match ? match[1] : ep.episode;
                    const queue = arr.slice(idx + 1).map(e => e.id + ':' + e.episode).join(',');

                    return (
                        <Grid item key={ep.id} xs={6} sm={4} md={3} lg={2}>
                            <Card
                                component="a"
                                href={`#/play/${ep.id}${queue ? `?queue=${queue}&name=${ep?.name}` : ''}`}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: 110,
                                    cursor: 'pointer',
                                    border: '2px solid #0f0',
                                    backgroundColor: '#000',
                                    textDecoration: 'none',
                                    '&:hover': { backgroundColor: '#003300' }
                                }}
                            >
                                <Typography variant="h5" sx={{ color: '#0f0' }}>
                                    {label}
                                </Typography>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>

            {!parentalUnlocked && show.episodes.length > filteredEpisodes.length && (
                <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 3, color: 'text.secondary' }}>
                    Some episodes hidden
                </Typography>
            )}
        </Box>
    );
}

export default function TV() {
    const [ shows, setShows ] = useState([]);
    const [ loading, setLoading ] = useState(true);
    const [ error, setError ] = useState(null);

    // Parental control states
    const [ parentalUnlocked, setParentalUnlocked ] = useState(
        () => sessionStorage.getItem(PARENTAL_KEY) === '1'
    );
    const [ showCodeDialog, setShowCodeDialog ] = useState(false);
    const [ codeInput, setCodeInput ] = useState('');
    const [ codeError, setCodeError ] = useState(false);
    const SECRET_CODE = '1234'; // Secret parental code

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

    const handleParentalToggle = () => {
        if (parentalUnlocked) {
            sessionStorage.removeItem(PARENTAL_KEY);
            setParentalUnlocked(false);
        } else {
            setShowCodeDialog(true);
            setCodeInput('');
            setCodeError(false);
        }
    };

    const handleCodeSubmit = () => {
        if (codeInput === SECRET_CODE) {
            sessionStorage.setItem(PARENTAL_KEY, '1');
            setParentalUnlocked(true);
            setShowCodeDialog(false);
            setCodeInput('');
            setCodeError(false);
        } else {
            setCodeError(true);
        }
    };

    if (loading) return <Centered><CircularProgress sx={{ color: '#0f0' }}/></Centered>;
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

            {/* Parental Control Lock/Unlock Button */}
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end', mb: 2, maxWidth: 900 }}>
                <IconButton
                    onClick={handleParentalToggle}
                    color={parentalUnlocked ? 'success' : 'default'}
                    title={parentalUnlocked ? 'Lock Parental Controls' : 'Unlock Parental Controls'}
                >
                    {parentalUnlocked ? <LockOpenIcon/> : <LockIcon/>}
                </IconButton>
            </Box>

            <Grid container spacing={2} style={{ justifyContent: 'center' }}>
                {shows.map((show) => (
                    <Grid item key={show.name} xs={12} sm={6} md={3}>
                        <ShowCard show={show} parentalUnlocked={parentalUnlocked}/>
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
