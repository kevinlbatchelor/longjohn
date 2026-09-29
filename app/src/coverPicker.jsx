import React, { useEffect, useState } from 'react';
import {
    Alert, Box, Button, Card, CardContent, CardMedia, CircularProgress,
    Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography
} from '@mui/material';
import { cssVars } from './styles.jsx';

/* The cover picker ---------------------------------------------------------------
 * One dialog for every page that lets a cover be chosen by hand. The page hands
 * over a search and a save, and the picker knows nothing about what it is
 * picking for beyond the wording. Mounted when wanted and unmounted when it
 * closes, so the query, the results and any half-finished state go with it -
 * there is nothing to reset on the way in, and `name` being what mounts it is
 * what makes the opening search fire exactly once.
 *
 *   search(q)  -> Promise<{ results, provider, message }>
 *   save(url)  -> Promise
 *   remove()   -> Promise, optional: offers a button that clears the cover
 *   results are { id, title, year, poster, source?, type?, authors? }
 */

// Hoisted out of render: the results grid is up to sixty posters, each one
// re-serialising any literal written inside the map.
const searchRowSx = { display: 'flex', gap: 1, mb: 2 };
const busySx = { display: 'flex', justifyContent: 'center', py: 4 };
const spinnerSx = { color: cssVars.green };
/* A wrapping flex row of fixed-width cards rather than a Grid: MUI 7 dropped
   the Grid item props, and a fixed card holds a square audiobook cover and a
   tall poster the same way - whole, on black, not cropped to fit. */
const resultsSx = { display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' };
const resultCardSx = { width: 160, position: 'relative' };
const resultMediaSx = { height: 220, objectFit: 'contain', backgroundColor: '#000' };
const resultContentSx = { py: 1, px: 1 };
const resultCaptionSx = { display: 'block' };
const badgeSx = {
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
};
const savingOverlaySx = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)'
};
const creditSx = { color: 'text.secondary', pl: 2 };
const removeSx = { color: '#f44' };
const actionGroupSx = { display: 'flex', gap: 1 };
const actionsSx = { justifyContent: 'space-between' };
const alertSx = { mb: 2 };

const PROVIDER_LABELS = {
    both: 'TMDb + OMDb',
    tmdb: 'TMDb',
    omdb: 'OMDb',
    google: 'Google Books',
    books: 'Google, Apple and Open Library'
};

// What the corner badge says for each source a result can come from.
const SOURCE_BADGES = { google: 'GOOGLE', apple: 'APPLE', openlibrary: 'OPEN LIBRARY', tmdb: 'TMDB', omdb: 'OMDB' };
const badgeFor = (source) => SOURCE_BADGES[source] || source.toUpperCase();

// Year and author, whichever the provider gave.
const captionFor = (r) => [r.year, (r.authors || []).join(', ')].filter(Boolean).join(' · ');

export default function CoverPicker({ name, kind, search, save, remove, onClose, onSaved }) {
    const [ query, setQuery ] = useState(name);
    const [ results, setResults ] = useState([]);
    const [ provider, setProvider ] = useState(null);
    const [ searching, setSearching ] = useState(false);
    const [ error, setError ] = useState(null);
    const [ saving, setSaving ] = useState(null); // the result being saved

    const runSearch = (q) => {
        const text = (q ?? query).trim();
        if (!text) {
            setResults([]);
            return;
        }
        setSearching(true);
        setError(null);

        search(text)
            .then((body) => {
                setResults(body.results || []);
                setProvider(body.provider || null);
                // A provider that answered with a complaint rather than results.
                if (body.message) setError(body.message);
                setSearching(false);
            })
            .catch((err) => {
                setError(err.message);
                setSearching(false);
            });
    };

    // The thing's own name is the first thing worth trying, so it is tried
    // without being asked for.
    useEffect(() => { runSearch(name); }, [name]);

    const pick = (result) => {
        setSaving(result.id);
        setError(null);

        save(result.poster)
            .then(() => {
                onSaved(name);
                setSaving(null);
                onClose();
            })
            .catch((err) => {
                setError(err.message);
                setSaving(null);
            });
    };

    // Same path out as a pick: the page busts the cover URL and the card
    // re-fetches, gets nothing, and shows its fallback icon.
    const clear = () => {
        setSaving('remove');
        setError(null);

        remove()
            .then(() => {
                onSaved(name);
                setSaving(null);
                onClose();
            })
            .catch((err) => {
                setError(err.message);
                setSaving(null);
            });
    };

    const providerLabel = PROVIDER_LABELS[provider] || 'covers';

    return (
        <Dialog open onClose={() => !saving && onClose()} maxWidth="md" fullWidth>
            <DialogTitle>Cover art – {name}</DialogTitle>
            <DialogContent>
                <Box sx={searchRowSx}>
                    <TextField
                        autoFocus
                        fullWidth
                        variant="standard"
                        label={`Search ${providerLabel} for a ${kind}`}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyPress={(e) => { if (e.key === 'Enter') runSearch(); }}
                    />
                    <Button onClick={() => runSearch()} disabled={searching}>
                        {searching ? '…' : 'Search'}
                    </Button>
                </Box>

                {error && <Alert severity="error" sx={alertSx}>{error}</Alert>}

                {searching ? (
                    <Box sx={busySx}>
                        <CircularProgress sx={spinnerSx}/>
                    </Box>
                ) : (
                    <Box sx={resultsSx}>
                        {results.map((r) => (
                            <Card
                                key={`${r.source || ''}-${r.type || ''}-${r.id}`}
                                onClick={() => !saving && pick(r)}
                                sx={{
                                    ...resultCardSx,
                                    cursor: saving ? 'wait' : 'pointer',
                                    opacity: saving && saving !== r.id ? 0.4 : 1
                                }}
                            >
                                {r.source && <Box sx={badgeSx}>{badgeFor(r.source)}</Box>}
                                <CardMedia
                                    component="img"
                                    image={r.poster}
                                    alt={r.title}
                                    sx={resultMediaSx}
                                />
                                {saving === r.id && (
                                    <Box sx={savingOverlaySx}>
                                        <CircularProgress size={28} sx={spinnerSx}/>
                                    </Box>
                                )}
                                <CardContent sx={resultContentSx}>
                                    <Typography variant="caption" noWrap title={`${r.title} ${captionFor(r)}`} sx={resultCaptionSx}>
                                        {r.title}
                                    </Typography>
                                    <Typography variant="caption" noWrap title={captionFor(r)} sx={resultCaptionSx}>
                                        {captionFor(r)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        ))}
                        {!searching && results.length === 0 && query && (
                            <Typography variant="caption" sx={creditSx}>
                                No {kind} found – try the name as the provider spells it.
                            </Typography>
                        )}
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={actionsSx}>
                {(provider === 'tmdb' || provider === 'both') ? (
                    <Typography variant="caption" sx={creditSx}>
                        This product uses the TMDb API but is not endorsed or certified by TMDb.
                    </Typography>
                ) : <span/>}
                <Box sx={actionGroupSx}>
                    {remove && (
                        <Button disabled={!!saving} onClick={clear} sx={removeSx} title="Delete the current cover file">
                            {saving === 'remove' ? 'Removing…' : 'Remove cover'}
                        </Button>
                    )}
                    <Button disabled={!!saving} onClick={onClose}>Close</Button>
                </Box>
            </DialogActions>
        </Dialog>
    );
}
