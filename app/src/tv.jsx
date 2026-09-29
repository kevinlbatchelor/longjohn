import React, { useCallback, useEffect, useState } from 'react';
import {
    Box, Grid, Card, CardMedia, CardContent, Typography,
    CircularProgress, Alert, Button, IconButton,
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import EditOffIcon from '@mui/icons-material/EditOff';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageIcon from '@mui/icons-material/Image';
import { cssVars } from './styles.jsx';
import CoverPicker from './coverPicker.jsx';
import {
    COVER_ROOT, deleteEpisode, deleteShow, episodeLabel, fetchShow, fetchShowSummaries,
    forgetEpisode, forgetShow, searchShowCovers, setShowCover
} from './showCache';

/* Every sx object below is hoisted out of render. Emotion caches on object
   identity, so a literal written inside a map is re-serialised for every card on
   every render - which is the whole grid, on the device that can least afford
   it. */
const showCardSx = {
    width: 200,
    display: 'flex',
    flexDirection: 'column',
    cursor: 'pointer',
    textDecoration: 'none',
    position: 'relative'
};
/* A show card is 200px, so unlike an episode chip it has room for the delete
   button to sit in a corner and leave the rest of the card as the link. */
const showDeleteButtonSx = {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#f44',
    '&:hover': { backgroundColor: 'rgba(0,0,0,0.85)' }
};
/* Opposite corner to the delete button, so the destructive one is never where
   a thumb expects the harmless one. */
const showCoverButtonSx = {
    position: 'absolute',
    top: 4,
    left: 4,
    zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: cssVars.green,
    '&:hover': { backgroundColor: 'rgba(0,0,0,0.85)' }
};
const showGridHeaderSx = { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%', mb: 1 };

const showFallbackSx = { height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const showMediaSx = { height: 260 };
const showContentSx = { py: 1 };

const episodeCardSx = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
    px: 1,
    py: 0.5,
    cursor: 'pointer',
    backgroundColor: '#000',
    textDecoration: 'none',
    '&:hover': { backgroundColor: '#003300' }
};
const episodeLabelSx = { color: '#0f0', fontSize: 12 };
/* Edit mode: the card stops being a link and becomes the delete target itself.
   An episode card is 70px wide, so an icon tucked into a corner of it would be
   most of the card - the whole card is the hit area instead. */
const episodeDeleteCardSx = {
    ...episodeCardSx,
    border: '1px solid #f44',
    '&:hover': { backgroundColor: '#330000' }
};
const episodeDeleteLabelSx = { ...episodeLabelSx, color: '#f44' };
const episodeDeleteIconSx = { color: '#f44', fontSize: 14, mr: 0.5 };
const editButtonSx = { ml: 'auto' };
// Pushed to the right-hand end of the header, with the edit toggle beside it.
const heroCoverButtonSx = { ml: 'auto', color: cssVars.green };
const deleteHintSx = { color: '#f44', fontSize: 12, mb: 1, textAlign: 'center' };
/* A plain wrapping flex row. MUI's Grid builds a styled wrapper element per
   child, and a long-running show is several hundred children. */
const episodeGridSx = { display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' };

const headerSx = { display: 'flex', alignItems: 'center', mb: 2, gap: 1 };
const backButtonSx = { color: '#0f0', fontSize: 12, py: 0.25, px: 1, minHeight: 0 };
const backIconSx = { fontSize: 16 };
const titleSx = { color: '#0f0' };
const heroWrapSx = { display: 'flex', justifyContent: 'center', mb: 3 };
const heroFallbackSx = { height: 220, width: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const heroIconSx = { color: '#0f0' };
const heroImgSx = { height: 220, width: 'auto' };
const spinnerSx = { color: '#0f0' };
const centeredSx = { mt: 8 };
const pageSx = { p: 2, width: '100%' };
// Same reasoning as the episode row: a Grid item per show is a styled wrapper
// per show, and the cards are a fixed width anyway.
const showGridSx = { display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' };

/* The version is a cache buster. The cover lives at one URL per show and a new
   one is written over the old file, so without it the browser keeps showing the
   poster it has already cached. */
const coverUrlFor = (showName, version) =>
    `${COVER_ROOT}/${encodeURIComponent(showName)}${version ? `?v=${version}` : ''}`;

const ShowCard = React.memo(function ShowCard({ show, editMode, onDelete, onChangeCover, coverV }) {
    const [ imgError, setImgError ] = useState(false);

    // A show that had no cover has one now - give the image another go rather
    // than leaving the fallback icon sitting there until the page is reloaded.
    useEffect(() => { setImgError(false); }, [coverV]);

    return (
        <Card component="a" href={`#/show/${encodeURIComponent(show.name)}`} sx={showCardSx}>
            {editMode && (
                <IconButton
                    size="small"
                    /* The card is the link, so the button has to stop the click
                       reaching it or picking a cover would navigate into the
                       show instead. */
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChangeCover(show); }}
                    title={`Change cover for ${show.name}`}
                    sx={showCoverButtonSx}
                >
                    <ImageIcon fontSize="small"/>
                </IconButton>
            )}
            {editMode && (
                <IconButton
                    size="small"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(show); }}
                    title={`Delete ${show.name}`}
                    sx={showDeleteButtonSx}
                >
                    <DeleteIcon fontSize="small"/>
                </IconButton>
            )}
            {imgError ? (
                <Box sx={showFallbackSx}>
                    <LiveTvIcon/>
                </Box>
            ) : (
                <CardMedia
                    component="img"
                    image={coverUrlFor(show.name, coverV)}
                    alt={show.name}
                    sx={showMediaSx}
                    onError={() => setImgError(true)}
                />
            )}
            <CardContent sx={showContentSx}>
                <Typography variant="subtitle1" noWrap>
                    {show.name}
                </Typography>
            </CardContent>
        </Card>
    );
});

export function ShowEpisodes({ name }) {
    const [ show, setShow ] = useState(null);
    const [ loading, setLoading ] = useState(true);
    const [ error, setError ] = useState(null);
    const [ imgError, setImgError ] = useState(false);

    // Edit mode, same idea as the movie grid: deleting a file is off by default
    // so a mis-tap on a small screen cannot take an episode with it.
    const [ editMode, setEditMode ] = useState(false);
    const [ deleteTarget, setDeleteTarget ] = useState(null);
    const [ deleting, setDeleting ] = useState(false);
    const [ deleteError, setDeleteError ] = useState(null);

    // The cover is as easy to get wrong from here as from the grid, and this is
    // the page you are on when you notice it is wrong.
    const [ pickingCover, setPickingCover ] = useState(false);
    const [ coverV, setCoverV ] = useState(null);

    /* Straight to the server rather than through the cache, so an episode added
       since the tab opened still turns up - it is one show's worth of rows now,
       not the whole catalogue. */
    useEffect(() => {
        let live = true;

        fetchShow(name)
            .then((found) => {
                if (!live) return;
                setShow(found);
                setLoading(false);
            })
            .catch((err) => {
                if (!live) return;
                setError(err.message);
                setLoading(false);
            });

        return () => { live = false; };
    }, [name]);


    // Already in episode order - fetchShow sorts on the way into the cache.
    const episodes = show ? show.episodes : [];

    const handleConfirmDelete = () => {
        if (!deleteTarget) return;
        const { id } = deleteTarget;
        setDeleting(true);
        setDeleteError(null);

        deleteEpisode(id)
            .then(() => {
                // Drop it from the cached show as well as from what is on screen,
                // or the player would still offer it as the next episode.
                forgetEpisode(name, id);

                const remaining = episodes.filter((ep) => ep.id !== id);
                setShow((current) => (current ? { ...current, episodes: remaining } : current));
                setDeleting(false);
                setDeleteTarget(null);

                /* That was the last episode, so the server has just cleaned the
                   show up behind it - there is no show left for this page to
                   draw. Back to the grid, which no longer lists it either. */
                if (!remaining.length) window.location.hash = '#/tv';
            })
            .catch((err) => {
                setDeleteError(err.message);
                setDeleting(false);
            });
    };

    if (loading) return <Centered><CircularProgress sx={spinnerSx}/></Centered>;
    if (error) return <Centered><Alert severity="error">Load error – {error}</Alert></Centered>;
    if (!show) return <Centered><Alert severity="warning">Show not found</Alert></Centered>;

    return (
        <Box sx={pageSx}>
            <Box sx={headerSx}>
                <Button href="#/tv" size="small" startIcon={<ArrowBackIcon sx={backIconSx}/>} sx={backButtonSx}>
                    Back
                </Button>
                <Typography variant="subtitle1" sx={titleSx}>
                    {show.name}
                </Typography>
                <IconButton
                    size="small"
                    onClick={() => setPickingCover(true)}
                    title={`Change cover for ${show.name}`}
                    sx={heroCoverButtonSx}
                >
                    <ImageIcon fontSize="small"/>
                </IconButton>
                <IconButton
                    size="small"
                    onClick={() => setEditMode((v) => !v)}
                    color={editMode ? 'error' : 'default'}
                    title={editMode ? 'Exit edit mode' : 'Edit (delete episodes)'}
                >
                    {editMode ? <EditOffIcon fontSize="small"/> : <EditIcon fontSize="small"/>}
                </IconButton>
            </Box>

            <Box sx={heroWrapSx}>
                {imgError ? (
                    <Box sx={heroFallbackSx}>
                        <LiveTvIcon sx={heroIconSx}/>
                    </Box>
                ) : (
                    <Box
                        component="img"
                        src={coverUrlFor(show.name, coverV)}
                        alt={show.name}
                        onError={() => setImgError(true)}
                        sx={heroImgSx}
                    />
                )}
            </Box>

            {/* The show name is all the player needs to work out what follows -
                it looks the ordered list up itself. Spelling the rest of the run
                out in every href cost a quadratic pile of URL text, which on a
                long-running show was most of what this page put in memory. */}
            {editMode && (
                <Typography sx={deleteHintSx}>
                    Tap an episode to delete its file
                </Typography>
            )}

            <Box sx={episodeGridSx}>
                {episodes.map((ep) => (editMode ? (
                    <Card
                        key={ep.id}
                        onClick={() => setDeleteTarget({ id: ep.id, label: episodeLabel(ep) })}
                        title={`Delete ${episodeLabel(ep)}`}
                        sx={episodeDeleteCardSx}
                    >
                        <DeleteIcon sx={episodeDeleteIconSx}/>
                        <Typography sx={episodeDeleteLabelSx}>
                            {episodeLabel(ep)}
                        </Typography>
                    </Card>
                ) : (
                    <Card
                        key={ep.id}
                        component="a"
                        href={`#/play/${ep.id}?name=${encodeURIComponent(show.name)}`}
                        sx={episodeCardSx}
                    >
                        <Typography sx={episodeLabelSx}>
                            {episodeLabel(ep)}
                        </Typography>
                    </Card>
                )))}
            </Box>

            {pickingCover && (
                <CoverPicker
                    name={show.name}
                    kind="series"
                    search={searchShowCovers}
                    save={(url) => setShowCover(show.name, url)}
                    onClose={() => setPickingCover(false)}
                    onSaved={() => {
                        // New file, same URL - and the fallback icon gets
                        // another go at drawing a cover that now exists.
                        setCoverV(Date.now());
                        setImgError(false);
                    }}
                />
            )}

            <Dialog open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)}>
                <DialogTitle>Delete episode?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Permanently delete "{show.name} {deleteTarget?.label}" and remove its file
                        from disk? This cannot be undone.
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
        </Box>
    );
}

