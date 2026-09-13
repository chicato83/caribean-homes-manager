import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface SearchContextValue {
  query: string;
  rawQuery: string;
  setQuery: (q: string) => void;
}

const SearchContext = createContext<SearchContextValue | undefined>(undefined);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [rawQuery, setRawQuery] = useState('');
  const [query, setQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSetQuery = useCallback((q: string) => {
    setRawQuery(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setQuery(q), 300);
  }, []);

  return (
    <SearchContext.Provider value={{ query, rawQuery, setQuery: handleSetQuery }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) throw new Error('useSearch must be used within SearchProvider');
  return context;
}
