import { createTheme } from '@mui/material/styles';

const originalVars = {
    bg: '#0a0d16',
    surface: '#111520',
    surface2: '#181e2e',
    border: '#222c42',
    accent: '#3b6fff',
    accent2: '#00c2ff',
    green: '#27ae60',
    gold: '#f5a623',
    red: '#e74c3c',
    purple: '#9b59b6',
    text: '#e8eaf0',
    textMuted: '#6a7a96',
    navW: 230,
    radius: 12,
};

export const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: originalVars.accent,
            light: originalVars.accent2,
            contrastText: '#fff'
        },
        secondary: {
            main: originalVars.accent2,
        },
        background: {
            default: originalVars.bg,
            paper: originalVars.surface,
        },
        text: {
            primary: originalVars.text,
            secondary: originalVars.textMuted,
        },
        divider: originalVars.border,
        success: { main: originalVars.green },
        warning: { main: originalVars.gold },
        error: { main: originalVars.red },
    },
    typography: {
        fontFamily: '"Inter", sans-serif',
        h1: {
            fontSize: '24px',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            backgroundImage: `linear-gradient(90deg, #fff, ${originalVars.textMuted})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
        },
        h2: { fontSize: '20px', fontWeight: 700, color: '#fff' },
        h3: { fontSize: '18px', fontWeight: 600, color: originalVars.text },
        subtitle1: { fontSize: '13px', color: originalVars.textMuted, lineHeight: 1.4 },
        body1: { fontSize: '14px', color: originalVars.text },
        body2: { fontSize: '13px', color: originalVars.textMuted },
        button: { textTransform: 'none', fontWeight: 600, fontSize: '13px' },
        caption: { fontSize: '11px', color: originalVars.textMuted },
    },
    shape: {
        borderRadius: originalVars.radius,
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    backgroundColor: originalVars.bg,
                    color: originalVars.text,
                    fontFamily: '"Inter", sans-serif',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    fontWeight: 600,
                    padding: '8px 16px',
                    transition: 'all .15s',
                    boxShadow: 'none',
                    '&:hover': {
                        transform: 'translateY(-1px)',
                    },
                },
                containedPrimary: {
                    background: `linear-gradient(135deg, ${originalVars.accent}, ${originalVars.accent2})`,
                    boxShadow: '0 4px 14px rgba(59, 111, 255, .35)',
                    '&:hover': {
                        background: `linear-gradient(135deg, ${originalVars.accent}, ${originalVars.accent2})`,
                        boxShadow: '0 6px 18px rgba(59, 111, 255, .45)',
                    },
                },
                outlinedPrimary: {
                    borderColor: 'rgba(59, 111, 255, 0.4)',
                    backgroundColor: 'rgba(59, 111, 255, 0.05)',
                    '&:hover': {
                        backgroundColor: 'rgba(59, 111, 255, 0.1)',
                        borderColor: originalVars.accent,
                    },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundColor: originalVars.surface,
                    border: `1px solid ${originalVars.border}`,
                    borderRadius: originalVars.radius,
                    backgroundImage: 'none',
                    boxShadow: 'none',
                    '&:hover': {
                        borderColor: 'rgba(59, 111, 255, 0.4)',
                        boxShadow: '0 8px 30px rgba(0, 0, 0, .4)',
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundColor: originalVars.surface,
                    border: `1px solid ${originalVars.border}`,
                    backgroundImage: 'none',
                    boxShadow: 'none',
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    borderBottom: `1px solid ${originalVars.border}`,
                    padding: '10px 14px',
                },
                head: {
                    backgroundColor: originalVars.surface,
                    color: originalVars.textMuted,
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '.8px',
                },
            },
        },
        MuiTableRow: {
            styleOverrides: {
                root: {
                    transition: 'background .15s',
                    '&:hover': {
                        backgroundColor: `${originalVars.surface2} !important`,
                    },
                },
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    backgroundColor: originalVars.surface2,
                    '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: originalVars.border,
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: originalVars.accent,
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: originalVars.accent,
                        boxShadow: `0 0 0 3px rgba(59, 111, 255, 0.15)`,
                    },
                },
                input: {
                    padding: '9px 12px',
                    fontSize: '13px',
                },
            },
        },
    },
});
