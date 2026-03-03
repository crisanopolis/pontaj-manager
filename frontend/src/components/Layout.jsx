import React, { useState, useEffect } from 'react';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Divider, IconButton, AppBar, Toolbar } from '@mui/material';
import { NavLink, useLocation } from 'react-router-dom';
import FolderIcon from '@mui/icons-material/Folder';
import PeopleIcon from '@mui/icons-material/People';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AssessmentIcon from '@mui/icons-material/Assessment';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PrintIcon from '@mui/icons-material/Print';
import MenuIcon from '@mui/icons-material/Menu';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import CircleIcon from '@mui/icons-material/Circle';

const drawerWidth = 230;

const menuItems = [
    { text: 'Proiecte', route: '/projects', icon: <FolderIcon sx={{ fontSize: 18 }} /> },
    { text: 'Bază persoane', route: '/persons', icon: <PeopleIcon sx={{ fontSize: 18 }} /> },
    { text: 'Pontaj Individual', route: '/pontaj', icon: <CalendarMonthIcon sx={{ fontSize: 18 }} /> },
    { text: 'Import Pontaj', route: '/import', icon: <UploadFileIcon sx={{ fontSize: 18 }} /> },
];

export default function Layout({ children }) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(window.navigator.onLine);
    const location = useLocation();

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

    const drawerContent = (
        <Box sx={{ height: '100%', bgcolor: 'background.paper', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: '20px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #222c42' }}>
                <Box className="eu-flag" sx={{
                    width: 38, height: 38, bgcolor: '#003399', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px', border: '2px solid #ffd700', flexShrink: 0
                }}>🇪🇺</Box>
                <Box>
                    <Typography variant="h6" sx={{
                        fontSize: '14px', fontWeight: 700,
                        background: 'linear-gradient(90deg, #00c2ff, #3b6fff)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        lineHeight: 1.2
                    }}>Pontaj Manager</Typography>
                    <Typography variant="caption" sx={{ fontSize: '10px', color: '#6a7a96', display: 'block', mt: '1px' }}>BlueSpace Technology</Typography>
                </Box>
            </Box>
            <List sx={{ px: 1, mt: 1.5, flex: 1 }}>
                {menuItems.map((item) => {
                    const active = location.pathname.startsWith(item.route);
                    return (
                        <ListItem key={item.text} disablePadding sx={{ mb: '2px' }}>
                            <ListItemButton
                                component={NavLink}
                                to={item.route}
                                sx={{
                                    borderRadius: '8px',
                                    py: '10px',
                                    px: '12px',
                                    bgcolor: active ? 'rgba(59, 111, 255, 0.15)' : 'transparent',
                                    color: active ? '#00c2ff' : '#6a7a96',
                                    border: active ? '1px solid rgba(59, 111, 255, 0.25)' : '1px solid transparent',
                                    '&:hover': {
                                        bgcolor: active ? 'rgba(59, 111, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                        color: active ? '#00c2ff' : '#e8eaf0'
                                    },
                                    transition: 'all .15s'
                                }}
                            >
                                <ListItemIcon sx={{ color: 'inherit', minWidth: 32 }}>{item.icon}</ListItemIcon>
                                <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: active ? 600 : 500, fontSize: '13px' }} />
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>
            <Box sx={{ p: '12px 8px', borderTop: '1px solid #222c42' }}>
                <Typography variant="body2" color="text.secondary" align="center" sx={{ fontSize: '11px', letterSpacing: '0.5px' }}>v2.1 (React)</Typography>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>
            {/* Global Top Bar */}
            <AppBar
                position="fixed"
                sx={{
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    ml: { sm: `${drawerWidth}px` },
                    bgcolor: 'rgba(10, 13, 22, 0.7)',
                    backdropFilter: 'blur(8px)',
                    backgroundImage: 'none',
                    boxShadow: 'none',
                    borderBottom: '1px solid #222c42',
                    zIndex: (theme) => theme.zIndex.drawer - 1
                }}
            >
                <Toolbar sx={{ minHeight: '56px !important', px: { xs: 2, sm: 3 } }}>
                    <IconButton
                        color="inherit"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { sm: 'none' }, color: '#6a7a96' }}
                    >
                        <MenuIcon />
                    </IconButton>

                    <Box sx={{ flexGrow: 1 }} />

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {!isOnline && (
                            <Box sx={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                bgcolor: 'rgba(231, 76, 60, 0.15)', px: '10px', py: '4px',
                                borderRadius: '6px', border: '1px solid rgba(231, 76, 60, 0.3)'
                            }}>
                                <WifiOffIcon sx={{ fontSize: 16, color: '#e74c3c' }} />
                                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#e74c3c' }}>OFFLINE</Typography>
                            </Box>
                        )}

                        {isOnline && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.8 }}>
                                <CircleIcon sx={{ fontSize: 8, color: '#27ae60' }} />
                                <Typography sx={{ fontSize: '10px', fontWeight: 600, color: '#6a7a96', letterSpacing: '0.5px' }}>CONECTAT</Typography>
                            </Box>
                        )}

                        <Divider orientation="vertical" flexItem sx={{ my: 1, borderColor: '#222c42' }} />

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Box sx={{ textAlign: 'right', display: { xs: 'none', md: 'block' } }}>
                                <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#e8eaf0', lineHeight: 1 }}>Adrian Dragomir</Typography>
                                <Typography sx={{ fontSize: '10px', color: '#6a7a96', mt: '2px' }}>Administrator</Typography>
                            </Box>
                            <Box sx={{
                                width: 32, height: 32, borderRadius: '8px',
                                bgcolor: 'rgba(59, 111, 255, 0.15)', border: '1px solid rgba(59, 111, 255, 0.25)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#00c2ff', fontWeight: 700, fontSize: '13px'
                            }}>AD</Box>
                        </Box>
                    </Box>
                </Toolbar>
            </AppBar>

            <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: 'block', sm: 'none' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: '1px solid #222c42', bgcolor: 'background.paper' }
                    }}
                >
                    {drawerContent}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', sm: 'block' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: '1px solid #222c42', bgcolor: 'background.paper' }
                    }}
                    open
                >
                    {drawerContent}
                </Drawer>
            </Box>

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: { xs: 2.5, sm: 4 },
                    pt: { xs: '84px', sm: '88px' }, // Offset for the fixed AppBar
                    height: '100vh',
                    overflow: 'auto',
                    bgcolor: 'background.default'
                }}
            >
                <Box sx={{ maxWidth: '1400px', mx: 'auto' }}>
                    {children}
                </Box>
            </Box>
        </Box>
    );
}
