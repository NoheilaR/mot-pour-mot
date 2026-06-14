# Mot pour Mot

Party game 2v2 de mots en temps réel. Jouable sur navigateur, typiquement à 4 sur un vocal Discord.

## Lancer le projet

### Serveur (Node.js + Socket.IO)

```bash
cd server
npm install
npm run dev        # nodemon (hot-reload)
# ou
npm start          # sans hot-reload
```

Écoute sur `http://localhost:3001`.

### Client (React + Vite)

```bash
cd client
npm install
npm run dev
```

Ouvre `http://localhost:5173`. Le proxy Vite redirige automatiquement `/socket.io` vers le serveur.

---

## Structure

```
words/
├── server/
│   ├── index.js              # Express + Socket.IO, gestion des rooms
│   ├── game.js               # Machine d'état complète (GameRoom)
│   ├── package.json
│   ├── utils/
│   │   ├── matchAnswer.js    # Matching tolérant (Levenshtein + pluriel)
│   │   └── validateClue.js   # Validation de l'indice côté serveur
│   └── data/
│       └── words.json        # ~180 mots FR par catégorie
└── client/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── socket.js          # Instance socket.io-client partagée
        ├── hooks/
        │   └── useGame.js     # État global du jeu (reducer + actions)
        ├── components/
        │   ├── Home.jsx
        │   ├── Lobby.jsx
        │   ├── Game.jsx
        │   ├── IndiceurView.jsx
        │   ├── DevineurView.jsx
        │   ├── SpectatorView.jsx
        │   ├── Timer.jsx
        │   ├── ScoreBar.jsx
        │   └── GameOver.jsx
        └── styles/
            └── index.css
```

## Règles

- **2v2** — Équipe Rouge (A) vs Équipe Bleue (B)
- À chaque round, une équipe est active : un **indiceur** donne un seul mot d'indice écrit, un **devineur** répond
- 30s par round — autant de mots que possible
- **Passer** un mot coûte −1 point
- **Mode Texte** : le devineur tape ; le serveur compare (tolérance accents, pluriel, Levenshtein ≤1-2)
- **Mode Vocal** : le devineur répond à l'oral, l'indiceur valide avec les boutons Correct/Passer
- Déconnexion d'un joueur actif → pause automatique, reprise à la reconnexion

## Ajouter des mots

Éditer `server/data/words.json` — format :

```json
{
  "categories": {
    "ma_categorie": ["mot1", "mot2", ...]
  }
}
```
# mot-pour-mot
