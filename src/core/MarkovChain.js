/**
 * MarkovChain.js
 * Modèle de Markov d'ordre N — réécrit avec Ramda.
 */

import * as R from 'ramda';

// ── Helpers purs ──────────────────────────────────────────────────────────────

// Normalise les guillemets et apostrophes, split, nettoie, filtre les vides
const tokenize = R.pipe(
  R.replace(/[""«»]/g, '"'),
  R.replace(/['']/g, "'"),
  R.split(/\s+/),
  R.map(R.replace(/^[^a-zA-ZÀ-ÿ']+|[^a-zA-ZÀ-ÿ']+$/g, '')),
  R.filter(w => w.length > 0),
);

// Incrémente un compteur dans un objet plain (utilisé pour les nextMaps)
const increment = (key, obj) =>
  R.assoc(key, (obj[key] || 0) + 1, obj);

// Calcule la somme d'un tableau de nombres
const sumValues = R.reduce(R.add, 0);

// Trie par propriété décroissante
const sortByDesc = prop => R.sort((a, b) => b[prop] - a[prop]);

// ── Classe ────────────────────────────────────────────────────────────────────

export class MarkovChain {
  constructor(order = 2) {
    this.order = order;
    // Map<string, Map<string, number>>
    this.transitions = new Map();
    this.vocabulary   = new Set();
    this.totalTokens  = 0;
  }

  // ── Entraînement ────────────────────────────────────────────────────────────

  train(text) {
    const tokens = tokenize(text);
    this.totalTokens += tokens.length;

    // Ajout au vocabulaire
    R.forEach(w => this.vocabulary.add(R.toLower(w)), tokens);

    // Génération des n-grammes pour chaque position
    R.forEach(i => {
      R.forEach(o => {
        if (i - o + 1 < 0) return;
        const contextWords = R.slice(i - o + 1, i + 1, tokens);
        const key  = R.toLower(R.join(' ', contextWords));
        const next = R.toLower(tokens[i + 1]);

        if (!this.transitions.has(key)) {
          this.transitions.set(key, new Map());
        }
        const nextMap = this.transitions.get(key);
        nextMap.set(next, (nextMap.get(next) || 0) + 1);
      }, R.range(1, this.order + 1));
    }, R.range(0, tokens.length - 1));
  }

  trainMultiple(texts) {
    R.forEach(t => this.train(t), texts);
  }

  // ── Prédiction ───────────────────────────────────────────────────────────────

  predictNextWord(contextWords, topN = 3) {
    // Back-off : essaie le contexte le plus long d'abord
    const orders = R.reverse(R.range(1, Math.min(this.order, contextWords.length) + 1));
    const found  = R.find(o => {
      const key = R.toLower(R.join(' ', R.takeLast(o, contextWords)));
      return this.transitions.has(key);
    }, orders);

    if (found === undefined) return [];

    const key = R.toLower(R.join(' ', R.takeLast(found, contextWords)));
    return this._rankCandidates(this.transitions.get(key), topN);
  }

  // ── Complétion ───────────────────────────────────────────────────────────────

  completeWord(prefix, contextWords = [], topN = 3) {
    if (!prefix) return [];

    const lowerPrefix = R.toLower(prefix);
    const candidates  = R.filter(
      w => R.startsWith(lowerPrefix, w) && w !== lowerPrefix,
      [...this.vocabulary],
    );

    if (R.isEmpty(candidates)) return [];

    // Scores contextuels
    const contextScores = new Map();
    const orders = R.reverse(R.range(1, Math.min(this.order, contextWords.length) + 1));

    R.forEach(o => {
      const key = R.toLower(R.join(' ', R.takeLast(o, contextWords)));
      if (!this.transitions.has(key)) return;
      this.transitions.get(key).forEach((count, word) => {
        if (R.startsWith(lowerPrefix, word)) {
          contextScores.set(word, (contextScores.get(word) || 0) + count * o);
        }
      });
    }, orders);

    const globalFreq = this._getGlobalFrequencies();

    const scored = R.map(word => ({
      word,
      score: (contextScores.get(word) || 0) * 3 + (globalFreq.get(word) || 0),
    }), candidates);

    return R.take(
      topN,
      R.sortWith(
        [R.descend(R.prop('score')), R.ascend(R.prop('word'))],
        scored,
      ),
    );
  }

  // ── Génération ───────────────────────────────────────────────────────────────

  generate(seed = [], length = 10) {
    const step = result => {
      if (result.length >= seed.length + length) return result;
      const predictions = this.predictNextWord(result, 5);
      if (R.isEmpty(predictions)) return result;
      return step(R.append(this._sample(predictions), result));
    };
    return R.join(' ', step([...seed]));
  }

  // ── Sérialisation ────────────────────────────────────────────────────────────

  toJSON() {
    const transitions = {};
    this.transitions.forEach((nextMap, key) => {
      transitions[key] = Object.fromEntries(nextMap);
    });
    return JSON.stringify({
      order: this.order,
      transitions,
      vocabulary:  [...this.vocabulary],
      totalTokens: this.totalTokens,
    });
  }

  static fromJSON(json) {
    const data  = JSON.parse(json);
    const chain = new MarkovChain(data.order);
    chain.totalTokens = data.totalTokens;
    chain.vocabulary  = new Set(data.vocabulary);
    R.forEach(([key, nextObj]) => {
      chain.transitions.set(key, new Map(Object.entries(nextObj)));
    }, Object.entries(data.transitions));
    return chain;
  }

  // ── Utilitaires privés ───────────────────────────────────────────────────────

  _rankCandidates(nextMap, topN) {
    const entries = [...nextMap.entries()];
    const total   = sumValues(R.map(([, c]) => c, entries));
    const ranked  = R.map(
      ([word, count]) => ({ word, probability: count / total }),
      entries,
    );
    return R.take(topN, sortByDesc('probability')(ranked));
  }

  _getGlobalFrequencies() {
    const freq = new Map();
    this.transitions.forEach((nextMap, key) => {
      if (!R.includes(' ', key)) {   // unigrammes uniquement
        nextMap.forEach((count, word) => {
          freq.set(word, (freq.get(word) || 0) + count);
        });
      }
    });
    return freq;
  }

  _sample(candidates) {
    const weight = c => c.probability ?? c.score ?? 1;
    const total  = R.reduce((acc, c) => acc + weight(c), 0, candidates);
    let rand = Math.random() * total;
    return R.reduce((_, c) => {
      rand -= weight(c);
      if (rand <= 0) return R.reduced(c.word);
      return _;
    }, candidates[0].word, candidates);
  }

  getStats() {
    return {
      vocabularySize: this.vocabulary.size,
      ngramCount:     this.transitions.size,
      totalTokens:    this.totalTokens,
      order:          this.order,
    };
  }
}
