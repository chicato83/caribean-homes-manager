import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from '../SearchBar';

describe('SearchBar', () => {
  it('renders the input element', () => {
    render(<SearchBar value="" onChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('displays the provided value', () => {
    render(<SearchBar value="test query" onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('test query')).toBeInTheDocument();
  });

  it('calls onChange when user types', () => {
    const handleChange = vi.fn();
    render(<SearchBar value="" onChange={handleChange} />);

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'new value' },
    });

    expect(handleChange).toHaveBeenCalledWith('new value');
  });

  it('uses default placeholder when none provided', () => {
    render(<SearchBar value="" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument();
  });

  it('uses custom placeholder when provided', () => {
    render(<SearchBar value="" onChange={vi.fn()} placeholder="Search apartments..." />);
    expect(screen.getByPlaceholderText('Search apartments...')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <SearchBar value="" onChange={vi.fn()} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders the search icon', () => {
    const { container } = render(<SearchBar value="" onChange={vi.fn()} />);
    const svgIcon = container.querySelector('svg');
    expect(svgIcon).toBeInTheDocument();
  });
});
