import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../ThemeContext';

function TestComponent() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('provides a default theme of light', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
  });

  it('reads saved theme from localStorage', () => {
    localStorage.setItem('theme', 'dark');
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });

  it('toggles theme from light to dark', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    fireEvent.click(screen.getByText('Toggle'));
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });

  it('toggles theme from dark to light', () => {
    localStorage.setItem('theme', 'dark');
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    fireEvent.click(screen.getByText('Toggle'));
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
  });

  it('persists theme to localStorage', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByText('Toggle'));
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('throws when useTheme is used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestComponent />)).toThrow('useTheme must be used within ThemeProvider');
    consoleSpy.mockRestore();
  });
});
