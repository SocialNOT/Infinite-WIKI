/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

interface TranslationControlsProps {
  targetLanguage: string;
  onLanguageChange: (language: string) => void;
  onTranslate: () => void;
  isTranslating: boolean;
  canTranslate: boolean;
}

const LANGUAGES = [
  'Arabic', 'Bengali', 'French', 'German', 'Hindi', 'Italian', 
  'Japanese', 'Korean', 'Mandarin Chinese', 'Portuguese', 'Russian', 'Spanish'
];

const TranslationControls: React.FC<TranslationControlsProps> = ({
  targetLanguage,
  onLanguageChange,
  onTranslate,
  isTranslating,
  canTranslate,
}) => {
  return (
    <div className="translation-controls">
      <select
        value={targetLanguage}
        onChange={(e) => onLanguageChange(e.target.value)}
        disabled={isTranslating}
        aria-label="Select language for translation"
      >
        {LANGUAGES.map(lang => (
          <option key={lang} value={lang}>{lang}</option>
        ))}
      </select>
      <button onClick={onTranslate} disabled={!canTranslate || isTranslating}>
        {isTranslating ? 'Translating...' : 'Translate'}
      </button>
    </div>
  );
};

export default TranslationControls;