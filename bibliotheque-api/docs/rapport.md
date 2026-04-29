# Rapport de documentation — API Bibliothèque

> Livrable 4 · Séance 3 · Technologies client-serveur · Cours 2026

## 1. Pourquoi la documentation d'API est essentielle en entreprise

Une API sans documentation est, dans les faits, une API inutilisable. En contexte professionnel, le code backend n'est jamais consommé uniquement par celui qui l'a écrit : une équipe front, une équipe mobile, un partenaire externe, un service QA et parfois le client final s'en servent. Documenter, c'est :

- **Réduire le coût d'intégration** : un développeur qui découvre l'API doit pouvoir appeler un endpoint en moins de 5 minutes, sans interrompre l'auteur du code.
- **Servir de contrat** entre équipes : front et back s'alignent sur les schémas (Book, Author, Borrow) et les codes HTTP attendus avant même d'écrire la première ligne.
- **Accélérer les tests et la QA** : les testeurs disposent d'exemples concrets, de scénarios prêts à jouer (Postman) et d'une interface interactive (Swagger UI).
- **Garantir la pérennité** : quand un développeur part, la documentation reste. Elle survit au turnover et aux changements d'équipe.
- **Permettre la génération automatique** de clients SDK (Flutter, JS, Java...) via OpenAPI, de pages de statut et de mocks.

En résumé : la documentation est un **multiplicateur de productivité** pour toute l'organisation.

## 2. Swagger UI vs Postman

| Critère | Swagger UI / OpenAPI | Postman |
|---|---|---|
| **Nature** | Spécification + visualisation | Outil de test et d'automatisation |
| **Public cible** | Développeurs consommateurs, architectes | Testeurs, QA, devs qui intègrent |
| **Force** | Contrat formel, source unique de vérité, génère des SDK | Scénarios, variables, tests JS, CI/CD (Newman) |
| **Format** | YAML / JSON (versionnable avec git) | JSON exporté, collections partagées |
| **Interactif** | "Try it out" dans le navigateur | Exécution riche, Runner, monitors |

**Quand utiliser quoi ?**
- **Swagger/OpenAPI** : dès qu'on conçoit l'API. C'est la spec qui sert de référence à toute l'équipe et qui est publiée aux consommateurs externes.
- **Postman** : dès qu'on teste, debug ou automatise. C'est l'outil quotidien du développeur pour jouer des scénarios (login → créer → emprunter → rendre) et valider des régressions.

Ils sont **complémentaires** : OpenAPI décrit *ce que fait* l'API, Postman prouve *qu'elle fait ce qu'elle dit*.

## 3. Difficulté rencontrée

La principale difficulté a été la **cohérence des réponses 422** quand plusieurs règles métier échouent en même temps (ex. POST /books avec un ISBN déjà pris *et* un auteur inexistant). Zod couvre les validations de forme, mais les règles d'unicité doivent être vérifiées après coup, au niveau du contrôleur, ce qui risque de casser le format `{ success, message, errors }`.

**Solution** : j'ai centralisé le format d'erreur via un middleware `validate(schema)` qui transforme les erreurs Zod en `errors: { champ: [messages] }`, puis j'ai répliqué exactement ce même format dans les vérifications métier (unicité ISBN, existence de l'auteur). Ainsi, le front reçoit toujours la même structure, peu importe où la validation a échoué.

## 4. Amélioration souhaitée

Avec plus de temps, j'ajouterais :
- **Persistance réelle** via Prisma + SQLite pour remplacer le store en mémoire.
- **Pagination** sur `GET /books` et `GET /authors` (`?page`, `?limit`, en-tête `X-Total-Count`).
- **Rate limiting** avec `express-rate-limit` sur `/auth/login` pour éviter le bruteforce.
- **Tests d'intégration automatisés** avec Jest + Supertest, exécutés en CI (GitHub Actions) en complément des tests Postman/Newman.
- **Génération d'un SDK Flutter** à partir d'openapi.yaml via `openapi-generator` pour démontrer la réutilisabilité de la spec.
