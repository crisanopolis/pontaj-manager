import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DashboardGlobal from '../DashboardGlobal';
import { SnackbarProvider } from 'notistack';

// Mock api client
vi.mock('../../api/client', () => ({
    default: {
        get: vi.fn(() => Promise.resolve({ data: { members: [] } }))
    }
}));

describe('DashboardGlobal Component', () => {
    it('renders dashboard title', () => {
        render(
            <SnackbarProvider>
                <DashboardGlobal />
            </SnackbarProvider>
        );
        expect(screen.getByText(/Statistici Generale/i)).toBeInTheDocument();
    });

    it('renders month and year selectors', () => {
        render(
            <SnackbarProvider>
                <DashboardGlobal />
            </SnackbarProvider>
        );
        expect(screen.getByLabelText(/Luna/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Anul/i)).toBeInTheDocument();
    });
});
