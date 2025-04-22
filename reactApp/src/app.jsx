import React, { useState, useEffect } from 'react';
import Audiobooks from './audiobooks';
import GlobalStyles from '@mui/material/GlobalStyles';
import { hackerStyles } from './styles';   // explicit import

const Home = () => <h2>Home page</h2>;
const NotFound = () => <h2>404 – Not found</h2>;

const routes = {
    '/': Home,
    '/audiobooks': Audiobooks
};

export default function App() {
    const [path, setPath] = useState(() => window.location.hash.slice(1) || '/');

    useEffect(() => {
        const handler = () => setPath(window.location.hash.slice(1) || '/');
        window.addEventListener('hashchange', handler);
        return () => window.removeEventListener('hashchange', handler);
    }, []);

    const Page = routes[path] || NotFound;
    const host = BASE_HOST || '';

    return (
        <>
            <GlobalStyles styles={hackerStyles}/>

            <nav style={{ marginBottom: 16, textAlign: 'center' }}>
                <a href={`${host}/#/movies`}>Movies</a> | {' '}
                <a href={`${host}/#/tvs`}>TV</a> | {' '}
                <a href={`#/audiobooks`}>AudioBooks</a> | {' '}
                <a href={`${host}/#/admin`}>Admin</a>
            </nav>

            <Page/>
        </>
    );
}
