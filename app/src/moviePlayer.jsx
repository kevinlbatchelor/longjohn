import React from 'react';

const BASE = process.env.BASE_HOST;
const MOVIE_ROOT = BASE + ':3000/api/v1/movie';
const SUBS_ROOT = BASE + ':3000/api/v1/subs';

export default function MoviePlayer({ id }) {
    const src = `${MOVIE_ROOT}/${id}`;
    const subs = `${SUBS_ROOT}/${id}`;

    return (
        <div style={{ width: '90%', maxWidth: 900, margin: '0 auto' }}>
            <video
                autoPlay
                id="video"
                width="100%"
                preload="none"
                src={src}
                controls
                crossOrigin="anonymous"
            >
                <track
                    label="English"
                    kind="subtitles"
                    srcLang="en"
                    src={subs}
                    default
                />
            </video>
        </div>
    );
}
