/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useCallback } from 'react';
import { streamDefinition, generateAsciiArt, AsciiArtData, getRandomWord, streamTranslation } from './services/geminiService';
import ContentDisplay from './components/ContentDisplay';
import SearchBar from './components/SearchBar';
import LoadingSkeleton from './components/LoadingSkeleton';
import AsciiArtDisplay from './components/AsciiArtDisplay';
import TranslationControls from './components/TranslationControls';

type Theme = 'light' | 'dark';

// A curated list of "banger" words and phrases for the random button fallback.
const PREDEFINED_WORDS = [
  'Balance', 'Harmony', 'Discord', 'Unity', 'Fragmentation', 'Clarity', 'Ambiguity', 'Presence', 'Absence', 'Creation', 'Destruction', 'Light', 'Shadow', 'Beginning', 'Ending', 'Rising', 'Falling', 'Connection', 'Isolation', 'Hope', 'Despair',
  'Order and chaos', 'Light and shadow', 'Sound and silence', 'Form and formlessness', 'Being and nonbeing', 'Presence and absence', 'Motion and stillness', 'Unity and multiplicity', 'Finite and infinite', 'Sacred and profane', 'Memory and forgetting', 'Question and answer', 'Search and discovery', 'Journey and destination', 'Dream and reality', 'Time and eternity', 'Self and other', 'Known and unknown', 'Spoken and unspoken', 'Visible and invisible',
  'Zigzag', 'Waves', 'Spiral', 'Bounce', 'Slant', 'Drip', 'Stretch', 'Squeeze', 'Float', 'Fall', 'Spin', 'Melt', 'Rise', 'Twist', 'Explode', 'Stack', 'Mirror', 'Echo', 'Vibrate',
  'Gravity', 'Friction', 'Momentum', 'Inertia', 'Turbulence', 'Pressure', 'Tension', 'Oscillate', 'Fractal', 'Quantum', 'Entropy', 'Vortex', 'Resonance', 'Equilibrium', 'Centrifuge', 'Elastic', 'Viscous', 'Refract', 'Diffuse', 'Cascade', 'Levitate', 'Magnetize', 'Polarize', 'Accelerate', 'Compress', 'Undulate',
  'Liminal', 'Ephemeral', 'Paradox', 'Zeitgeist', 'Metamorphosis', 'Synesthesia', 'Recursion', 'Emergence', 'Dialectic', 'Apophenia', 'Limbo', 'Flux', 'Sublime', 'Uncanny', 'Palimpsest', 'Chimera', 'Void', 'Transcend', 'Ineffable', 'Qualia', 'Gestalt', 'Simulacra', 'Abyssal',
  'Existential', 'Nihilism', 'Solipsism', 'Phenomenology', 'Hermeneutics', 'Deconstruction', 'Postmodern', 'Absurdism', 'Catharsis', 'Epiphany', 'Melancholy', 'Nostalgia', 'Longing', 'Reverie', 'Pathos', 'Ethos', 'Logos', 'Mythos', 'Anamnesis', 'Intertextuality', 'Metafiction', 'Stream', 'Lacuna', 'Caesura', 'Enjambment'
];
const UNIQUE_WORDS = [...new Set(PREDEFINED_WORDS)];


/**
 * Creates a simple ASCII art bounding box as a fallback.
 * @param topic The text to display inside the box.
 * @returns An AsciiArtData object with the generated art.
 */
const createFallbackArt = (topic: string): AsciiArtData => {
  const displayableTopic = topic.length > 20 ? topic.substring(0, 17) + '...' : topic;
  const paddedTopic = ` ${displayableTopic} `;
  const topBorder = `┌${'─'.repeat(paddedTopic.length)}┐`;
  const middle = `│${paddedTopic}│`;
  const bottomBorder = `└${'─'.repeat(paddedTopic.length)}┘`;
  return {
    art: `${topBorder}\n${middle}\n${bottomBorder}`
  };
};

