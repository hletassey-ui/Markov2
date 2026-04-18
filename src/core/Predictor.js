/**
 * Predictor.js
 * Façade haut niveau — réécrit avec Ramda.
 * Charge le corpus depuis les fichiers .txt du dossier /dataset/.
 */

import * as R from 'ramda';
import { MarkovChain } from './MarkovChain.js';

const DATASET_FILES = [
  '/dataset/comptesse_de_segur.txt',
  '/dataset/Freida_McFadden_-_La_femme_de_m_233_nage_T1_2023.txt',
  '/dataset/Hunger-Games-2.txt',
  '/dataset/HUNGER_GAMES_TOME_1.txt',
  '/dataset/Le_tour_du_monde_en_80 jours.txt',
  '/dataset/Texte.txt',
];

// Fetch un fichier texte — résout à null si erreur
const fetchText = async path => {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  } catch (e) {
    console.warn(`Impossible de charger ${path} :`, e);
    return null;
  }
};

// Extrait le nom de fichier depuis un chemin
const basename = R.pipe(R.split('/'), R.last);

export class Predictor {
  constructor({ order = 2, language = 'fr' } = {}) {
    this.chain          = new MarkovChain(order);
    this.language       = language;
    this._trained       = false;
    this._sessionTokens = 0;
  }

  // ── Initialisation ───────────────────────────────────────────────────────────

  async initialize(onProgress) {
    if (this.loadFromStorage()) return this.chain.getStats();

    const total = DATASET_FILES.length;

    // Chargement séquentiel avec progression
    await R.reduce(async (accP, path) => {
      await accP; // attend la précédente itération
      const text     = await fetchText(path);
      const done     = DATASET_FILES.indexOf(path) + 1;
      const filename = basename(path);
      if (text) this.chain.train(text);
      if (onProgress) onProgress(done, total, filename);
    }, Promise.resolve(), DATASET_FILES);

    this._trained = true;
    this.saveToStorage();
    return this.chain.getStats();
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem('markov_model_v2');
      if (saved) {
        this.chain    = MarkovChain.fromJSON(saved);
        this._trained = true;
        return true;
      }
    } catch (e) {
      console.warn('Impossible de charger depuis le localStorage :', e);
    }
    return false;
  }

  saveToStorage() {
    try {
      localStorage.setItem('markov_model_v2', this.chain.toJSON());
    } catch (e) {
      console.warn('Impossible de sauvegarder dans le localStorage :', e);
    }
  }

  // ── Interface principale ─────────────────────────────────────────────────────

  getSuggestions(inputText, topN = 3) {
    if (!this._trained) return { type: 'prediction', suggestions: [] };

    const trimmed       = R.trimCharsStart(' ', inputText);
    const endsWithSpace = R.endsWith(' ', inputText);
    const words         = R.reject(R.isEmpty, R.split(/\s+/, trimmed));

    if (R.isEmpty(words)) return { type: 'prediction', suggestions: [] };

    if (endsWithSpace) {
      return { type: 'prediction', suggestions: this.chain.predictNextWord(words, topN) };
    }

    const currentWord = R.last(words);
    const context     = R.dropLast(1, words);
    if (currentWord.length < 1) return { type: 'prediction', suggestions: [] };

    return {
      type:        'completion',
      suggestions: this.chain.completeWord(currentWord, context, topN),
      prefix:      currentWord,
    };
  }

  learnFromInput(text) {
    if (R.trim(text).length < 3) return;
    this.chain.train(text);
    this._sessionTokens = R.inc(this._sessionTokens);
    if (this._sessionTokens % 10 === 0) this.saveToStorage();
  }

  getStats() {
    return R.mergeRight(this.chain.getStats(), {
      sessionContributions: this._sessionTokens,
    });
  }

  reset() {
    this.chain          = new MarkovChain(this.chain.order);
    this._trained       = false;
    this._sessionTokens = 0;
    localStorage.removeItem('markov_model_v2');
  }
}
