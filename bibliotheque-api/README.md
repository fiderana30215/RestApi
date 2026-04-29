# API Bibliothèque — Documentation API (Swagger & Postman)

API REST de gestion d'une bibliothèque (Livres, Auteurs, Emprunts) avec authentification JWT, documentée en OpenAPI 3.x et testée via une collection Postman complète.

**Stack** : Node.js + Express · JWT (jsonwebtoken) · Zod (validation) · swagger-ui-express.

---

## 1. Installation

```bash

cd bibliotheque-api
cp .env.example .env        
npm install
npm start                   
```

L'API démarre sur `http://localhost:8000`.

- **Base URL** : `http://localhost:8000/api/v1`
- **Swagger UI** : `http://localhost:8000/api/docs`
- **Redirection** : `http://localhost:8000/api/documentation` → `/api/docs`

Les données sont stockées en mémoire et **seedées automatiquement** au démarrage : 4 auteurs, 6 livres, 2 emprunts, 1 utilisateur admin.

**Identifiants par défaut** :
- email : `admin@biblio.local`
- password : `admin123`

---

## 2. Endpoints

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | Non | Authentification → JWT |
| GET | `/authors` | Non | Liste les auteurs |
| POST | `/authors` | Oui | Créer un auteur |
| GET | `/authors/{id}` | Non | Détails auteur + livres |
| PUT | `/authors/{id}` | Oui | Modifier |
| DELETE | `/authors/{id}` | Oui | Supprimer |
| GET | `/books?available=true` | Non | Liste des livres |
| POST | `/books` | Oui | Créer un livre |
| GET | `/books/{id}` | Non | Détails livre + auteur |
| PUT | `/books/{id}` | Oui | Modifier |
| DELETE | `/books/{id}` | Oui | Supprimer |
| GET | `/borrows` | Oui | Emprunts en cours |
| POST | `/borrows` | Oui | Enregistrer un emprunt |
| PATCH | `/borrows/{id}/return` | Oui | Marquer comme rendu |

Format de réponse uniforme : `{ success, data, message }` (ou `errors` pour 422).

---

## 3. Test rapide (cURL)

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@biblio.local","password":"admin123"}' | \
  node -pe "JSON.parse(require('fs').readFileSync(0)).data.token")

# Liste des livres disponibles
curl http://localhost:8000/api/v1/books?available=true

# Créer un livre (protégé)
curl -X POST http://localhost:8000/api/v1/books \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","isbn":"978-0000000001","year":2025,"author_id":1}'
```

---

## 4. Postman

Importez dans Postman :

- `postman/collection_bibliotheque_[NomPrenom].json`
- `postman/env_dev_[NomPrenom].json`
- `postman/env_prod_[NomPrenom].json`

**Ordre d'exécution recommandé** :
1. Sélectionnez l'environnement **Développement**.
2. Lancez `Authentification → Login (OK)` → le token est sauvegardé automatiquement.
3. Exécutez toutes les autres requêtes, ou utilisez le **Collection Runner** pour lancer l'ensemble en un clic.

---

## 5. Structure

```
bibliotheque-api/
├── openapi.yaml               # Spécification OpenAPI 3.x
├── package.json
├── .env.example
├── README.md
├── postman/
│   ├── collection_bibliotheque_[NomPrenom].json
│   ├── env_dev_[NomPrenom].json
│   └── env_prod_[NomPrenom].json
├── docs/
│   └── rapport.md             # Rapport de documentation
└── src/
    ├── server.js              # Entrée Express + Swagger UI
    ├── data/{store,seed}.js   # "BDD" en mémoire + seeders
    ├── middleware/{auth,validate}.js
    └── routes/{auth,authors,books,borrows}.js
```

---

## 6. Codes HTTP utilisés

| Code | Quand |
|---|---|
| 200 | Lecture / modification OK |
| 201 | Création réussie |
| 204 | Suppression réussie (corps vide) |
| 401 | Token manquant ou invalide |
| 404 | Ressource introuvable |
| 422 | Validation échouée (format ou règle métier) |
