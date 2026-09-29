import React, { useEffect, useRef, useState } from 'react';
import { Button, ToggleButton, ToggleButtonGroup } from '@mui/material';
import FastForwardIcon from '@mui/icons-material/FastForward';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { loadSettings } from './settings';
import { loadShow } from './showCache';
import MovieInfo from './movieInfo.jsx';
import { cssVars } from './styles.jsx';

const BASE = process.env.BASE_HOST;
const MOVIE_ROOT = BASE + ':3000/api/v1/movie';
const SUBS_ROOT = BASE + ':3000/api/v1/subs';

// Every sleep mode ends in the same ramp: the volume goes to silence across
// this many seconds before the moment it is due. Fixed, not configurable.
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

/* The three sleep modes, in the order they sit on the toggle. The two timed
   ones count down in wall-clock time from the moment they are armed and pause
   the video when they land. 'last' is the original: fade across the closing
   minutes of the episode and do not roll into the next one. */
const SLEEP_OPTIONS = [
    { value: '20', label: '20m', minutes: 20, title: 'Sleep in 20 minutes' },
    { value: '30', label: '30m', minutes: 30, title: 'Sleep in 30 minutes' },
    { value: 'last', label: 'lt5m', title: `Fade out over the last ${SLEEP_FADE_SECONDS / 60} minutes of the episode` },
];

/* A timed sleep outlives the episode it was armed in. Auto-advancing remounts
   this whole component, so the deadline is parked in sessionStorage for the
   next player to pick up - "sleep in 30 minutes" means thirty minutes,
   whatever happens to be playing by then. It dies with the tab. */
const SLEEP_KEY = 'longjohnSleep';

const readStoredSleep = () => {
    try {
        const raw = JSON.parse(sessionStorage.getItem(SLEEP_KEY));
        if (raw && raw.value !== 'last' && Number.isFinite(raw.until) && raw.until > Date.now()) {
            return { value: String(raw.value), until: raw.until };
        }
    } catch (e) {
        // corrupt JSON, or storage blocked entirely - treat as off
    }
    return null;
};

const writeStoredSleep = (sleep) => {
    try {
        if (sleep && sleep.value !== 'last') {
            sessionStorage.setItem(SLEEP_KEY, JSON.stringify(sleep));
        } else {
            sessionStorage.removeItem(SLEEP_KEY);
        }
    } catch (e) {
        // storage blocked - the timer still runs for this episode
    }
};

// The skip button is for intros, so it is only offered through the opening
// minutes. The play-next button is for credits, so it only shows up at the end.
const SKIP_VISIBLE_SECONDS = 300;
const NEXT_VISIBLE_SECONDS = 180;

/* Static, so they are not rebuilt on every render - React diffs style objects
   key by key each time. */
const pageStyle = { width: '90%', maxWidth: 900, margin: '0 auto' };

/* The overlays have to survive fullscreen, and only descendants of the
   fullscreen element are drawn there. So this wrapper is what goes fullscreen,
   never the bare video - the fullscreenchange handler moves it up here when
   the browser's own button fullscreens the video. lineHeight 0 kills the
   inline gap a video leaves under itself. */
const playerStyle = { position: 'relative', width: '100%', backgroundColor: '#000', lineHeight: 0 };
const videoStyle = { display: 'block', width: '100%', height: 'auto', backgroundColor: '#000' };
const videoFullscreenStyle = { ...videoStyle, height: '100%', objectFit: 'contain' };

// Sitting clear of the native control bar, which draws along the bottom edge.
const overlayStyle = { position: 'absolute', display: 'flex', gap: 8, zIndex: 1, lineHeight: 'normal' };
const lowerRightStyle = { ...overlayStyle, right: 16, bottom: 72 };

const overlayButtonSx = {
    minWidth: 0,
    padding: '2px 8px',
    border: '1px solid',
    borderColor: 'primary.main',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    opacity: 0.85,
    '& .MuiSvgIcon-root': { fontSize: 20 },
};

