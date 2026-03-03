import React, { useState } from 'react';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Divider, IconButton, AppBar, Toolbar } from '@mui/material';
import { NavLink, useLocation } from 'react-router-dom';
import FolderIcon from '@mui/icons-material/Folder';
import PeopleIcon from '@mui/icons-material/People';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PrintIcon from '@mui/icons-material/Print';
import MenuIcon from '@mui/icons-material/Menu';

const drawerWidth = 260;

const menuItems = [
    { text: 'Proiecte', route: '/projects', icon: <FolderIcon /> },
    { text: 'Bază persoane', route: '/persons', icon: <PeopleIcon /> },
    { text: 'Pontaj Individual', route: '/pontaj', icon: <CalendarMonthIcon /> },
    { text: 'Istoric & Rapoarte', route: '/history', icon: <AssessmentIcon /> },
    // { text: 'Generare Fișe', route: '/export', icon: <PrintIcon /> },
];

export default function Layout({ children }) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();

    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

    const drawerContent = (
        <Box sx={{ height: '100%', bgcolor: '#111827', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h5" sx={{ mr: 1 }}>🇪🇺</Typography>
                <Typography variant="h6" fontWeight="bold">Pontaj Manager</Typography>
            </Box>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />
            <List sx={{ px: 2, mt: 2, flex: 1 }}>
                {menuItems.map((item) => {
                    const active = location.pathname.startsWith(item.route);
                    return (
                        <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                            <ListItemButton
                                component={NavLink}
                                to={item.route}
                                sx={{
                                    borderRadius: 2,
                                    bgcolor: active ? 'rgba(59, 111, 255, 0.1)' : 'transparent',
                                    color: active ? '#3b6fff' : '#9ca3af',
                                    '&:hover': {
                                        bgcolor: active ? 'rgba(59, 111, 255, 0.2)' : 'rgba(255,255,255,0.05)',
                                    },
                                }}
                            >
                                <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>{item.icon}</ListItemIcon>
                                <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: active ? 600 : 500 }} />
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>
            <Box sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary" align="center">v2.1 (React)</Typography>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            <AppBar position="fixed" sx={{ width: { sm: `calc(100% - ${drawerWidth}px)` }, ml: { sm: `${drawerWidth}px` }, bgcolor: 'background.default', backgroundImage: 'none', boxShadow: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', display: { sm: 'none' } }}>
                <Toolbar>
                    <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { sm: 'none' } }}>
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" noWrap component="div">Pontaj Manager</Typography>
                </Toolbar>
            </AppBar>

            <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
                {/* Mobile drawer */}
                <Drawer variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: 'none' } }}>
                    {drawerContent}
                </Drawer>
                {/* Desktop drawer */}
                <Drawer variant="permanent" sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: '1px solid rgba(255,255,255,0.05)' } }} open>
                    {drawerContent}
                </Drawer>
            </Box>

            <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 4 }, mt: { xs: 8, sm: 0 }, overflow: 'auto', bgcolor: 'background.default' }}>
                {children}
            </Box>
        </Box>
    );
}
