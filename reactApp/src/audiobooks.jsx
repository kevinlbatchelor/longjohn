import React, { useEffect, useState } from 'react';
import {
    Grid,
    Card,
    CardMedia,
    CardContent,
    Typography,
    CircularProgress,
    Alert,
    Box
} from '@mui/material';
import MenuBookRounded from '@mui/icons-material/MenuBookRounded';

const API_ROOT = 'http://192.168.1.12:3000/api/v1/audioBooks';
// const API_ROOT = 'http://localhost:3000/api/v1/audioBooks';
// const COVER_ROOT = 'http://localhost:3000/api/v1/cover';
const COVER_ROOT = 'http://192.168.1.12:3000/api/v1/cover';
// → http://localhost:3000/cover

/* helper to trigger ZIP download ------------------------------------------------ */
function downloadZip(name) {
    const a = document.createElement('a');
    a.href = `${API_ROOT}/${encodeURIComponent(name)}/zip`;
    a.setAttribute('download', '');
    document.body.appendChild(a);
    a.click();
    a.remove();
}

/* single book card -------------------------------------------------------------- */
function BookCard({ name }) {
    const [imgError, setImgError] = useState(false);
    const coverUrl = `${COVER_ROOT}/${encodeURIComponent(name)}-audio`;

    return (
        <Card
            sx={{
                height: '100%',
                background: '#111',
                width: '200px',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {imgError ? (
                <Box
                    sx={{
                        height: 260,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#000'
                    }}
                >
                    <MenuBookRounded sx={{ fontSize: 80, color: '#0f0' }} />
                </Box>
            ) : (
                <CardMedia
                    component="img"
                    image={coverUrl}
                    alt={name}
                    sx={{ height: 260, background: '#000' }}
                    onError={() => setImgError(true)}
                />
            )}

            <CardContent sx={{ py: 1 }}>
                <Typography
                    variant="subtitle1"
                    sx={{ color: '#0f0', cursor: 'pointer' }}
                    noWrap
                    onClick={() => downloadZip(name)}
                    title={`Download ${name} ZIP`}
                >
                    {name}
                </Typography>
            </CardContent>
        </Card>
    );
}

/* main grid --------------------------------------------------------------------- */
export default function Audiobooks() {
    const [books,   setBooks]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);

    useEffect(() => {
        fetch(API_ROOT)
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then(data => {
                setBooks(data);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    if (loading) return <Centered><CircularProgress sx={{ color: '#0f0' }} /></Centered>;
    if (error)   return <Centered><Alert severity="error">Load error – {error}</Alert></Centered>;

    return (
        <Grid container spacing={2}>
            {books.map(({ name }) => (
                <Grid item key={name} xs={12} sm={6} md={3}>
                    <BookCard name={name} />
                </Grid>
            ))}
        </Grid>
    );
}

/* centered wrapper ------------------------------------------------------------- */
const Centered = ({ children }) => (
    <Grid container justifyContent="center" alignItems="center" sx={{ mt: 8 }}>
        {children}
    </Grid>
);
