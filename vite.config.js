import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Le dossier "public" de Vite sert les fichiers statiquement à la racine.
  // On indique ici que notre dossier public est à la racine du projet.
  publicDir: 'public',
  server: {
    port: 5173,
    open: true,
  },
});