export default function TV() {
    const [ shows, setShows ] = useState([]);
    const [ loading, setLoading ] = useState(true);
    const [ error, setError ] = useState(null);

    const [ editMode, setEditMode ] = useState(false);
    const [ deleteTarget, setDeleteTarget ] = useState(null);
    const [ deleting, setDeleting ] = useState(false);
    const [ deleteError, setDeleteError ] = useState(null);

    // Which show's cover is being picked, and the bust values that make the
    // cards re-fetch a cover that has just been replaced at the same URL.
    const [ coverTarget, setCoverTarget ] = useState(null);
    const [ coverVersions, setCoverVersions ] = useState({}); // show name -> bust value

    /* Summaries only - a name per show. The grid never draws an episode, so
       pulling every episode of every show down here was the single biggest thing
       the TV pages asked a stick to download and parse. */
    useEffect(() => {
        let live = true;

        fetchShowSummaries()
            .then((rows) => {
                if (!live) return;
                setShows(rows);
                setLoading(false);
            })
            .catch((err) => {
                if (!live) return;
                setError(err.message);
                setLoading(false);
            });

        return () => { live = false; };
    }, []);

    /* Stable, so a re-render of the grid does not re-render every memoised
       card along with it. */
    const openCoverPicker = useCallback((show) => setCoverTarget(show), []);

    const handleCoverSaved = useCallback((name) => {
        // Same URL, new file - the card needs a reason to fetch it again.
        setCoverVersions((v) => ({ ...v, [name]: Date.now() }));
    }, []);

    const handleConfirmDelete = () => {
        if (!deleteTarget) return;
        const { name } = deleteTarget;
        setDeleting(true);
        setDeleteError(null);

        deleteShow(name)
            .then(() => {
                forgetShow(name);
                setShows((list) => list.filter((s) => s.name !== name));
                setDeleting(false);
                setDeleteTarget(null);
            })
            .catch((err) => {
                setDeleteError(err.message);
                setDeleting(false);
            });
    };

    if (loading) return <Centered><CircularProgress sx={spinnerSx}/></Centered>;
    if (error) return <Centered><Alert severity="error">Load error – {error}</Alert></Centered>;

    const targetCount = deleteTarget && deleteTarget.episodeCount;

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <Box sx={showGridHeaderSx}>
                <IconButton
                    size="small"
                    onClick={() => setEditMode((v) => !v)}
                    color={editMode ? 'error' : 'default'}
                    title={editMode ? 'Exit edit mode' : 'Edit (delete shows)'}
                >
                    {editMode ? <EditOffIcon fontSize="small"/> : <EditIcon fontSize="small"/>}
                </IconButton>
            </Box>

            <Box sx={showGridSx}>
                {shows.map((show) => (
                    <ShowCard
                        key={show.name}
                        show={show}
                        editMode={editMode}
                        onDelete={setDeleteTarget}
                        onChangeCover={openCoverPicker}
                        coverV={coverVersions[show.name]}
                    />
                ))}
            </Box>

            {coverTarget && (
                <CoverPicker
                    name={coverTarget.name}
                    kind="series"
                    search={searchShowCovers}
                    save={(url) => setShowCover(coverTarget.name, url)}
                    onClose={() => setCoverTarget(null)}
                    onSaved={handleCoverSaved}
                />
            )}

            <Dialog open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)}>
                <DialogTitle>Delete show?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Permanently delete "{deleteTarget?.name}"
                        {targetCount ? ` and all ${targetCount} of its episodes` : ' and all of its episodes'},
                        removing the files from disk? This cannot be undone.
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
        </div>
    );
}

const Centered = ({ children }) => (
    <Grid container justifyContent="center" alignItems="center" sx={centeredSx}>
        {children}
    </Grid>
);
