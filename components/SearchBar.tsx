/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import ThemeToggle from './ThemeToggle';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onRandom: () => void;
  isLoading: boolean;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, onRandom, isLoading, theme, onThemeToggle }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
      setQuery(''); // Clear the input field after search
    }
  };

  return (
    <div className="search-container">
      <form onSubmit={handleSubmit} className="search-form" role="search">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          className="search-input"
          aria-label="Search for a topic"
          disabled={isLoading}
        />
      </form>
      <button onClick={onRandom} className="random-button" disabled={isLoading}>
        Random
      </button>
      <ThemeToggle theme={theme} onToggle={onThemeToggle} />
    </div>
  );
};

export default SearchBar;
