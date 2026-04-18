# MarkovKey — Interface iPhone iMessage

Prédiction de texte par modèle de Markov, avec une interface style **iPhone iMessage**.

## Fonctionnalités

- 📱 Interface iMessage authentique (coque iPhone, bulles, barre de statut)
- 🔮 **3 suggestions de mots** au-dessus du clavier, comme sur un vrai iPhone
- 📚 Entraîné sur votre dossier `dataset/` (livres en français)
- 💾 Modèle sauvegardé en localStorage pour un chargement instantané les fois suivantes
- 📖 Apprentissage en temps réel à partir de vos messages

## Lancer le projet

```bash
npm install
npm run dev
```

Ouvrez http://localhost:5173

## Structure

```
markov-iphone/
├── public/
│   └── dataset/          ← livres .txt servis statiquement par Vite
├── src/
│   ├── core/
│   │   ├── MarkovChain.js  ← moteur Markov (inchangé)
│   │   └── Predictor.js    ← charge le dataset via fetch()
│   ├── ui/
│   │   └── KeyboardUI.js   ← interface iPhone
│   └── app.js
├── styles/
│   └── main.css            ← thème iMessage
└── index.html
```

## Ajouter des livres au dataset

Déposez vos fichiers `.txt` dans `public/dataset/` et ajoutez leur chemin dans `src/core/Predictor.js` :

```js
const DATASET_FILES = [
  '/dataset/mon_nouveau_livre.txt',
  // ...
];
```

## Comment ça marche

Au premier lancement, le Predictor charge chaque fichier `.txt` via `fetch()`,
entraîne le modèle Markov sur l'ensemble du texte, puis sauvegarde le modèle
en `localStorage`. Les fois suivantes, le modèle est restauré instantanément.

La barre de suggestions affiche **3 mots** :
- Si vous êtes en train de taper un mot → **complétion** du mot en cours
- Si vous venez de terminer un mot (espace) → **prédiction** du mot suivant
