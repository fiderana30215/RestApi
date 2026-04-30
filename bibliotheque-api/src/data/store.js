// Simple in-memory data store
// books ont maintenant: summary (TEXT nullable)
// borrows ont maintenant: payment_status (pending/paid/free)
// users ont maintenant: subscription_status (free/premium)

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