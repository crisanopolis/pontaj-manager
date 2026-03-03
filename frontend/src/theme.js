import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#3b6fff',
            light: '#5a8dff',
            dark: '#2d55cc',
        },
        secondary: {
            main: '#27ae60',
        },
        background: {
            default: '#0f172a', // Deep slate
            paper: '#1e293b',   // Card background
        },
        text: {
            primary: '#f1f5f9',
            secondary: '#94a3b8',
        },
        divider: 'rgba(255, 255, 255, 0.08)',
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: { fontSize: '1.75rem', fontWeight: 700 },
        h2: { fontSize: '1.5rem', fontWeight: 600 },
        h3: { fontSize: '1.25rem', fontWeight: 600 },
        subtitle1: { fontSize: '1rem', color: '#94a3b8' },
    },
    shape: {
        borderRadius: 12,
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 8,
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: '0px 4px 12px rgba(0,0,0,0.2)',
                    }
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    backgroundImage: 'none',
                    border: '1px solid rgba(255,255,255,0.05)',
                }
            }
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                }
            }
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                },
                head: {
                    fontWeight: 600,
                    backgroundColor: '#0f172a',
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',
                    letterSpacing: '0.5px'
                }
            }
        }
    },
});
