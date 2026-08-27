import React, { useRef, useState } from 'react';
import { Button } from '@mui/material';
import { loadSettings } from './settings';

const BASE = process.env.BASE_HOST;
const MOVIE_ROOT = BASE + ':3000/api/v1/movie';
const SUBS_ROOT = BASE + ':3000/api/v1/subs';
export default function MoviePlayer({ id, next, queue, name }) {
    const src = `${MOVIE_ROOT}/${id}`;
    const subs = `${SUBS_ROOT}/${id}`;

    const videoRef = useRef(null);

    // Read once per mount. The player remounts on every hash change, so a value
    // saved in Admin is picked up the next time a video is opened.
    const [settings] = useState(loadSettings);

    // End-early fires once, else playback could never resume past the mark.
    const stoppedRef = useRef(false);

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

    const handleTimeUpdate = () => {
        if (!settings.endEarlySeconds || stoppedRef.current) return;

        const video = videoRef.current;
        if (!video) return;

        const runtime = runtimeOf(video);
        if (runtime === null) return;

        if (video.currentTime >= runtime - settings.endEarlySeconds) {
            stoppedRef.current = true;
            video.pause();
            console.log('[longjohn] end early: paused at', video.currentTime, 'of', runtime);
        }
    };

    // Any seek re-arms the guard, so scrubbing back into the episode works.
    const handleSeeking = () => {
        stoppedRef.current = false;
    };

    // One diagnostic line per video so a mark that never fires can be explained.
    const handleLoadedMetadata = () => {
        const video = videoRef.current;
        if (!video) return;

        const runtime = runtimeOf(video);
        console.log('[longjohn] playback settings', settings,
            '| duration', video.duration,
            '| runtime used', runtime,
            '| ends early at', settings.endEarlySeconds && runtime !== null
                ? runtime - settings.endEarlySeconds
                : 'off');
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
                onEnded={playNext}
                onTimeUpdate={handleTimeUpdate}
                onSeeking={handleSeeking}
                onLoadedMetadata={handleLoadedMetadata}
            >
                <track label="English" kind="subtitles" srcLang="en" src={subs} default/>
            </video>

            {settings.skipIntroSeconds > 0 && (
                <div style={{ marginTop: 16, textAlign: 'left' }}>
                    <Button onClick={skipAhead}>Skip {settings.skipIntroSeconds}s ⏭</Button>
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
