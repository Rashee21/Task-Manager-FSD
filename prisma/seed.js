require('dotenv').config();
// Seed data. Run: npm run setup
// All seed users share the password: Password123!
// Change these passwords after your demo, or delete the seed users.
// Note: this script uses src/config/store.js (Node built-in SQLite).
// The tables are created automatically when store.js is first loaded,
// so no separate `prisma db push` step is needed for the running code.
// The data model matches prisma/schema.prisma exactly.
const bcrypt = require('bcryptjs');
const store = require('../src/config/store');
async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 10);
  function upsertUser(name, email, role) {
    const existing = store.userByEmail(email);
    if (existing) return existing;
    return store.createUser({ name, email, passwordHash, role });
  }
  const admin = upsertUser('Asha Admin', 'admin@demo.local', 'ADMIN');
  const manager = upsertUser('Meera Manager', 'manager@demo.local', 'MANAGER');
  const member = upsertUser('Ravi Member', 'member@demo.local', 'MEMBER');
  let project = store.db.prepare('SELECT * FROM "Project" WHERE id = 1').get();
  if (!project) {
    const r = store.db.prepare('INSERT INTO "Project" (name, description, ownerId) VALUES (?, ?, ?)').run('Website Relaunch', 'Demo project created by the seed script.', manager.id);
    project = store.projectById(Number(r.lastInsertRowid));
  }
  function upsertTask(id, data) {
    if (store.taskRow(id)) return;
    store.db.prepare('INSERT INTO "Task" (id, title, description, status, priority, dueDate, projectId, assignedToId, createdById) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      id, data.title, data.description, data.status, data.priority,
      data.dueDate ? data.dueDate.toISOString() : null, data.projectId, data.assignedToId, data.createdById);
    store.setTaskTags(id, data.tags);
  }
  upsertTask(1, { title: 'Build the login API', description: 'JWT login + refresh token rotation.', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: new Date(Date.now() + 3 * 86400000), projectId: project.id, assignedToId: member.id, createdById: manager.id, tags: ['backend'] });
  upsertTask(2, { title: 'Write the README', description: 'From-scratch run instructions.', status: 'TODO', priority: 'MEDIUM', dueDate: null, projectId: project.id, assignedToId: member.id, createdById: admin.id, tags: ['urgent'] });
  console.log('Seeded: admin@demo.local / manager@demo.local / member@demo.local (password: Password123!)');
}
main().catch((e) => { console.error(e); process.exit(1); });
