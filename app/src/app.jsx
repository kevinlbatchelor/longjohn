import React, { useEffect, useState } from 'react';
import Audiobooks from './audiobooks';
import EBooks from './ebooks';
import Movies from './movies';
import { GlobalStyles, ThemeProvider } from '@mui/material';
import { cssVars, hackerTheme } from './styles.jsx';
import MoviePlayer from './moviePlayer.jsx';
import Admin from './admin';
import TV, { ShowEpisodes } from './tv';
import { TV_APP } from './baseHost';

const NotFound = () => <h2>404 – Not found</h2>;

const routes = {
    '/': Movies,
    '/audiobooks': Audiobooks,
    '/ebooks': EBooks,
    '/movies': Movies,
    '/admin': Admin,
    '/tv': TV
};

const TV_ROUTES = new Set(['/', '/movies', '/tv']);

// The menu. The TV app is for watching, so it gets the two video pages only.
const MENU = [
    ['#/tv', 'TV'],
    ['#/audiobooks', 'AudioBooks'],
    ['#/ebooks', 'eBooks'],
    ['#/movies', 'Movies'],
    ['#/admin', 'Admin']
].filter(([href]) => !TV_APP || TV_ROUTES.has(href.slice(1)));

/* Returns the element, not a component. Handing back a fresh arrow function per
   render gave React a new component type each time, so every re-render tore the
   whole page down and built it again - a full refetch for the lists and a
   discarded buffer for the player. The keys keep the one remount that is
   wanted: a new episode starts a fresh player. */
function renderRoute(path) {
    // The TV app has no books and no admin; a stray hash lands on the movies.
    const Exact = routes[TV_APP && !TV_ROUTES.has(path) && routes[path] ? '/movies' : path];
    if (Exact) return <Exact/>;

    const showMatch = path.match(/^\/show\/(.+)$/);
    if (showMatch) {
        const name = decodeURIComponent(showMatch[1]);
        return <ShowEpisodes key={name} name={name}/>;
    }

    const playMatch = path.match(/^\/play\/([^?]+)(?:\?(.+))?$/);
    if (playMatch) {
        const id = playMatch[1];
        const params = new URLSearchParams(playMatch[2] || '');
        // The show name is the whole contract now - the player looks the rest
        // of the run up from it rather than being handed it in the URL.
        const name = params.get('name') || '';

        return <MoviePlayer key={id} id={id} name={name}/>;
    }

    return <NotFound/>;
}

export default function App() {
    const [path, setPath] = useState(() => window.location.hash.slice(1) || '/');

    useEffect(() => {
        const handler = () => setPath(window.location.hash.slice(1) || '/');
        window.addEventListener('hashchange', handler);
        return () => window.removeEventListener('hashchange', handler);
    }, []);

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
                    {MENU.map(([href, label], i) => (
                        <React.Fragment key={href}>
                            {i > 0 && ' | '}
                            <a href={href}>{label}</a>
                        </React.Fragment>
                    ))}
                </nav>
                {renderRoute(path)}
            </ThemeProvider>
        </>
    );
}
