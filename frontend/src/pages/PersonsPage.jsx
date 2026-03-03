import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, CircularProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, TextField, InputAdornment, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import api from '../api/client';
import { useSnackbar } from 'notistack';
import PersonModal from '../components/PersonModal';

export default function PersonsPage() {
    const [persons, setPersons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('Toate');
    const [partnerFilter, setPartnerFilter] = useState('Toți');
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

    const partners = ['Toți', ...new Set(persons.map(p => p.partner).filter(Boolean))];

    const filteredPersons = persons.filter(p => {
        const matchesSearch = `${p.name} ${p.fname} ${p.cnp} ${p.partner}`.toLowerCase().includes(search.toLowerCase());
        const matchesType = typeFilter === 'Toate' || p.type === typeFilter;
        const matchesPartner = partnerFilter === 'Toți' || p.partner === partnerFilter;
        return matchesSearch && matchesType && matchesPartner;
    });

    const currentData = filteredPersons.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
        <Box sx={{ p: 0 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: '28px', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h1" gutterBottom sx={{ mb: 0.5 }}>Bază persoane</Typography>
                    <Typography variant="subtitle1">Gestionează personalul pentru pontaje ({persons.length} pers.)</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <Select
                            value={typeFilter}
                            onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
                            sx={{ height: 36, bgcolor: 'background.paper', fontSize: '13px' }}
                        >
                            <MenuItem value="Toate">Toate Tipurile</MenuItem>
                            <MenuItem value="Management">Management</MenuItem>
                            <MenuItem value="Cercetare">Cercetare</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <Select
                            value={partnerFilter}
                            onChange={(e) => { setPartnerFilter(e.target.value); setPage(0); }}
                            sx={{ height: 36, bgcolor: 'background.paper', fontSize: '13px' }}
                        >
                            {partners.map(part => <MenuItem key={part} value={part}>{part === 'Toți' ? 'Toți Partenerii' : part}</MenuItem>)}
                        </Select>
                    </FormControl>

                    <TextField
                        size="small"
                        placeholder="Caută..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment>
                            ),
                        }}
                        sx={{
                            width: 200,
                            '& .MuiOutlinedInput-root': { height: 36, bgcolor: 'background.paper' }
                        }}
                    />
                    <Button variant="contained" startIcon={<AddIcon sx={{ fontSize: 18 }} />} onClick={() => { setSelectedPerson(null); setModalOpen(true); }}>
                        Adaugă
                    </Button>
                </Box>
            </Box>

            <Paper sx={{ width: '100%', overflow: 'hidden', bgcolor: 'background.paper', border: '1px solid #222c42', borderRadius: '12px' }}>
                <TableContainer sx={{ maxHeight: 'calc(100vh - 250px)' }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ width: '30%' }}>Nume complet</TableCell>
                                <TableCell>CNP / Angajator</TableCell>
                                <TableCell>Tip</TableCell>
                                <TableCell align="right">Normă</TableCell>
                                <TableCell align="right">Acțiuni</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 10 }}><CircularProgress size={24} /></TableCell></TableRow>
                            ) : currentData.length === 0 ? (
                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}>Nicio persoană găsită.</TableCell></TableRow>
                            ) : (
                                currentData.map((row) => (
                                    <TableRow hover key={row.id}>
                                        <TableCell>
                                            <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>{row.name} {row.fname}</Typography>
                                            {row.cim && <Typography sx={{ fontSize: '10px', color: 'text.secondary' }}>CIM: {row.cim}</Typography>}
                                        </TableCell>
                                        <TableCell>
                                            <Typography sx={{ fontSize: '13px' }}>{row.cnp || '–'}</Typography>
                                            <Typography sx={{ fontSize: '10px', color: 'primary.light' }}>{row.partner || '–'}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{
                                                display: 'inline-block', px: '8px', py: '2px', borderRadius: '4px', fontSize: '10px',
                                                fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                                                bgcolor: row.type === 'Management' ? 'rgba(59, 111, 255, 0.18)' : 'rgba(155, 89, 182, 0.18)',
                                                color: row.type === 'Management' ? '#00c2ff' : '#bb8fce'
                                            }}>
                                                {row.type || 'Cercetare'}
                                            </Box>
                                        </TableCell>
                                        <TableCell align="right" sx={{ fontSize: '13px' }}>
                                            {row.norma}h/zi
                                        </TableCell>
                                        <TableCell align="right">
                                            <Button size="small" variant="outlined" sx={{ py: 0.2, fontSize: '11px' }} onClick={() => { setSelectedPerson(row); setModalOpen(true); }}>Editează</Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    component="div"
                    count={filteredPersons.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Rânduri:"
                    sx={{ color: 'text.secondary', borderTop: '1px solid #222c42' }}
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
