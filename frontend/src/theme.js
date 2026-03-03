import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#3b6fff',
            light: '#5a8dff',
            dark: '#2d55cc',
            contrastText: '#fff'
        },
        secondary: {
            main: '#00c2ff', // Vechiul --accent2
        },
        success: {
            main: '#27ae60', // --green
        },
        warning: {
            main: '#f5a623', // --gold
        },
        error: {
            main: '#e74c3c', // --red
        },
        info: {
            main: '#9b59b6', // --purple
        },
        background: {
            default: '#0a0d16', // --bg
            paper: '#111520',   // --surface
        },
        text: {
            primary: '#e8eaf0', // --text
            secondary: '#6a7a96', // --text-muted
        },
        divider: '#222c42', // --border
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
            fontSize: '24px',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            background: 'linear-gradient(90deg, #fff, #6a7a96)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
        },
        h2: { fontSize: '20px', fontWeight: 700, letterSpacing: '-0.01em', color: '#ffffff' },
        h3: { fontSize: '18px', fontWeight: 600, color: '#e8eaf0' },
        subtitle1: { fontSize: '13px', color: '#6a7a96', marginTop: '4px' },
        body1: { fontSize: '14px' },
        body2: { fontSize: '13px' },
        button: { textTransform: 'none', fontWeight: 600 },
        caption: { fontSize: '12px' },
    },
    shape: {
        borderRadius: 12, // var(--radius)
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    backgroundColor: '#0a0d16',
                    overflowX: 'hidden',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 8,
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: '0 4px 14px rgba(59, 111, 255, .20)' // old box-shadow
                    }
                },
                containedPrimary: {
                    background: 'linear-gradient(135deg, #3b6fff, #00c2ff)',
                    border: 'none',
                    color: '#fff',
                    '&:hover': {
                        transform: 'translateY(-1px)',
                    }
                },
                outlinedPrimary: {
                    borderColor: 'rgba(59,111,255,0.4)',
                    backgroundColor: 'rgba(59,111,255,0.05)',
                    '&:hover': {
                        backgroundColor: 'rgba(59,111,255,0.1)',
                    }
                }
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    backgroundImage: 'none',
                    backgroundColor: '#111520',
                    border: '1px solid #222c42',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    transition: 'all 0.2s ease-in-out',
                }
            }
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    backgroundColor: '#111520',
                    border: '1px solid #222c42',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
                    borderRadius: 12,
                }
            }
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    borderBottom: '1px solid #222c42',
                    color: '#e8eaf0',
                },
                head: {
                    fontWeight: 600,
                    backgroundColor: '#0a0d16',
                    color: '#6a7a96',
                    textTransform: 'uppercase',
                    fontSize: '11px',
                    letterSpacing: '0.5px',
                    borderBottom: '2px solid #222c42',
                }
            }
        },
        MuiTableRow: {
            styleOverrides: {
                root: {
                    '&.MuiTableRow-hover:hover': {
                        backgroundColor: 'rgba(255,255,255,0.02)',
                    }
                }
            }
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    backgroundColor: '#111520',
                    borderRight: '1px solid #222c42',
                }
            }
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    backgroundColor: '#0a0d16',
                    borderRadius: 8,
                    '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#222c42',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#3b6fff',
                    },
                }
            }
        },
        MuiSelect: {
            styleOverrides: {
                select: {
                    '&:focus': {
                        backgroundColor: 'transparent',
                    }
                }
            }
        },
        MuiMenuItem: {
            styleOverrides: {
                root: {
                    fontSize: '13px',
                    padding: '8px 16px',
                    '&.Mui-selected': {
                        backgroundColor: 'rgba(59,111,255,0.15)',
                        color: '#00c2ff',
                        '&:hover': {
                            backgroundColor: 'rgba(59,111,255,0.2)',
                        }
                    },
                    '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.05)',
                    }
                }
            }
        }
    },
});
