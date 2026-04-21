import React, { useEffect, useState } from 'react';
import {
    Box, Grid, Card, CardMedia, CardContent, Typography,
    IconButton, CircularProgress, Alert, List, ListItemButton, ListItemText,
    Dialog, DialogActions, DialogContent, DialogTitle, TextField, Button
} from '@mui/material';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';

const BASE = process.env.BASE_HOST;
const API_ROOT = BASE + ':3000/api/v1/tv?category=TV&name=%';
const COVER_ROOT = BASE + ':3000/api/v1/cover';

function ShowCard({ show, parentalUnlocked }) {
    const [ dialogOpen, setDialogOpen ] = useState(false);
    const [ imgError, setImgError ] = useState(false);

    const firstEpId = show.episodes[0]?.name;
    const coverUrl = `${COVER_ROOT}/${encodeURIComponent(firstEpId)}`;

    const filteredEpisodes = parentalUnlocked
        ? show.episodes
        : show.episodes.filter(ep => ep.rating !== 'R');

    if (filteredEpisodes.length === 0) return null;

    const sortedEpisodes = filteredEpisodes
        .slice()
        .sort((a, b) => a.episode.localeCompare(b.episode, undefined, { numeric: true }));

    return (
        <>
            <Card
                sx={{ width: 200, display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
                onClick={() => setDialogOpen(true)}
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

            <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                scroll="paper"
            >
                <DialogTitle>{show.name}</DialogTitle>
                <DialogContent dividers sx={{ p: 0, background: '#000' }}>
                    <List dense disablePadding>
                        {sortedEpisodes.map((ep, idx, arr) => {
                            const match = ep.episode.match(/([Ss]\d{2}[Ee]\d{2})/);
                            const label = match ? match[1] : ep.episode;
                            const queue = arr.slice(idx + 1).map(e => e.id + ':' + e.episode).join(',');

                            return (
                                <ListItemButton
                                    key={ep.id}
                                    component="a"
                                    href={`#/play/${ep.id}${queue ? `?queue=${queue}&name=${ep?.name}` : ''}`}
                                    sx={{ pl: 2 }}
                                    onClick={() => setDialogOpen(false)}
                                >
                                    <ListItemText
                                        primary={label}
                                        primaryTypographyProps={{ noWrap: true, sx: { color: '#0f0' } }}
                                    />
                                </ListItemButton>
                            );
                        })}
                    </List>
                    {!parentalUnlocked && show.episodes.length > filteredEpisodes.length && (
                        <Typography variant="caption" sx={{ p: 1, color: 'text.secondary', display: 'block', textAlign: 'center' }}>
                            Some episodes hidden
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

export default function TV() {
    const [ shows, setShows ] = useState([]);
    const [ loading, setLoading ] = useState(true);
    const [ error, setError ] = useState(null);

    // Parental control states
    const [ parentalUnlocked, setParentalUnlocked ] = useState(false);
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