const App: React.FC = () => {
  const [currentTopic, setCurrentTopic] = useState<string>('Hypertext');
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [asciiArt, setAsciiArt] = useState<AsciiArtData | null>(null);
  const [generationTime, setGenerationTime] = useState<number | null>(null);
  const [theme, setTheme] = useState<Theme>('light');
  const [history, setHistory] = useState<string[]>([]);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<string>('Spanish');
  const [translatedLanguage, setTranslatedLanguage] = useState<string | null>(null);


  // Effect for initializing and updating theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dark-mode', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  }, []);


  useEffect(() => {
    if (!currentTopic) return;

    let isCancelled = false;

    const fetchContentAndArt = async () => {
      // Set initial state for a clean page load
      setIsLoading(true);
      setError(null);
      setContent('');
      setAsciiArt(null);
      setGenerationTime(null);
      setTranslatedContent(null);
      setTranslationError(null);
      setIsTranslating(false);
      setTranslatedLanguage(null);
      const startTime = performance.now();

      // Kick off ASCII art generation, but don't wait for it.
      generateAsciiArt(currentTopic)
        .then(art => {
          if (!isCancelled) setAsciiArt(art);
        })
        .catch(err => {
          if (!isCancelled) {
            console.error("Failed to generate ASCII art:", err);
            setAsciiArt(createFallbackArt(currentTopic));
          }
        });

      let accumulatedContent = '';
      let success = false;
      try {
        for await (const chunk of streamDefinition(currentTopic)) {
          if (isCancelled) break;
          
          if (chunk.startsWith('Error:')) {
            throw new Error(chunk);
          }
          accumulatedContent += chunk;
          if (!isCancelled) {
            setContent(accumulatedContent);
          }
        }
        if (accumulatedContent) success = true;
      } catch (e: unknown) {
        if (!isCancelled) {
          const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
          setError(errorMessage);
          setContent('');
          console.error(e);
        }
      } finally {
        if (!isCancelled) {
          const endTime = performance.now();
          setGenerationTime(endTime - startTime);
          setIsLoading(false);
          if (success) {
            setHistory(prev => {
              if (prev[prev.length - 1]?.toLowerCase() === currentTopic.toLowerCase()) {
                return prev;
              }
              const newHistory = [...prev, currentTopic];
              // Limit history size
              return newHistory.length > 15 ? newHistory.slice(newHistory.length - 15) : newHistory;
            });
          }
        }
      }
    };

    fetchContentAndArt();
    
    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTopic]);

  const handleWordClick = useCallback((word: string) => {
    const newTopic = word.trim();
    if (newTopic && newTopic.toLowerCase() !== currentTopic.toLowerCase()) {
      setCurrentTopic(newTopic);
    }
  }, [currentTopic]);

  const handleSearch = useCallback((topic: string) => {
    const newTopic = topic.trim();
    if (newTopic && newTopic.toLowerCase() !== currentTopic.toLowerCase()) {
      setCurrentTopic(newTopic);
    }
  }, [currentTopic]);

  const handleRandom = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setContent('');
    setAsciiArt(null);

    let nextTopic = '';
    try {
        const randomWord = await getRandomWord();
        nextTopic = randomWord;
    } catch (e) {
        console.error("Failed to get random word from API, using fallback list.", e);
        const randomIndex = Math.floor(Math.random() * UNIQUE_WORDS.length);
        nextTopic = UNIQUE_WORDS[randomIndex];
    } finally {
        // Prevent picking the same word twice in a row, using fallback list if needed
        if (nextTopic.toLowerCase() === currentTopic.toLowerCase()) {
            const fallbackIndex = (Math.floor(Math.random() * UNIQUE_WORDS.length));
            setCurrentTopic(UNIQUE_WORDS[fallbackIndex]);
        } else {
            setCurrentTopic(nextTopic);
        }
    }
  }, [currentTopic]);

  const handleLanguageChange = (language: string) => {
    setTargetLanguage(language);
  };

  const handleTranslate = useCallback(async () => {
    if (!content) return;

    setIsTranslating(true);
    setTranslatedContent('');
    setTranslationError(null);

    let accumulatedTranslation = '';
    let success = false;
    try {
        for await (const chunk of streamTranslation(content, targetLanguage)) {
            if (chunk.startsWith('Error:')) {
                throw new Error(chunk);
            }
            accumulatedTranslation += chunk;
            setTranslatedContent(accumulatedTranslation);
        }
        if (accumulatedTranslation) success = true;
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
        setTranslationError(errorMessage.replace('Error: ', ''));
        setTranslatedContent(null);
    } finally {
        setIsTranslating(false);
        if (success) {
            setTranslatedLanguage(targetLanguage);
        }
    }
  }, [content, targetLanguage]);


  return (
    <div>
      <SearchBar onSearch={handleSearch} onRandom={handleRandom} isLoading={isLoading} theme={theme} onThemeToggle={toggleTheme}/>
      
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          INFINITE WIKI
        </h1>
        <AsciiArtDisplay artData={asciiArt} topic={currentTopic} />
      </header>
      
      <main>
        <div>
          <h2 style={{ marginBottom: '1rem', textTransform: 'capitalize' }}>
            {currentTopic}
          </h2>

          <TranslationControls
            targetLanguage={targetLanguage}
            onLanguageChange={handleLanguageChange}
            onTranslate={handleTranslate}
            isTranslating={isTranslating}
            canTranslate={!isLoading && content.length > 0}
          />

          {error && (
            <div className="error-box">
              <p>An Error Occurred</p>
              <p style={{ marginTop: '0.5rem' }}>{error}</p>
            </div>
          )}
          
          {isLoading && content.length === 0 && !error && (
            <LoadingSkeleton />
          )}

          {content.length > 0 && !error && (
             <ContentDisplay 
               content={content} 
               isLoading={isLoading} 
               onWordClick={handleWordClick} 
             />
          )}

          {!isLoading && !error && content.length === 0 && (
            <div style={{ color: '#888', padding: '2rem 0' }}>
              <p>Content could not be generated.</p>
            </div>
          )}

          {(isTranslating || translatedContent || translationError) && (
            <div className="translation-section">
              <h3>{translatedLanguage ? `Translation (${translatedLanguage})` : 'Translation'}</h3>
              {isTranslating && <LoadingSkeleton />}
              {translationError && (
                <div className="error-box">
                  <p>{translationError}</p>
                </div>
              )}
              {translatedContent && !isTranslating && <p>{translatedContent}</p>}
            </div>
          )}
        </div>
      </main>

      {history.length > 1 && (
        <section className="history-section">
          <h2>History</h2>
          <div className="history-list">
            {history.slice(0, -1).map((topic, index) => (
                <button key={`${topic}-${index}`} onClick={() => handleWordClick(topic)} className="history-item">
                    {topic}
                </button>
            ))}
          </div>
        </section>
      )}

      <footer className="sticky-footer">
        <p className="footer-text" style={{ margin: 0 }}>
          Infinite Wiki by <a href="https://github.com/SocialNOT" target="_blank" rel="noopener noreferrer">Rajib Singh</a> · Generated by Gemini 2.5 Flash Lite
          {generationTime && ` · ${Math.round(generationTime)}ms`}
        </p>
      </footer>
    </div>
  );
};

export default App;