"use client";

import { createContext, useCallback, useContext, useState } from "react";

const ALL_TAG = "All";

interface SearchContextValue {
  query: string;
  setQuery: (q: string) => void;
  clear: () => void;
  category: string;
  setCategory: (c: string) => void;
  ALL_TAG: string;
}

const SearchContext = createContext<SearchContextValue | undefined>(undefined);

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used within SearchProvider");
  return ctx;
}

export default function SearchProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL_TAG);
  const clear = useCallback(() => setQuery(""), []);

  return (
    <SearchContext.Provider value={{ query, setQuery, clear, category, setCategory, ALL_TAG }}>
      {children}
    </SearchContext.Provider>
  );
}
