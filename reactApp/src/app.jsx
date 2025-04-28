import React, { useEffect, useState } from 'react';
import Audiobooks from './audiobooks';
import Movies from './movies';
import { GlobalStyles, ThemeProvider } from '@mui/material';
import { cssVars, hackerTheme } from './hackerStyles.jsx';
import MoviePlayer from './moviePlayer.jsx';

const Home = () => <h2>Home page</h2>;
const NotFound = () => <h2>404 – Not found</h2>;

const routes = {
    '/': Home,
    '/audiobooks': Audiobooks,
    '/movies': Movies
};

function resolveRoute(path) {
    if (routes[path]) return routes[path];

    const match = path.match(/^\/play\/([^/]+)$/);
    if (match) {
        const id = match[1];
        return () => <MoviePlayer id={id}/>;
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
    const host = BASE_HOST || '';

    return (
        <>
            <ThemeProvider theme={hackerTheme}>
                <GlobalStyles styles={{
                    a: { color: cssVars.green, textDecoration: 'none' },
                    html: { backgroundColor: '#121212' },
                    body: { backgroundColor: '#121212' },
                    '#root': { backgroundColor: '#121212', minHeight: '100vh' }
                }}/>
                <nav style={{ marginBottom: 16, textAlign: 'center' }}>
                    <a href={`${host}/#/tvs`}>TV</a> | {' '}
                    <a href={`#/audiobooks`}>AudioBooks</a> | {' '}
                    <a href={`#/movies`}>Movies</a> | {' '}
                    <a href={`${host}/#/admin`}>Admin</a>
                </nav>
                <Page/>
            </ThemeProvider>
        </>
    );
}
