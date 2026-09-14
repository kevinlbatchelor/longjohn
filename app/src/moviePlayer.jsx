import React, { useEffect, useRef, useState } from 'react';
import { Button, FormControlLabel, Switch } from '@mui/material';
import { loadSettings } from './settings';
import { loadShow } from './showCache';
import MovieInfo from './movieInfo.jsx';

const BASE = process.env.BASE_HOST;
const MOVIE_ROOT = BASE + ':3000/api/v1/movie';
const SUBS_ROOT = BASE + ':3000/api/v1/subs';

// The sleep timer ramps the volume to silence across the last stretch of an
// episode. Fixed, not configurable - it is a toggle, not a setting.
const SLEEP_FADE_SECONDS = 300;

/* The ramp is a curve, not a straight line. A linear fade over five minutes is
   still at four fifths of the volume a minute in, which is nothing anyone
   notices while they are awake to hear it - the whole drop lands in the last
   minute, by which point the point of it has passed. Most of the volume goes
   early instead, and the tail creeps the rest of the way down.

   The curve is level = base * ratio ^ exponent, where ratio is how much of the
   fade is left. Solving ratio ^ exponent = 1/2 at the ratio one minute in is
   what fixes the exponent, so the half-volume mark sits exactly where
   SLEEP_HALF_VOLUME_SECONDS says and the rest of the shape follows from it. */
const SLEEP_HALF_VOLUME_SECONDS = 60;
const SLEEP_FADE_EXPONENT = Math.log(0.5) / Math.log(
    (SLEEP_FADE_SECONDS - SLEEP_HALF_VOLUME_SECONDS) / SLEEP_FADE_SECONDS
);

// timeupdate lands roughly four times a second and the ramp runs over five
// minutes, so most ticks ask for a level the element already has. Writing those
// back only raises a volumechange for nothing.
const VOLUME_EPSILON = 0.005;

/* Static, so they are not rebuilt every time the sleep switch is flipped or the
   next episode resolves - React diffs style objects key by key on each render. */
const pageStyle = { width: '90%', maxWidth: 900, margin: '0 auto' };
const skipRowStyle = { marginTop: 16, textAlign: 'left' };
const sleepRowStyle = { marginTop: 8, textAlign: 'left' };
const nextLabelStyle = { color: 'green', marginTop: 16, textAlign: 'left' };
const nextButtonRowStyle = { marginTop: 16, textAlign: 'right' };

