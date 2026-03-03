import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Grid, FormControl, InputLabel, Select, MenuItem, FormLabel, RadioGroup, FormControlLabel, Radio, IconButton, Typography, Divider, Box } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleIcon from '@mui/icons-material/AddCircle';

const initialForm = {
    name: '',
    fname: '',
    cnp: '',
    cim: '',
    cor: '',
    type: 'Cercetare',
    norma: 8,
    defaultOre: 8,
    defaultNorma: 0,
    employers: []
};

const emptyEmployer = {
    id: '',
    name: '',
    partner: '',
    norma: 0,
    normaUnit: 'luna',
    ore: 8,
    oreUnit: 'zi'
};

export default function PersonModal({ open, onClose, person, onSave }) {
    const [form, setForm] = useState(initialForm);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (open) {
            const data = person ? { ...initialForm, ...person } : initialForm;
            if (!data.employers) data.employers = [];
            setForm(data);
            setErrors({});
        }
    }, [open, person]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleEmployerChange = (index, field, value) => {
        const newEmployers = [...form.employers];
        newEmployers[index] = { ...newEmployers[index], [field]: value };
        setForm(prev => ({ ...prev, employers: newEmployers }));
    };

    const addEmployer = () => {
        setForm(prev => ({
            ...prev,
            employers: [...prev.employers, { ...emptyEmployer, id: 'E' + Math.random().toString(36).slice(2, 5).toUpperCase() }]
        }));
    };

    const removeEmployer = (index) => {
        const newEmployers = form.employers.filter((_, i) => i !== index);
        setForm(prev => ({ ...prev, employers: newEmployers }));
    };

    const validate = () => {
        const newErrors = {};
        if (!form.name?.trim()) newErrors.name = 'Numele este obligatoriu';
        if (!form.fname?.trim()) newErrors.fname = 'Prenumele este obligatoriu';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (validate()) {
            onSave(form);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 2 } }}>
            <DialogTitle>{person ? 'Editează Persoană' : 'Adaugă Persoană Nouă'}</DialogTitle>
            <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    <Grid item xs={12} sm={4}>
                        <TextField
                            fullWidth label="Nume de familie" name="name" value={form.name} onChange={handleChange}
                            required size="small" error={!!errors.name} helperText={errors.name}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField
                            fullWidth label="Prenume" name="fname" value={form.fname} onChange={handleChange}
                            required size="small" error={!!errors.fname} helperText={errors.fname}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="CNP" name="cnp" value={form.cnp} onChange={handleChange} size="small" />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="CIM" name="cim" value={form.cim} onChange={handleChange} size="small" />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="COR" name="cor" value={form.cor} onChange={handleChange} size="small" />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="Normă Implicită (h/zi)" type="number" name="norma" value={form.norma} onChange={handleChange} size="small" />
                    </Grid>

                    <Grid item xs={12}>
                        <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700 }}>Contracte / Angajatori</Typography>
                        </Divider>
                    </Grid>

                    {form.employers.map((emp, idx) => (
                        <Grid item xs={12} key={emp.id || idx}>
                            <Box sx={{ p: 2, border: '1px solid #222c42', borderRadius: '8px', position: 'relative', bgcolor: 'rgba(255,255,255,0.02)' }}>
                                <IconButton
                                    size="small" color="error"
                                    onClick={() => removeEmployer(idx)}
                                    sx={{ position: 'absolute', top: 8, right: 8 }}
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>

                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={4}>
                                        <TextField fullWidth label="Nume Firmă" value={emp.name} onChange={(e) => handleEmployerChange(idx, 'name', e.target.value)} size="small" />
                                    </Grid>
                                    <Grid item xs={12} sm={2}>
                                        <TextField fullWidth label="Cod Partener (ex: LP-BST)" value={emp.partner} onChange={(e) => handleEmployerChange(idx, 'partner', e.target.value)} size="small" />
                                    </Grid>
                                    <Grid item xs={12} sm={2}>
                                        <TextField fullWidth label="Ore/zi" type="number" value={emp.ore} onChange={(e) => handleEmployerChange(idx, 'ore', parseFloat(e.target.value))} size="small" />
                                    </Grid>
                                    <Grid item xs={12} sm={2}>
                                        <TextField fullWidth label="Normă Lună" type="number" value={emp.norma} onChange={(e) => handleEmployerChange(idx, 'norma', parseFloat(e.target.value))} size="small" />
                                    </Grid>
                                    <Grid item xs={12} sm={2}>
                                        <Select fullWidth value={emp.normaUnit} onChange={(e) => handleEmployerChange(idx, 'normaUnit', e.target.value)} size="small" sx={{ fontSize: '11px' }}>
                                            <MenuItem value="luna">h / lună</MenuItem>
                                            <MenuItem value="an">h / an</MenuItem>
                                        </Select>
                                    </Grid>
                                </Grid>
                            </Box>
                        </Grid>
                    ))}

                    <Grid item xs={12}>
                        <Button startIcon={<AddCircleIcon />} onClick={addEmployer} sx={{ color: 'primary.light' }}>
                            Adaugă Contract Nou
                        </Button>
                    </Grid>

                </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} color="inherit">Renunță</Button>
                <Button onClick={handleSubmit} variant="contained" color="primary">Salvează</Button>
            </DialogActions>
        </Dialog>
    );
}
