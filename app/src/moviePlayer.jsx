import React, { useRef, useState } from 'react';
import { Button, FormControlLabel, Switch } from '@mui/material';
import { loadSettings } from './settings';

const BASE = process.env.BASE_HOST;
const MOVIE_ROOT = BASE + ':3000/api/v1/movie';
const SUBS_ROOT = BASE + ':3000/api/v1/subs';

// The sleep timer ramps the volume to silence across the last stretch of an
// episode. Fixed, not configurable - it is a toggle, not a setting.
const SLEEP_FADE_SECONDS = 300;

export default function MoviePlayer({ id, next, queue, name }) {
    const src = `${MOVIE_ROOT}/${id}`;
    const subs = `${SUBS_ROOT}/${id}`;

    const videoRef = useRef(null);

    // Read once per mount. The player remounts on every hash change, so a value
    // saved in Admin is picked up the next time a video is opened.
    const [settings] = useState(loadSettings);

    // Only TV episodes travel with a show name, and the sleep timer is a TV
    // feature - a movie has nothing to fade into.
    const isEpisode = Boolean(name);

    // Per-playback toggle: off on every fresh player, never persisted.
    const [sleep, setSleep] = useState(false);

    // The level to fade down from, and back up to if the fade is called off.
    const baseVolumeRef = useRef(1);

    // True while the fade owns the volume, so the volumechange events our own
    // writes raise are not mistaken for the user reaching for the slider.
    const fadingRef = useRef(false);

    // Queue entries are "<id>:<episode name>" and the name can hold anything,
    // so split on the first colon only.
    const sep = next ? next.indexOf(':') : -1;
    const nextId = sep === -1 ? next : next.slice(0, sep);
    const episodeName = sep === -1 ? '' : next.slice(sep + 1);

    const playNext = () => {
        if (!next) return;

        const params = [];
        if (queue) params.push(`queue=${encodeURIComponent(queue)}`);
        if (name) params.push(`name=${encodeURIComponent(name)}`);

        window.location.hash = `#/play/${nextId}${params.length ? '?' + params.join('&') : ''}`;
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

        const runtime = runtimeOf(video);
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

    /* timeupdate lands roughly four times a second, which is dense enough for
       the ramp to sound continuous over five minutes. */
    const handleTimeUpdate = () => {
        if (!sleep) return;

        const video = videoRef.current;
        if (!video) return;

        const runtime = runtimeOf(video);
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
        video.volume = baseVolumeRef.current * ratio;
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
        console.log('[longjohn] playback settings', settings,
            '| duration', video.duration,
            '| runtime used', runtime,
            '| sleep timer', sleep ? 'armed' : 'off',
            '| fade starts at', sleep && runtime !== null
                ? runtime - SLEEP_FADE_SECONDS
                : 'n/a');
    };

    return (
        <div style={{ width: '90%', maxWidth: 900, margin: '0 auto' }}>
            <video
                ref={videoRef}
                autoPlay
                width="100%"
                preload="none"
                src={src}
                controls
                crossOrigin="anonymous"
                onEnded={handleEnded}
                onTimeUpdate={handleTimeUpdate}
                onVolumeChange={handleVolumeChange}
                onLoadedMetadata={handleLoadedMetadata}
            >
                <track label="English" kind="subtitles" srcLang="en" src={subs} default/>
            </video>

            {settings.skipIntroSeconds > 0 && (
                <div style={{ marginTop: 16, textAlign: 'left' }}>
                    <Button onClick={skipAhead}>Skip {settings.skipIntroSeconds}s ⏭</Button>
                </div>
            )}

            {isEpisode && (
                <div style={{ marginTop: 8, textAlign: 'left' }}>
                    <FormControlLabel
                        control={<Switch checked={sleep} onChange={toggleSleep}/>}
                        label={`Sleep timer 💤 - fade out over the last ${SLEEP_FADE_SECONDS / 60} min`}
                    />
                </div>
            )}

            {next && (
                <>
                    <div style={{ color: 'green', marginTop: 16, textAlign: 'left' }}>
                        <span>Next<span>: </span>{episodeName}</span>
                    </div>
                    <div style={{ marginTop: 16, textAlign: 'right' }}>
                        <Button onClick={playNext}>Play Next ▶</Button>
                    </div>
                </>
            )}
        </div>
    );
}
