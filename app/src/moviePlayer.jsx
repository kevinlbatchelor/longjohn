import React from 'react';
import { Button } from '@mui/material';

const BASE = process.env.BASE_HOST;
const MOVIE_ROOT = BASE + ':3000/api/v1/movie';
const SUBS_ROOT = BASE + ':3000/api/v1/subs';
export default function MoviePlayer({ id, next, queue, name }) {
    const src = `${MOVIE_ROOT}/${id}`;
    const subs = `${SUBS_ROOT}/${id}`;
    const episodeName = next ? next.split(':')[1] : '';

    const playNext = () => {
        if (next) {
            const id = next.split(':')[0];

            const qs = queue ? `?queue=${queue}` : '';
            window.location.hash = `#/play/${id}${qs}`;
        }
    };

    return (
        <div style={{ width: '90%', maxWidth: 900, margin: '0 auto' }}>
            <video
                autoPlay
                width="100%"
                preload="none"
                src={src}
                controls
                crossOrigin="anonymous"
            >
                <track label="English" kind="subtitles" srcLang="en" src={subs} default/>
            </video>

            {next && [
                <div style={{ color: 'green', marginTop: 16, textAlign: 'left' }}>
                    <span>Next<span>: </span>{episodeName}</span>
                </div>,
                <div style={{ marginTop: 16, textAlign: 'right' }}>
                    <Button onClick={playNext}>Play Next ▶</Button>
                </div>
            ]}
        </div>
    );
}