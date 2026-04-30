const bcrypt = require('bcryptjs');
const { store, nextId } = require('./store');

function seed() {
  // Reset
  store.authors = [];
  store.books = [];
  store.borrows = [];
  store.users = [];
  store.counters = { author: 0, book: 0, borrow: 0, user: 0 };

  // Users
  // --- NOUVEAU : subscription_status (free/premium) ---
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@biblio.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  store.users.push({
    id: nextId('user'),
    email: adminEmail,
    password_hash: bcrypt.hashSync(adminPassword, 10),
    name: 'Administrateur',
    subscription_status: 'premium', // l'admin est premium par défaut
  });

  // Un utilisateur free pour tester la limite d'emprunts
  store.users.push({
    id: nextId('user'),
    email: 'free@biblio.local',
    password_hash: bcrypt.hashSync('free123', 10),
    name: 'Utilisateur Free',
    subscription_status: 'free',
  });

  // Authors
  const authors = [
    { first_name: 'Robert',      last_name: 'Martin',   nationality: 'Américaine' },
    { first_name: 'Victor',      last_name: 'Hugo',     nationality: 'Française' },
    { first_name: 'Chimamanda',  last_name: 'Adichie',  nationality: 'Nigériane' },
    { first_name: 'Haruki',      last_name: 'Murakami', nationality: 'Japonaise' },
  ];
  authors.forEach((a) => store.authors.push({ id: nextId('author'), ...a }));

  // Books
  // --- NOUVEAU : champ summary (null par défaut) ---
  const books = [
    { title: 'Clean Code',          isbn: '978-0132350884', year: 2008, available: true,  author_id: 1, summary: null },
    { title: 'Clean Architecture',  isbn: '978-0134494166', year: 2017, available: true,  author_id: 1, summary: null },
    { title: 'Les Misérables',      isbn: '978-2253096344', year: 1862, available: false, author_id: 2, summary: null },
    { title: 'Americanah',          isbn: '978-0307455925', year: 2013, available: true,  author_id: 3, summary: null },
    { title: 'Kafka on the Shore',  isbn: '978-1400079278', year: 2002, available: true,  author_id: 4, summary: null },
    { title: '1Q84',                isbn: '978-0307593313', year: 2009, available: true,  author_id: 4, summary: null },
  ];
  books.forEach((b) => store.books.push({ id: nextId('book'), ...b }));

  // Borrows
  // --- NOUVEAU : champ payment_status (pending/paid/free) ---
  store.borrows.push({
    id: nextId('borrow'),
    user_name: 'Alice Dupont',
    book_id: 3,
    borrowed_at: new Date('2026-01-15T10:00:00Z').toISOString(),
    returned_at: null,
    payment_status: 'free',
  });
  store.borrows.push({
    id: nextId('borrow'),
    user_name: 'Jean Martin',
    book_id: 2,
    borrowed_at: new Date('2026-02-10T14:30:00Z').toISOString(),
    returned_at: new Date('2026-02-20T09:00:00Z').toISOString(),
    payment_status: 'paid',
  });

  return store;
}

if (require.main === module) {
  require('dotenv')?.config?.();
  seed();
  console.log('✅ Seed terminé');
  console.log(`   ${store.authors.length} auteurs, ${store.books.length} livres, ${store.borrows.length} emprunts, ${store.users.length} utilisateur(s)`);
}

module.exports = { seed };