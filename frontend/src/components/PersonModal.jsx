import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Grid, FormControl, InputLabel, Select, MenuItem, FormLabel, RadioGroup, FormControlLabel, Radio } from '@mui/material';

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

export default function PersonModal({ open, onClose, person, onSave }) {
    const [form, setForm] = useState(initialForm);

    useEffect(() => {
        if (open) {
            setForm(person || initialForm);
        }
    }, [open, person]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
        // Validation could be added here
        onSave(form);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 2 } }}>
            <DialogTitle>{person ? 'Editează Persoană' : 'Adaugă Persoană Nouă'}</DialogTitle>
            <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Nume de familie" name="name" value={form.name} onChange={handleChange} required size="small" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Prenume" name="fname" value={form.fname} onChange={handleChange} required size="small" />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="CNP" name="cnp" value={form.cnp} onChange={handleChange} size="small" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="CIM" name="cim" value={form.cim} onChange={handleChange} size="small" />
                    </Grid>

                    <Grid item xs={12}>
                        <FormControl component="fieldset">
                            <FormLabel component="legend">Tip Activitate Implicită</FormLabel>
                            <RadioGroup row name="type" value={form.type} onChange={handleChange}>
                                <FormControlLabel value="Cercetare" control={<Radio color="secondary" />} label="Cercetare" />
                                <FormControlLabel value="Management" control={<Radio color="primary" />} label="Management" />
                            </RadioGroup>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="Normă (h/zi)" type="number" name="norma" value={form.norma} onChange={handleChange} size="small" />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="Ore Proiect / zi" type="number" name="defaultOre" value={form.defaultOre} onChange={handleChange} size="small" />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="Ore de Bază / zi" type="number" name="defaultNorma" value={form.defaultNorma} onChange={handleChange} size="small" />
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
