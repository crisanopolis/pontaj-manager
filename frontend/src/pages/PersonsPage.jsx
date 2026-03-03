import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, CircularProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import api from '../api/client';
import { useSnackbar } from 'notistack';
import PersonModal from '../components/PersonModal';

export default function PersonsPage() {
    const [persons, setPersons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const { enqueueSnackbar } = useSnackbar();

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedPerson, setSelectedPerson] = useState(null);

    useEffect(() => {
        fetchPersons();
    }, [search]); // re-fetch on search change

    const fetchPersons = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/persons?search=${encodeURIComponent(search)}`);
            // Extrage randurile depinzand de payload
            const list = res.data.rows || res.data;
            setPersons(Array.isArray(list) ? list : []);
        } catch (e) {
            enqueueSnackbar(e.message, { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSavePerson = async (formData) => {
        try {
            if (formData.id) {
                await api.put(`/persons/${formData.id}`, formData);
                enqueueSnackbar('Persoană actualizată!', { variant: 'success' });
            } else {
                await api.post('/persons', formData);
                enqueueSnackbar('Persoană nouă adăugată!', { variant: 'success' });
            }
            setModalOpen(false);
            fetchPersons();
        } catch (e) {
            enqueueSnackbar('Eroare: ' + e.message, { variant: 'error' });
        }
    };

    const handleChangePage = (event, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const currentData = persons.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h1" gutterBottom>Bază persoane</Typography>
                    <Typography variant="subtitle1">Gestionează personalul pentru pontaje ({persons.length} pers.)</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                        size="small"
                        placeholder="Caută nume sau CNP..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>
                            ),
                        }}
                        sx={{ width: 250, bgcolor: 'background.paper', borderRadius: 1 }}
                    />
                    <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={() => { setSelectedPerson(null); setModalOpen(true); }}>Adaugă persoană</Button>
                </Box>
            </Box>

            <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                <TableContainer sx={{ maxHeight: '65vh' }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell>Nume complet</TableCell>
                                <TableCell>CNP / Angajator</TableCell>
                                <TableCell>Tip</TableCell>
                                <TableCell align="right">Normă (Lună)</TableCell>
                                <TableCell align="right">Acțiuni</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}><CircularProgress /></TableCell></TableRow>
                            ) : currentData.length === 0 ? (
                                <TableRow><TableCell colSpan={5} align="center">Nicio persoană găsită.</TableCell></TableRow>
                            ) : (
                                currentData.map((row) => (
                                    <TableRow hover key={row.id}>
                                        <TableCell>
                                            <Typography variant="body1" fontWeight="500">{row.name} {row.fname}</Typography>
                                            {row.cim && <Typography variant="caption" color="text.secondary">CIM: {row.cim}</Typography>}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{row.cnp || '–'}</Typography>
                                            <Typography variant="caption" color="primary.light">{row.partner || '–'}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{
                                                px: 1, py: 0.5, borderRadius: 1, display: 'inline-block', fontSize: '0.75rem',
                                                bgcolor: row.type === 'Management' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(232, 121, 249, 0.15)',
                                                color: row.type === 'Management' ? '#38bdf8' : '#e879f9'
                                            }}>
                                                {row.type || 'Cercetare'}
                                            </Box>
                                        </TableCell>
                                        <TableCell align="right">
                                            {row.norma}h/zi ({row.defaultNorma}h/lună)
                                        </TableCell>
                                        <TableCell align="right">
                                            <Button size="small" variant="outlined" sx={{ py: 0.2 }} onClick={() => { setSelectedPerson(row); setModalOpen(true); }}>Editează</Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    component="div"
                    count={persons.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Rânduri pe pagină:"
                />
            </Paper>

            {/* MODAL */}
            <PersonModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                person={selectedPerson}
                onSave={handleSavePerson}
            />
        </Box>
    );
}