export default function MoviePlayer({ id, name }) {
    const src = `${MOVIE_ROOT}/${id}`;
    const subs = `${SUBS_ROOT}/${id}`;

    const videoRef = useRef(null);

    // Read once per mount. The player remounts on every episode, so a value
    // saved in Admin is picked up the next time a video is opened.
    const [settings] = useState(loadSettings);

    // Only TV episodes travel with a show name, and the sleep timer is a TV
    // feature - a movie has nothing to fade into.
    const isEpisode = Boolean(name);

    // Per-playback toggle: off on every fresh player, never persisted.
    const [sleep, setSleep] = useState(false);

    /* What follows this episode, as { id, episode }. The show's ordered list
       used to be spelled out in the URL of every episode card, which cost the
       episode page a quadratic pile of text to build and hold. The player is the
       only thing that ever needed it, so it looks the list up itself - out of
       sessionStorage on the way through a run, off the server on a cold open. */
    const [next, setNext] = useState(null);

    useEffect(() => {
        if (!name) return undefined;

        let live = true;

        loadShow(name)
            .then((show) => {
                if (!live || !show) return;

                // Already in episode order, so this is a scan, not a sort.
                const episodes = show.episodes;
                const index = episodes.findIndex((ep) => String(ep.id) === String(id));

                setNext(index === -1 ? null : episodes[index + 1] || null);
            })
            .catch((e) => {
                // Nothing to queue is a missing button, not a broken player.
                console.warn('[longjohn] could not resolve the next episode:', e.message);
            });

        return () => { live = false; };
    }, [id, name]);

    // The level to fade down from, and back up to if the fade is called off.
    const baseVolumeRef = useRef(1);

    // True while the fade owns the volume, so the volumechange events our own
    // writes raise are not mistaken for the user reaching for the slider.
    const fadingRef = useRef(false);

    /* Runtime is settled once the metadata is in, so it is worked out there
       rather than on every timeupdate. */
    const runtimeRef = useRef(null);

    const playNext = () => {
        if (!next) return;

        window.location.hash = `#/play/${next.id}?name=${encodeURIComponent(name)}`;
    };

    /* Files served by range requests do not always expose a duration - a
       container whose header lacks one leaves it NaN or Infinity forever. The
       seekable range is the fallback the browser can always answer. */
    const runtimeOf = (video) => {
        if (Number.isFinite(video.duration) && video.duration > 0) return video.duration;

        const seekable = video.seekable;
        if (seekable && seekable.length) {
            const end = seekable.end(seekable.length - 1);
            if (Number.isFinite(end) && end > 0) return end;
        }
        return null;
    };

    // Jump ahead by the configured seconds from wherever we are, so the button
    // works as a repeatable skip rather than a one-shot seek to a fixed mark.
    const skipAhead = () => {
        const video = videoRef.current;
        if (!video) return;

        const runtime = runtimeRef.current;
        const target = video.currentTime + settings.skipIntroSeconds;

        // Never overshoot the end - that fires `ended` and auto-advances.
        const capped = runtime === null ? target : Math.min(target, Math.max(0, runtime - 1));
        if (capped > video.currentTime) video.currentTime = capped;
    };

    // Arming remembers the current level; disarming hands it straight back, so
    // a toggle in the middle of the fade is not left half muted.
    const toggleSleep = (e) => {
        const on = e.target.checked;
        const video = videoRef.current;

        if (video) {
            if (on) {
                baseVolumeRef.current = video.volume;
            } else {
                fadingRef.current = false;
                video.volume = baseVolumeRef.current;
            }
        }

        setSleep(on);
    };

    // Anything the fade did not write is the user picking a new level, and that
    // becomes the level the rest of the fade works down from.
    const handleVolumeChange = () => {
        if (fadingRef.current) return;

        const video = videoRef.current;
        if (video) baseVolumeRef.current = video.volume;
    };

    const handleTimeUpdate = () => {
        const video = videoRef.current;
        if (!video) return;

        const runtime = runtimeRef.current;
        if (runtime === null) return;

        const remaining = runtime - video.currentTime;

        if (remaining > SLEEP_FADE_SECONDS) {
            // Scrubbed back out of the fade - give the volume back.
            if (fadingRef.current) {
                fadingRef.current = false;
                video.volume = baseVolumeRef.current;
            }
            return;
        }

        fadingRef.current = true;
        const ratio = Math.min(1, Math.max(0, remaining / SLEEP_FADE_SECONDS));
        const level = baseVolumeRef.current * Math.pow(ratio, SLEEP_FADE_EXPONENT);

        if (Math.abs(video.volume - level) > VOLUME_EPSILON) video.volume = level;
    };

    // Rolling into the next episode at full volume would undo the whole point
    // of the fade, so an armed sleep timer ends the run.
    const handleEnded = () => {
        if (sleep) {
            console.log('[longjohn] sleep timer: faded out, not auto-advancing');
            return;
        }
        playNext();
    };

    // One diagnostic line per video so a fade that never happens can be explained.
    const handleLoadedMetadata = () => {
        const video = videoRef.current;
        if (!video) return;

        const runtime = runtimeOf(video);
        runtimeRef.current = runtime;

        console.log('[longjohn] playback settings', settings,
            '| duration', video.duration,
            '| runtime used', runtime,
            '| sleep timer', sleep ? 'armed' : 'off',
            '| fade starts at', sleep && runtime !== null
                ? runtime - SLEEP_FADE_SECONDS
                : 'n/a');
    };

    // A stream that only reveals its length once it is under way gets a second
    // chance here, rather than a fresh guess on every tick.
    const handleDurationChange = () => {
        const video = videoRef.current;
        if (video) runtimeRef.current = runtimeOf(video);
    };

    return (
        <div style={pageStyle}>
            <video
                ref={videoRef}
                autoPlay
                width="100%"
                preload="none"
                src={src}
                controls
                crossOrigin="anonymous"
                onEnded={handleEnded}
                /* Media events do not bubble, so React binds this straight to the
                   element - leaving it off while the timer is idle means nothing
                   at all runs four times a second through normal playback. */
                onTimeUpdate={sleep ? handleTimeUpdate : undefined}
                onVolumeChange={handleVolumeChange}
                onDurationChange={handleDurationChange}
                onLoadedMetadata={handleLoadedMetadata}
            >
                <track label="English" kind="subtitles" srcLang="en" src={subs} default/>
            </video>

            {settings.skipIntroSeconds > 0 && (
                <div style={skipRowStyle}>
                    <Button onClick={skipAhead}>Skip {settings.skipIntroSeconds}s ⏭</Button>
                </div>
            )}

            {isEpisode && (
                <div style={sleepRowStyle}>
                    <FormControlLabel
                        control={<Switch checked={sleep} onChange={toggleSleep}/>}
                        label={`Sleep timer 💤 - fade out over the last ${SLEEP_FADE_SECONDS / 60} min`}
                    />
                </div>
            )}

            {/* Draws nothing at all unless the scanner found OMDb data for this
                row, which is the common case for TV episodes - the lookup goes
                out on the filename, and "S01E01" matches nothing. */}
            <MovieInfo id={id}/>

            {next && (
                <>
                    <div style={nextLabelStyle}>
                        <span>Next<span>: </span>{next.episode}</span>
                    </div>
                    <div style={nextButtonRowStyle}>
                        <Button onClick={playNext}>Play Next ▶</Button>
                    </div>
                </>
            )}
        </div>
    );
}
