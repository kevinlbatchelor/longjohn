/* hackerTheme.ts */
import { createTheme } from '@mui/material/styles';

export const cssVars = {
    green: '#00ff00',
    black: '#000000',
    gray:  '#121212',
};

export const hackerTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: cssVars.green },
        background: { default: cssVars.gray, paper: cssVars.black },
        text: { primary: cssVars.green, secondary: cssVars.green },
    },

    typography: {
        fontFamily: '"Source Code Pro", monospace',
        allVariants: { color: cssVars.green },
    },

    components: {
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundColor: cssVars.black,
                    backgroundImage: 'none', // remove subtle dark-mode gradients
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: cssVars.black,
                    color: cssVars.green,
                },
            },
        },
        MuiList:          { styleOverrides: { root: { backgroundColor: cssVars.black } } },
        MuiAccordion:     { styleOverrides: { root: { backgroundColor: cssVars.black } } },
        MuiDrawer:        { styleOverrides: { paper: { backgroundColor: cssVars.black } } },
        MuiMenu:          { styleOverrides: { paper: { backgroundColor: cssVars.black } } },
        MuiPopover:       { styleOverrides: { paper: { backgroundColor: cssVars.black } } },
        MuiDialog:        { styleOverrides: { paper: { backgroundColor: cssVars.black } } },
        MuiButton: {
            styleOverrides: {
                root: {
                    color: cssVars.green,
                    backgroundColor: cssVars.black,
                    '&:hover': { backgroundColor: cssVars.green, color: cssVars.black },
                },
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    color: cssVars.green,
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: cssVars.green },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: cssVars.green },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: cssVars.green },
                },
                input: { color: cssVars.green, backgroundColor: cssVars.black },
            },
        },
        MuiFilledInput: {
            styleOverrides: {
                root: {
                    color: cssVars.green,
                    backgroundColor: cssVars.black,
                    '&:before, &:after': { borderColor: `${cssVars.green} !important` },
                },
                input: { color: cssVars.green },
            },
        },
        MuiInput: {
            styleOverrides: {
                root: {
                    color: cssVars.green,
                    '&:before, &:after': { borderColor: `${cssVars.green} !important` },
                },
                input: { color: cssVars.green },
            },
        },

        /* Labels, icons, links, etc. ------------------------------------------ */
        MuiInputLabel: { styleOverrides: { root: { color: cssVars.green, '&.Mui-focused': { color: cssVars.green } } } },
        MuiSelect:     { styleOverrides: { icon: { color: cssVars.green } } },
        MuiLink:       { styleOverrides: { root: { color: cssVars.green } } },
    },
});
