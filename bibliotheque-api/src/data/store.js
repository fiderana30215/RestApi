// Simple in-memory data store (pour simplifier — pas besoin de BDD externe).
// Remplaçable facilement par une vraie BDD (Prisma/SQLite) plus tard.

const store = {
  authors: [],
  books: [],
  borrows: [],
  users: [],
  counters: { author: 0, book: 0, borrow: 0, user: 0 },
};

function nextId(key) {
  store.counters[key] += 1;
  return store.counters[key];
}

module.exports = { store, nextId };
