import React, { useEffect, useState } from 'react';
import Audiobooks from './audiobooks';
import Movies from './movies';
import { GlobalStyles, ThemeProvider } from '@mui/material';
import { cssVars, hackerTheme } from './styles.jsx';
import MoviePlayer from './moviePlayer.jsx';
import Admin from './admin';
import TV from './tv';

const NotFound = () => <h2>404 – Not found</h2>;

const routes = {
    '/': Movies,
    '/audiobooks': Audiobooks,
    '/movies': Movies,
    '/admin': Admin,
    '/tv': TV
};

function resolveRoute(path) {
    // exact matches first
    if (routes[path]) return routes[path];

    const playMatch = path.match(/^\/play\/([^?]+)(?:\?(.+))?$/);
    if (playMatch) {
        const id = playMatch[1];
        const params = new URLSearchParams(playMatch[2] || '');
        const queue = params.get('queue') || '';
        const name = params.get('name') || '';
        const [nextId, ...rest] = queue.split(',').filter(Boolean);
        const nextQueue = rest.join(',');

        return () => <MoviePlayer id={id} next={nextId} queue={nextQueue} name={name}/>;
    }

    return NotFound;
}

export default function App() {
    const [path, setPath] = useState(() => window.location.hash.slice(1) || '/');

    useEffect(() => {
        const handler = () => setPath(window.location.hash.slice(1) || '/');
        window.addEventListener('hashchange', handler);
        return () => window.removeEventListener('hashchange', handler);
    }, []);

    const Page = resolveRoute(path);

    return (
        <>
            <ThemeProvider theme={hackerTheme}>
                <GlobalStyles styles={{
                    a: {
                        color: cssVars.green, textDecoration: 'none',
                        fontFamily: '"Source Code Pro", monospace'
                    },
                    html: { backgroundColor: cssVars.gray },
                    body: { backgroundColor: cssVars.gray },
                    '#root': { backgroundColor: cssVars.gray, minHeight: '100vh' }
                }}/>
                <nav style={{ marginBottom: 16, textAlign: 'center' }}>
                    <a href={`#/tv`}>TV</a> | {' '}
                    <a href={`#/audiobooks`}>AudioBooks</a> | {' '}
                    <a href={`#/movies`}>Movies</a> | {' '}
                    <a href={`#/admin`}>Admin</a>
                </nav>
                <Page/>
            </ThemeProvider>
        </>
    );
}
