import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { cssVars } from './styles.jsx';

/* The OMDb blob, on the player page and in the details modal ---------------------
 * The scanner has been writing this column since the beginning and nothing has
 * ever read it back, so it arrives here with two habits worth knowing about.
 *
 * It writes the string 'N/A' wherever it has nothing, which is why every field
 * goes through clean() rather than a truthiness check - otherwise the panel
 * fills up with rows reading "DIRECTOR  N/A".
 *
 * And it is only there at all when the scanner found it: .mp4 files only, only
 * with an OMDb key configured, only within a 500ms timeout. A row without it is
 * the ordinary case, not an error, so the whole panel renders nothing at all
 * rather than an empty frame.
 */

import { BASE } from './baseHost';
const INFO_ROOT = BASE + ':3000/api/v1/movie';

function clean(value) {
    if (value === null || value === undefined) return null;

    const text = String(value).trim();
    if (!text || text === 'N/A') return null;

    return text;
}

/* OMDb stores 0 for a title it has no release year for, and clean() would print
   that as "Downton Abbey · 0 · TV-PG". A year is only a year if it looks like one. */
function cleanYear(value) {
    const year = Number(value);
    return Number.isFinite(year) && year > 1800 ? String(year) : null;
}

/* The only real colour on the page, so it reads as deliberate: each score in
   the badge its own site uses. Everything else stays theme green. */
const badgeBaseSx = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0.5,
    px: 0.75,
    py: 0.25,
    borderRadius: 0.5,
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1.6,
    whiteSpace: 'nowrap'
};

// Built once, with the sx baked in - Emotion caches on object identity, and a
// style object written inline would be re-serialised on every render.
const SOURCES = {
    'Internet Movie Database': {
        label: '★',
        sx: { ...badgeBaseSx, backgroundColor: '#f5c518', color: '#000' }
    },
    'Rotten Tomatoes': {
        label: 'RT',
        sx: { ...badgeBaseSx, backgroundColor: '#fa320a', color: '#fff' }
    },
    Metacritic: {
        label: 'MC',
        sx: { ...badgeBaseSx, backgroundColor: '#66cc33', color: '#000' }
    }
};

// An unrecognised source still gets a badge, just in the theme's own colour.
const unknownSourceSx = {
    ...badgeBaseSx,
    backgroundColor: cssVars.black,
    color: cssVars.green,
    border: `1px solid ${cssVars.green}`
};

const panelSx = {
    mt: 2,
    pt: 2,
    borderTop: '1px solid rgba(0,255,0,0.25)',
    textAlign: 'left'
};
// In the details modal the panel is the whole content, so no rule above it.
const flushPanelSx = { textAlign: 'left' };
const headlineSx = { color: cssVars.green, fontSize: 14, fontWeight: 700, letterSpacing: 0.5 };
const badgeRowSx = { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 1 };
const plotSx = { color: cssVars.green, fontSize: 13, mt: 1.5, opacity: 0.9 };
/* Labels in a fixed first column so the values line up down the page - a plain
   two-column grid does that without a wrapper element per row. */
const detailGridSx = {
    display: 'grid',
    gridTemplateColumns: 'max-content 1fr',
    columnGap: 2,
    rowGap: 0.5,
    mt: 1.5
};
const detailLabelSx = { color: cssVars.green, fontSize: 11, opacity: 0.6, whiteSpace: 'nowrap' };
const detailValueSx = { color: cssVars.green, fontSize: 13 };
const linkSx = { color: cssVars.green, fontSize: 12, mt: 1.5, display: 'inline-block' };

function RatingBadge({ source, value }) {
    const known = SOURCES[source];

    return (
        <Box component="span" sx={known ? known.sx : unknownSourceSx} title={source}>
            <span>{known ? known.label : source}</span>
            <span>{value}</span>
        </Box>
    );
}

function ratingsOf(imdb) {
    const listed = Array.isArray(imdb.ratings) ? imdb.ratings : [];

    const scored = listed
        .map((entry) => ({ source: clean(entry.source), value: clean(entry.value) }))
        .filter((entry) => entry.source && entry.value);

    if (scored.length) return scored;

    /* No ratings array - the flat fields carry the same two numbers, so the
       badges still turn up rather than the strip looking bare. */
    const fallback = [];
    const score = clean(imdb.rating);
    if (score) fallback.push({ source: 'Internet Movie Database', value: `${score}/10` });

    const metascore = clean(imdb.metascore);
    if (metascore) fallback.push({ source: 'Metacritic', value: `${metascore}/100` });

    return fallback;
}

export default function MovieInfo({ id, flush = false }) {
    const [ info, setInfo ] = useState(null);

    useEffect(() => {
        let live = true;

        // The player remounts per episode, but the id can also change under it -
        // clear first so the last movie's panel is never shown against this one.
        setInfo(null);

        fetch(`${INFO_ROOT}/${encodeURIComponent(id)}/info`)
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (live && data && data.imdb) setInfo(data);
            })
            .catch((e) => {
                // A panel is a bonus. A player that cannot fetch one still plays.
                console.warn('[longjohn] no imdb info for this title:', e.message);
            });

        return () => { live = false; };
    }, [id]);

    if (!info) return null;

    const imdb = info.imdb;

    const headline = [
        clean(imdb.title) || clean(info.name),
        cleanYear(imdb.year),
        clean(imdb.rated),
        clean(imdb.runtime)
    ].filter(Boolean).join(' · ');

    const ratings = ratingsOf(imdb);
    const plot = clean(imdb.plot);

    const details = [
        ['DIRECTOR', clean(imdb.director)],
        ['WRITER', clean(imdb.writer)],
        ['CAST', clean(imdb.actors)],
        ['GENRE', clean(imdb.genres)],
        ['COUNTRY', clean(imdb.country)],
        ['AWARDS', clean(imdb.awards)],
        ['BOX OFFICE', clean(imdb.boxoffice)]
    ].filter(([ , value ]) => value);

    const url = clean(imdb.imdburl);

    // Nothing but a bare headline is not worth a panel and a border.
    if (!headline && !ratings.length) return null;

    return (
        <Box sx={flush ? flushPanelSx : panelSx}>
            {headline && <Typography sx={headlineSx}>{headline}</Typography>}

            {ratings.length > 0 && (
                <Box sx={badgeRowSx}>
                    {ratings.map((entry) => (
                        <RatingBadge key={entry.source} source={entry.source} value={entry.value}/>
                    ))}
                </Box>
            )}

            {plot && <Typography sx={plotSx}>{plot}</Typography>}

            {details.length > 0 && (
                <Box sx={detailGridSx}>
                    {details.map(([ label, value ]) => (
                        <React.Fragment key={label}>
                            <Typography sx={detailLabelSx}>{label}</Typography>
                            <Typography sx={detailValueSx}>{value}</Typography>
                        </React.Fragment>
                    ))}
                </Box>
            )}

            {url && (
                <Typography component="a" href={url} target="_blank" rel="noreferrer" sx={linkSx}>
                    View on IMDb ↗
                </Typography>
            )}
        </Box>
    );
}
