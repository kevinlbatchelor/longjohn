/* Admin.jsx --------------------------------------------------------------- */
import React, { useState } from 'react';
import {
    Box, Paper, Typography, Button, Stack, CircularProgress, Alert, TextField
} from '@mui/material';
import { loadSettings, saveSettings } from './settings';

const API = {
    movies : '/scan',
    audio  : '/scan/audio',
    tv     : '/scan/TV',
    ebooks : '/bookScanner'
};

const BASE = process.env.BASE_HOST;
const ADMIN = BASE + ':3000/api/v1';

export default function Admin() {
    const [result,   setResult]   = useState(null);
    const [loading,  setLoading]  = useState(false);
    const [error,    setError]    = useState(null);

    /* playback settings live in localStorage - see settings.js */
    const [playback, setPlayback] = useState(loadSettings);
    const [saved,    setSaved]    = useState(false);

    /* generic fetcher so all four buttons share the same logic */
    const runScan = async (route) => {
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const r = await fetch(`${ADMIN}${route}`);
            if (!r.ok) throw new Error(`HTTP ${r.status}`);

            const data = await r.json();
            setResult(JSON.stringify(data, null, 2));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const editPlayback = (key) => (e) => {
        setPlayback((p) => ({ ...p, [key]: e.target.value }));
        setSaved(false);
    };

    /* saveSettings coerces and returns the stored values, so feed them back
       into state - an empty or junk field visibly snaps to 0 */
    const savePlayback = () => {
        setPlayback(saveSettings(playback));
        setSaved(true);
    };

    return (
        <Box
            sx={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                mt: 4,
                gap: 4,
                width: '100%',
                px: 2
            }}
        >
            {/* sidebar with actions */}
            <Stack spacing={2}>
                <Paper sx={{ p: 3, backgroundColor: '#000' }}>
                    <Typography variant="h6" gutterBottom>Tools</Typography>

                    <Stack spacing={2}>
                        <Button variant="contained" onClick={() => runScan(API.movies)}>Find Movies</Button>
                        <Button variant="contained" onClick={() => runScan(API.audio)}>Find Audio</Button>
                        <Button variant="contained" onClick={() => runScan(API.tv)}>Find&nbsp;TV</Button>
                        <Button variant="contained" onClick={() => runScan(API.ebooks)}>Find&nbsp;eBooks</Button>
                    </Stack>
                </Paper>

                <Paper sx={{ p: 3, backgroundColor: '#000', maxWidth: 300 }}>
                    <Typography variant="h6" gutterBottom>Playback</Typography>

                    <Stack spacing={2}>
                        <TextField
                            label="Skip intro (seconds)"
                            type="number"
                            size="small"
                            inputProps={{ min: 0 }}
                            value={playback.skipIntroSeconds}
                            onChange={editPlayback('skipIntroSeconds')}
                        />
                        <Button variant="contained" onClick={savePlayback}>Save</Button>

                        {saved && <Alert severity="success">Saved</Alert>}

                        <Typography variant="caption" sx={{ color: '#888' }}>
                            0 = off. Stored in this browser only, and applies to every
                            video. The sleep timer is not here - it is a toggle on the
                            player itself, armed one episode at a time.
                        </Typography>
                    </Stack>
                </Paper>
            </Stack>

            {/* main output panel */}
            <Box sx={{ flex: 1, position: 'relative' }}>
                {loading && (
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <CircularProgress sx={{ color: '#0f0' }} />
                    </Box>
                )}

                {error && <Alert severity="error">Error – {error}</Alert>}

                {result && (
                    <Paper sx={{ p: 2, whiteSpace: 'pre-wrap', backgroundColor: '#000' }}>
                        <Typography variant="body2" component="pre">
                            {result}
                        </Typography>
                    </Paper>
                )}

                {!loading && !error && !result && (
                    <Typography variant="body2" sx={{ mt: 2, color: '#888' }}>
                        Click a tool to start scanning …
                    </Typography>
                )}
            </Box>
        </Box>
    );
}