const sleepRowStyle = { marginTop: 12, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 };
const sleepLabelStyle = { color: cssVars.green, fontSize: 14 };
const sleepToggleSx = {
    color: 'primary.main',
    borderColor: 'primary.main',
    padding: '2px 10px',
    fontSize: 13,
    textTransform: 'none',
    '&.Mui-selected': { backgroundColor: 'primary.main', color: '#000' },
    '&.Mui-selected:hover': { backgroundColor: 'primary.main', color: '#000' },
};
const nextLabelStyle = { color: 'green', marginTop: 16, textAlign: 'left' };

export default function MoviePlayer({ id, name }) {
    const src = `${MOVIE_ROOT}/${id}`;
    const subs = `${SUBS_ROOT}/${id}`;

    const videoRef = useRef(null);
    const playerRef = useRef(null);

    // Read once per mount. The player remounts on every episode, so a value
    // saved in Admin is picked up the next time a video is opened.
    const [settings] = useState(loadSettings);

    // Only TV episodes travel with a show name, and the sleep timer is a TV
    // feature - a movie has nothing to fade into.
    const isEpisode = Boolean(name);

    /* Which sleep mode is armed, as { value, until? } - null for none. Off on
       a fresh player unless a timed sleep from an earlier episode is still
       counting down. Never a saved preference. */
    const [sleep, setSleep] = useState(() => (isEpisode ? readStoredSleep() : null));

    // The overlays come and go with the playhead. Booleans, so the setters
    // bail out of a re-render on the ticks where nothing changed.
    const [showSkip, setShowSkip] = useState(true);
    const [showNext, setShowNext] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);

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

    /* The browser's own fullscreen button (and a double-click) fullscreens the
       bare video, which is exactly where the overlays cannot follow. It is
       bounced up to the wrapper here, and the wrapper's state is tracked so
       the video can be told to fill it. */
    useEffect(() => {
        const handleChange = () => {
            const active = document.fullscreenElement;
            setFullscreen(Boolean(active) && active === playerRef.current);

            if (active && active === videoRef.current) {
                Promise.resolve(document.exitFullscreen())
                    .then(() => {
                        const player = playerRef.current;
                        return player && player.requestFullscreen ? player.requestFullscreen() : undefined;
                    })
                    .catch((e) => {
                        console.warn('[longjohn] could not move fullscreen onto the player:', e.message);
                    });
            }
        };

        document.addEventListener('fullscreenchange', handleChange);
        return () => document.removeEventListener('fullscreenchange', handleChange);
    }, []);

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

    // Hands the volume straight back if a fade was under way, so a change of
    // mode in the middle of one is not left half muted.
    const restoreVolume = (video) => {
        if (!fadingRef.current) return;

        fadingRef.current = false;
        if (video) video.volume = baseVolumeRef.current;
    };

    /* The toggle hands over the option picked, or null when the lit one is
       pressed again to switch off. Arming remembers the current level as the
       one to fade from; a timed mode also fixes its deadline right here. */
    const changeSleep = (e, value) => {
        const video = videoRef.current;
        restoreVolume(video);

        const option = SLEEP_OPTIONS.find((o) => o.value === value);
        if (!option) {
            writeStoredSleep(null);
            setSleep(null);
            return;
        }

        if (video) baseVolumeRef.current = video.volume;

        const armed = option.minutes
            ? { value: option.value, until: Date.now() + option.minutes * 60 * 1000 }
            : { value: option.value };

        writeStoredSleep(armed);
        setSleep(armed);
    };

    // Anything the fade did not write is the user picking a new level, and that
    // becomes the level the rest of the fade works down from.
    const handleVolumeChange = () => {
        if (fadingRef.current) return;

        const video = videoRef.current;
        if (video) baseVolumeRef.current = video.volume;
    };

    // Seconds until the armed sleep is due, or null while that cannot be known.
    const sleepRemaining = (video) => {
        if (sleep.value !== 'last') return (sleep.until - Date.now()) / 1000;

        const runtime = runtimeRef.current;
        return runtime === null ? null : runtime - video.currentTime;
    };

    const applySleep = (video) => {
        const remaining = sleepRemaining(video);
        if (remaining === null) return;

        // A timed sleep that has landed: silence, stop, and stand down, so the
        // next press of play is a normal one at normal volume.
        if (remaining <= 0 && sleep.value !== 'last') {
            video.pause();
            restoreVolume(video);
            writeStoredSleep(null);
            setSleep(null);
            console.log('[longjohn] sleep timer: done, paused');
            return;
        }

        if (remaining > SLEEP_FADE_SECONDS) {
            // Scrubbed back out of the fade - give the volume back.
            restoreVolume(video);
            return;
        }

        fadingRef.current = true;
        const ratio = Math.min(1, Math.max(0, remaining / SLEEP_FADE_SECONDS));
        const level = baseVolumeRef.current * Math.pow(ratio, SLEEP_FADE_EXPONENT);

        if (Math.abs(video.volume - level) > VOLUME_EPSILON) video.volume = level;
    };

    const handleTimeUpdate = () => {
        const video = videoRef.current;
        if (!video) return;

        const runtime = runtimeRef.current;
        setShowSkip(video.currentTime < SKIP_VISIBLE_SECONDS);
        setShowNext(runtime !== null && runtime - video.currentTime <= NEXT_VISIBLE_SECONDS);

        if (sleep) applySleep(video);
    };

    // Rolling into the next episode at full volume would undo the whole point
    // of the fade, so a sleep armed on this episode's ending ends the run. A
    // timed one carries on into the next episode and lands there.
    const handleEnded = () => {
        if (sleep && sleep.value === 'last') {
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
            '| sleep', sleep ? sleep.value : 'off',
            '| due in', sleep ? sleepRemaining(video) : 'n/a');

        // A timed sleep restored mid-fade starts this episode at the right
        // level rather than at full volume until the first tick.
        if (sleep) applySleep(video);
    };

    // A stream that only reveals its length once it is under way gets a second
    // chance here, rather than a fresh guess on every tick.
    const handleDurationChange = () => {
        const video = videoRef.current;
        if (video) runtimeRef.current = runtimeOf(video);
    };

    const skipVisible = settings.skipIntroSeconds > 0 && showSkip;
    const nextVisible = Boolean(next) && showNext;

    return (
        <div style={pageStyle}>
            <div ref={playerRef} style={playerStyle}>
                <video
                    ref={videoRef}
                    autoPlay
                    preload="none"
                    src={src}
                    controls
                    crossOrigin="anonymous"
                    style={fullscreen ? videoFullscreenStyle : videoStyle}
                    onEnded={handleEnded}
                    onTimeUpdate={handleTimeUpdate}
                    onVolumeChange={handleVolumeChange}
                    onDurationChange={handleDurationChange}
                    onLoadedMetadata={handleLoadedMetadata}
                >
                    <track label="English" kind="subtitles" srcLang="en" src={subs} default/>
                </video>

                {(skipVisible || nextVisible) && (
                    <div style={lowerRightStyle}>
                        {skipVisible && (
                            <Button
                                sx={overlayButtonSx}
                                onClick={skipAhead}
                                title={`Skip ${settings.skipIntroSeconds}s`}
                                aria-label={`Skip ${settings.skipIntroSeconds} seconds`}
                            >
                                <FastForwardIcon/>
                            </Button>
                        )}
                        {nextVisible && (
                            <Button
                                sx={overlayButtonSx}
                                onClick={playNext}
                                title={`Play next: ${next.episode}`}
                                aria-label="Play next episode"
                            >
                                <PlayArrowIcon/>
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {isEpisode && (
                <div style={sleepRowStyle}>
                    <span style={sleepLabelStyle}>Sleep</span>
                    <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={sleep ? sleep.value : null}
                        onChange={changeSleep}
                        aria-label="Sleep timer"
                    >
                        {SLEEP_OPTIONS.map((option) => (
                            <ToggleButton
                                key={option.value}
                                value={option.value}
                                title={option.title}
                                sx={sleepToggleSx}
                            >
                                {option.label}
                            </ToggleButton>
                        ))}
                    </ToggleButtonGroup>
                </div>
            )}

            {/* Draws nothing at all unless the scanner found OMDb data for this
                row, which is the common case for TV episodes - the lookup goes
                out on the filename, and "S01E01" matches nothing. */}
            <MovieInfo id={id}/>

            {next && (
                <div style={nextLabelStyle}>
                    <span>Next<span>: </span>{next.episode}</span>
                </div>
            )}
        </div>
    );
}
