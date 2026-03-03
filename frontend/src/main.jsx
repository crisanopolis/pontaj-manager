import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';
import { SnackbarProvider } from 'notistack';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <App />
      </SnackbarProvider>
    </ThemeProvider>
  </React.StrictMode>
);
