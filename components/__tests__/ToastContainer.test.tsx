import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastContainer } from '../ToastContainer';
import { ToastProvider, useToast } from '../../contexts/ToastContext';

function TestComponent({ type = 'success' as const, message = 'Test toast' }: { type?: 'success' | 'error' | 'warning' | 'info'; message?: string }) {
  const { addToast } = useToast();
  return (
    <button onClick={() => addToast(type, message)}>Add Toast</button>
  );
}

function renderWithProvider(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('ToastContainer', () => {
  it('renders nothing when there are no toasts', () => {
    const { container } = renderWithProvider(<ToastContainer />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a toast with the correct message', () => {
    renderWithProvider(
      <>
        <TestComponent message="Operation completed" />
        <ToastContainer />
      </>
    );

    fireEvent.click(screen.getByText('Add Toast'));
    expect(screen.getByText('Operation completed')).toBeInTheDocument();
  });

  it('applies correct styles for success type', () => {
    renderWithProvider(
      <>
        <TestComponent type="success" message="Success!" />
        <ToastContainer />
      </>
    );

    fireEvent.click(screen.getByText('Add Toast'));
    const toast = screen.getByText('Success!').closest('div')!;
    expect(toast.className).toContain('border-green-500');
  });

  it('applies correct styles for error type', () => {
    renderWithProvider(
      <>
        <TestComponent type="error" message="Error!" />
        <ToastContainer />
      </>
    );

    fireEvent.click(screen.getByText('Add Toast'));
    const toast = screen.getByText('Error!').closest('div')!;
    expect(toast.className).toContain('border-red-500');
  });

  it('applies correct styles for warning type', () => {
    renderWithProvider(
      <>
        <TestComponent type="warning" message="Warning!" />
        <ToastContainer />
      </>
    );

    fireEvent.click(screen.getByText('Add Toast'));
    const toast = screen.getByText('Warning!').closest('div')!;
    expect(toast.className).toContain('border-yellow-500');
  });

  it('applies correct styles for info type', () => {
    renderWithProvider(
      <>
        <TestComponent type="info" message="Info!" />
        <ToastContainer />
      </>
    );

    fireEvent.click(screen.getByText('Add Toast'));
    const toast = screen.getByText('Info!').closest('div')!;
    expect(toast.className).toContain('border-blue-500');
  });

  it('removes toast when close button is clicked', () => {
    renderWithProvider(
      <>
        <TestComponent message="Removable" />
        <ToastContainer />
      </>
    );

    fireEvent.click(screen.getByText('Add Toast'));
    expect(screen.getByText('Removable')).toBeInTheDocument();

    // Find the close button - it's the button inside the toast div
    const toastDiv = screen.getByText('Removable').closest('div')!;
    const closeButton = toastDiv.querySelector('button')!;
    fireEvent.click(closeButton);

    expect(screen.queryByText('Removable')).not.toBeInTheDocument();
  });
});
