/**
 * Predictor.test.js
 * Tests d'intégration pour la façade Predictor.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Predictor } from '../src/core/Predictor.js';

// Mock du localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem:    (key) => store[key] ?? null,
    setItem:    (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear:      () => { store = {}; },
  };
})();
global.localStorage = localStorageMock;

describe('Predictor — initialisation', () => {
  it('s\'initialise et entraîne sur le corpus intégré', async () => {
    const p = new Predictor({ order: 2 });
    const stats = await p.initialize();
    expect(stats.vocabularySize).toBeGreaterThan(50);
    expect(p._trained).toBe(true);
  });

  it('accepte des textes supplémentaires à l\'init', async () => {
    const p = new Predictor({ order: 2 });
    const stats = await p.initialize(['mot unique inventé xylophone baroque']);
    expect(p.chain.vocabulary.has('xylophone')).toBe(true);
  });
});

describe('Predictor — getSuggestions', () => {
  let predictor;
  beforeEach(async () => {
    predictor = new Predictor({ order: 2 });
    await predictor.initialize(['je vais bien merci bonjour je vais partir maintenant']);
  });

  it('retourne type=prediction quand le texte se termine par un espace', () => {
    const result = predictor.getSuggestions('je vais ');
    expect(result.type).toBe('prediction');
  });

  it('retourne type=completion quand l\'utilisateur est en train de taper un mot', () => {
    const result = predictor.getSuggestions('je vai');
    expect(result.type).toBe('completion');
    expect(result.prefix).toBe('vai');
  });

  it('retourne une liste vide si le champ est vide', () => {
    const result = predictor.getSuggestions('');
    expect(result.suggestions).toHaveLength(0);
  });

  it('retourne des suggestions non vides pour un contexte connu', () => {
    const result = predictor.getSuggestions('je ');
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});

describe('Predictor — apprentissage en ligne', () => {
  it('enrichit le vocabulaire après learnFromInput', async () => {
    const p = new Predictor({ order: 1 });
    await p.initialize();
    const before = p.chain.vocabulary.size;
    p.learnFromInput('zymurgie et xyloglossie sont des mots rares');
    expect(p.chain.vocabulary.size).toBeGreaterThan(before);
  });

  it('ignore les textes trop courts', async () => {
    const p = new Predictor({ order: 1 });
    await p.initialize();
    const before = p.chain.transitions.size;
    p.learnFromInput('ok');
    expect(p.chain.transitions.size).toBe(before);
  });
});

describe('Predictor — reset', () => {
  it('vide le modèle et le localStorage', async () => {
    const p = new Predictor({ order: 2 });
    await p.initialize();
    p.saveToStorage();
    p.reset();
    expect(p._trained).toBe(false);
    expect(localStorage.getItem('markov_model')).toBeNull();
  });
});
