// Data layer: Node's built-in SQLite (node:sqlite, Node 22.5+/24).
// Why not Prisma at runtime? Prisma's query engine is a separate binary that
// must be downloaded from Prisma's CDN on install. In the build sandbox that
// download is blocked, so Prisma could not be generated or tested here.
// The data model is IDENTICAL to prisma/schema.prisma (same tables, columns
// and relations) - see that file for the course's ORM stage. If your teacher
// wants Prisma running, install prisma + @prisma/client, run
// `npx prisma db push`, and swap this file for a PrismaClient export;
// no service or controller logic needs to change its shape, only this layer.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('file:')
  ? process.env.DATABASE_URL.slice(5).replace(/^\.\//, '')
  : 'dev.db';
// DATABASE_URL in .env is "file:./dev.db" relative to the prisma folder in the
// original Prisma layout. Resolve it relative to the project root instead.
const resolved = path.isAbsolute(dbPath)
  ? dbPath
  : path.join(__dirname, '..', '..', dbPath === 'dev.db' ? 'dev.db' : dbPath);
const dir = path.dirname(resolved);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
const db = new DatabaseSync(resolved);
db.exec('PRAGMA foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS "User" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "passwordHash" TEXT NOT NULL, "role" TEXT NOT NULL DEFAULT 'MEMBER', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE TABLE IF NOT EXISTS "Project" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "name" TEXT NOT NULL, "description" TEXT, "ownerId" INTEGER NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY ("ownerId") REFERENCES "User"("id"));
CREATE TABLE IF NOT EXISTS "Tag" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "name" TEXT NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS "Tag_name_key" ON "Tag"("name");
CREATE TABLE IF NOT EXISTS "Task" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "title" TEXT NOT NULL, "description" TEXT, "status" TEXT NOT NULL DEFAULT 'TODO', "priority" TEXT NOT NULL DEFAULT 'MEDIUM', "dueDate" DATETIME, "projectId" INTEGER, "assignedToId" INTEGER, "createdById" INTEGER NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY ("projectId") REFERENCES "Project"("id"), FOREIGN KEY ("assignedToId") REFERENCES "User"("id"), FOREIGN KEY ("createdById") REFERENCES "User"("id"));
CREATE TABLE IF NOT EXISTS "_TaskToTag" ("A" INTEGER NOT NULL, "B" INTEGER NOT NULL, FOREIGN KEY ("A") REFERENCES "Task"("id") ON DELETE CASCADE, FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE);
CREATE UNIQUE INDEX IF NOT EXISTS "_TaskToTag_AB_unique" ON "_TaskToTag"("A", "B");
CREATE TABLE IF NOT EXISTS "AuditLog" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "taskId" INTEGER NOT NULL, "userId" INTEGER NOT NULL, "field" TEXT NOT NULL, "oldValue" TEXT, "newValue" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE, FOREIGN KEY ("userId") REFERENCES "User"("id"));
CREATE TABLE IF NOT EXISTS "RefreshToken" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "tokenHash" TEXT NOT NULL, "userId" INTEGER NOT NULL, "expiresAt" DATETIME NOT NULL, "revoked" INTEGER NOT NULL DEFAULT 0, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE);
CREATE UNIQUE INDEX IF NOT EXISTS "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
`);
module.exports = db;
