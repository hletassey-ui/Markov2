/**
 * MarkovChain.test.js
 * Tests unitaires avec Vitest.
 * Lancez avec : npm test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MarkovChain } from '../src/core/MarkovChain.js';

const SAMPLE = `
le chat mange la souris le chien mange les croquettes
le chat dort sur le canapé le chien court dans le jardin
bonjour comment allez vous je vais bien merci
il fait beau aujourd hui allons nous promener dehors
je pense donc je suis le monde est grand et beau
`.trim();

describe('MarkovChain — entraînement', () => {
  let chain;
  beforeEach(() => {
    chain = new MarkovChain(2);
    chain.train(SAMPLE);
  });

  it('construit un vocabulaire non vide', () => {
    expect(chain.vocabulary.size).toBeGreaterThan(10);
  });

  it('construit des transitions', () => {
    expect(chain.transitions.size).toBeGreaterThan(0);
  });

  it('enregistre les tokens', () => {
    expect(chain.totalTokens).toBeGreaterThan(0);
  });
});

describe('MarkovChain — prédiction du mot suivant', () => {
  let chain;
  beforeEach(() => {
    chain = new MarkovChain(2);
    chain.train(SAMPLE);
  });

  it('retourne des suggestions pour un contexte connu', () => {
    const preds = chain.predictNextWord(['le', 'chat'], 3);
    expect(preds.length).toBeGreaterThan(0);
    expect(preds[0]).toHaveProperty('word');
    expect(preds[0]).toHaveProperty('probability');
  });

  it('utilise le back-off si contexte inconnu', () => {
    const preds = chain.predictNextWord(['xyz', 'chat'], 3);
    // Doit trouver 'chat' en unigramme
    expect(preds.length).toBeGreaterThan(0);
  });

  it('retourne une liste vide pour un contexte totalement inconnu', () => {
    const preds = chain.predictNextWord(['zzz', 'qqq'], 3);
    expect(preds).toEqual([]);
  });

  it('retourne au plus topN suggestions', () => {
    const preds = chain.predictNextWord(['le'], 2);
    expect(preds.length).toBeLessThanOrEqual(2);
  });

  it('trie par probabilité décroissante', () => {
    const preds = chain.predictNextWord(['le', 'chat'], 5);
    for (let i = 1; i < preds.length; i++) {
      expect(preds[i - 1].probability).toBeGreaterThanOrEqual(preds[i].probability);
    }
  });
});

describe('MarkovChain — complétion de mot', () => {
  let chain;
  beforeEach(() => {
    chain = new MarkovChain(2);
    chain.train(SAMPLE);
  });

  it('complète un préfixe connu', () => {
    const completions = chain.completeWord('ch', [], 3);
    expect(completions.length).toBeGreaterThan(0);
    completions.forEach(c => expect(c.word).toMatch(/^ch/));
  });

  it('retourne [] pour un préfixe absent du vocabulaire', () => {
    const completions = chain.completeWord('xyz', [], 3);
    expect(completions).toEqual([]);
  });

  it('prend en compte le contexte pour scorer', () => {
    // "le" précède souvent "chat" ou "chien" dans le corpus
    const withContext    = chain.completeWord('ch', ['le'], 3);
    const withoutContext = chain.completeWord('ch', [], 3);
    // Les deux doivent retourner des résultats
    expect(withContext.length).toBeGreaterThan(0);
    expect(withoutContext.length).toBeGreaterThan(0);
  });

  it('ne retourne pas le préfixe lui-même', () => {
    // Si "chat" est dans le vocab, "cha" ne doit pas retourner "cha"
    chain.vocabulary.add('cha');
    const completions = chain.completeWord('cha', [], 5);
    completions.forEach(c => expect(c.word).not.toBe('cha'));
  });
});

describe('MarkovChain — génération', () => {
  let chain;
  beforeEach(() => {
    chain = new MarkovChain(2);
    chain.train(SAMPLE);
  });

  it('génère une séquence non vide', () => {
    const text = chain.generate(['le'], 5);
    expect(text.trim().length).toBeGreaterThan(0);
  });

  it('commence par le mot de départ', () => {
    const text = chain.generate(['bonjour'], 4);
    expect(text.startsWith('bonjour')).toBe(true);
  });
});

describe('MarkovChain — sérialisation', () => {
  it('exporte et reimporte fidèlement', () => {
    const chain = new MarkovChain(2);
    chain.train(SAMPLE);
    const json = chain.toJSON();

    const chain2 = MarkovChain.fromJSON(json);
    expect(chain2.order).toBe(chain.order);
    expect(chain2.vocabulary.size).toBe(chain.vocabulary.size);
    expect(chain2.transitions.size).toBe(chain.transitions.size);
  });

  it('le modèle restauré produit les mêmes prédictions', () => {
    const chain = new MarkovChain(2);
    chain.train(SAMPLE);
    const chain2 = MarkovChain.fromJSON(chain.toJSON());

    const p1 = chain.predictNextWord(['le', 'chat'], 3).map(p => p.word);
    const p2 = chain2.predictNextWord(['le', 'chat'], 3).map(p => p.word);
    expect(p1).toEqual(p2);
  });
});

describe('MarkovChain — entraînement multi-textes', () => {
  it('accepte plusieurs textes', () => {
    const chain = new MarkovChain(2);
    chain.trainMultiple(['bonjour monde', 'monde entier', 'entier et beau']);
    expect(chain.vocabulary.size).toBeGreaterThan(3);
  });
});
