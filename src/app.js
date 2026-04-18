/**
 * app.js
 * Point d'entrée — réécrit avec Ramda.
 */

import * as R from 'ramda';
import { Predictor } from './core/Predictor.js';
import { KeyboardUI } from './ui/KeyboardUI.js';

// Génère une réponse simulée du bot à partir du dernier contexte
const makeBotReply = R.curry((predictor, text) => {
  const words   = R.reject(R.isEmpty, R.split(/\s+/, R.trim(text)));
  const seed    = R.takeLast(2, words);
  const reply   = predictor.chain.generate(seed, 6);
  const differs = !R.equals(R.trim(reply), R.trim(text));
  return differs ? `💬 ${reply}` : null;
});

async function main() {
  const predictor = new Predictor({ order: 2, language: 'fr' });
  const ui        = new KeyboardUI(document.getElementById('app'));

  ui.showLoading('Chargement du modèle Markov…');

  const modelStats = await predictor.initialize((done, total, filename) => {
    ui.setLoadingProgress(done, total, filename);
  });

  ui.hideLoading();
  ui.setStatus('ready', `Prêt · ${modelStats.vocabularySize.toLocaleString()} mots`);

  // Pipe de traitement de l'input → suggestions
  ui.onInput(inputText => {
    const result = predictor.getSuggestions(inputText, 3);
    ui.showSuggestions(result);
  });

  // Clic suggestion → insertion
  ui.onSuggestionClick(suggestion => ui.insertSuggestion(suggestion));

  // Envoi message
  ui.onSubmit(text => {
    predictor.learnFromInput(text);
    ui.addMessage(text);
    ui.clearInput();

    // Réponse du bot après un délai
    const reply = makeBotReply(predictor, text);
    if (reply) setTimeout(() => ui.addReceivedMessage(reply), 800);
  });
}

main().catch(console.error);
