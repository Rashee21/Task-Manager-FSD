# P8 — Asynchronous Task Manager API (MVC Architecture)

A clean, working REST API for a productivity platform: user registration with
bcrypt password hashing and JWT authentication (with refresh-token rotation),
role-based access (Admin / Manager / Member), task CRUD with priority, due
dates, tags and validated status transitions, task assignment, Joi validation
on every request body, centralised error handling, pagination / sorting /
filtering, an audit log for every task change, a productivity dashboard, and
a CSV team-report export.

Stack: Node.js + Express (MVC: routes → controllers → services → data layer),
Node's built-in SQLite (zero database setup, no separate database server),
Joi, bcryptjs, jsonwebtoken, Nodemailer (optional — without SMTP, emails print
to the console).

> Prisma note: `prisma/schema.prisma` in this repo is the data model for the
> P8 Prisma stage — same tables, columns and relations as the running code.
> The running code uses Node's built-in SQLite instead of the Prisma client
> so that `npm install` works with no engine download and no MySQL setup.
> If your teacher wants the Prisma client running, install `prisma` and
> `@prisma/client`, run `npx prisma db push`, and point `src/config/db.js`
> at a PrismaClient — the schema is already ready for that.

---

## 0. What you need before you start

- **Node.js 22.5 or newer (Node 24 LTS recommended — the project uses Node's built-in SQLite, which needs Node 22.5+)** — this gives you both `node` and `npm`.
  Check it after installing:
  - Windows PowerShell: `node --version` and `npm --version`
  - Mac / Linux terminal: same two commands
  - If either command is "not recognised", close and reopen the terminal after
    installing Node, then try again. That fixes it in most cases.
- No MySQL, no Docker, no other database is needed. The project uses a local
  SQLite file (`dev.db` in the project folder) that is created for you.
- A terminal, and optionally Postman or a REST client for testing the API.
  The examples below use PowerShell on Windows and `curl` on Mac/Linux.

## 1. Unzip and enter the project

1. Unzip `Task_Manager_API_P8.zip` anywhere, for example:
   - Windows: `Z:\Myself\Projects\Task_Manager_API_P8\`
   - Mac/Linux: `~/Projects/Task_Manager_API_P8/`
2. Open a terminal **inside that folder**:
   - Windows: in File Explorer, open the folder, click the address bar, type
     `powershell`, press Enter.
   - Mac: right-click the folder → New Terminal at Folder.
   - Linux: right-click the folder → Open in Terminal.

From now on, every command in this guide runs in that folder.

## 2. Install dependencies (one time)

```powershell
npm install
```

What this does, in plain words: it downloads the libraries listed in
`package.json` (Express, Prisma, bcrypt, JWT, Joi, Nodemailer, and the test
tools) into a `node_modules` folder. It can take a minute the first time.
Do not interrupt it, and do not run it again unless you delete `node_modules`.

## 3. Create your `.env` file (one time)

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Mac / Linux:

```bash
cp .env.example .env
```

Open `.env` in any text editor and change these two lines to long random
strings (any random text works, just do not leave the example values in a
real deployment):

```
JWT_SECRET=change-this-access-secret-to-a-long-random-string
JWT_REFRESH_SECRET=change-this-refresh-secret-to-a-different-long-random-string
```

Leave `DATABASE_URL="file:./dev.db"` as it is. Leave the SMTP lines empty
unless you want real emails — without them, assignment emails are printed
to the server console instead of being sent, which is fine for a demo.

To send real emails later, fill in `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`
and `SMTP_PASS` (for Gmail, use an App Password, not your normal password).

## 4. Create the database and seed demo data (one time)

```powershell
npm run setup
```

What this does, in plain words: `node prisma/seed.js` creates the tables
(users, projects, tasks, tags, audit_log, refresh_tokens) in `dev.db`
(tables are created automatically the first time the app or seed script runs),
then inserts demo users, one project and two tasks.

Demo logins (all use the same password):

| Role    | Email              | Password     |
|---------|--------------------|--------------|
| Admin   | admin@demo.local   | Password123! |
| Manager | manager@demo.local | Password123! |
| Member  | member@demo.local  | Password123! |

If you run `npm run setup` again later, it will not duplicate the seed
users — it updates them if they already exist.

## 5. Start the server

```powershell
npm run dev
```

You should see:

```
Task Manager API listening on http://localhost:3000
Health check: http://localhost:3000/health
```

Keep this terminal window open — the server runs there. Open a **second**
terminal window (in the same folder) for the test commands below, or use
Postman. To stop the server later, press `Ctrl + C` in the server window.

Health check (in the second terminal):

- Windows PowerShell: `Invoke-RestMethod http://localhost:3000/health`
- Mac / Linux: `curl http://localhost:3000/health`

Expected reply: `{"status":"ok","service":"task-manager-api"}`

> Windows warning: in PowerShell, `curl` is an alias for
> `Invoke-WebRequest`, not real curl. Use `Invoke-RestMethod` as shown,
> or type `curl.exe` if you really want curl. The examples below use
> `Invoke-RestMethod` for Windows and `curl` for Mac/Linux.

## 5b. Open the web app

With the server running, open **http://localhost:3000** in your browser. The
frontend (`public/index.html`) is served by the same Express server: log in
with one of the demo accounts, drag tasks across the board, view the
dashboard, manage projects and (as Admin) add users. It needs no extra
install or build step.

## 6. Try it end to end (copy-paste)

### 6a. Log in as the demo manager and save the token

Windows PowerShell:

```powershell
$login = Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/auth/login `
  -ContentType "application/json" `
  -Body '{"email":"manager@demo.local","password":"Password123!"}'
$token = $login.accessToken
$token
```

Mac / Linux:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@demo.local","password":"Password123!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
echo $TOKEN
```

The token is a long string starting with `eyJ`. Access tokens last 15
minutes. If a request later returns "Access token is invalid or expired",
log in again, or use the refresh endpoint (section 7).

### 6b. List tasks

Windows PowerShell:

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/tasks `
  -Headers @{ Authorization = "Bearer $token" }
```

Mac / Linux:

```bash
curl -s http://localhost:3000/api/tasks -H "Authorization: Bearer $TOKEN"
```

### 6c. Create a task (manager assigning it to the demo member, id 3)

Windows PowerShell:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/tasks `
  -ContentType "application/json" `
  -Headers @{ Authorization = "Bearer $token" } `
  -Body '{"title":"Fix the signup page","priority":"HIGH","assignedToId":3,"tags":["backend"]}'
```

Mac / Linux:

```bash
curl -s -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Fix the signup page","priority":"HIGH","assignedToId":3,"tags":["backend"]}'
```

You should get the new task back with status `TODO`. The server console
will also print an assignment email (because no SMTP is configured).

### 6d. Move a task through the state machine

Valid moves only: TODO → IN_PROGRESS → REVIEW → DONE, one step back
allowed, and DONE → IN_PROGRESS to reopen. TODO → DONE directly is
rejected with a 400 error — that is intentional.

Windows PowerShell (task id 1):

```powershell
Invoke-RestMethod -Method Patch -Uri http://localhost:3000/api/tasks/1 `
  -ContentType "application/json" `
  -Headers @{ Authorization = "Bearer $token" } `
  -Body '{"status":"REVIEW"}'
```

Mac / Linux:

```bash
curl -s -X PATCH http://localhost:3000/api/tasks/1 \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"status":"REVIEW"}'
```

### 6e. Dashboard and CSV export

Windows PowerShell:

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/dashboard `
  -Headers @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:3000/api/dashboard/export?format=csv" `
  -Headers @{ Authorization = "Bearer $token" } -OutFile team-report.csv
```

Mac / Linux:

```bash
curl -s http://localhost:3000/api/dashboard -H "Authorization: Bearer $TOKEN"
curl -s "http://localhost:3000/api/dashboard/export?format=csv" -H "Authorization: Bearer $TOKEN" -o team-report.csv
```

## 7. All API endpoints

All routes except `/health`, `/api/auth/register`, `/api/auth/login`,
`/api/auth/refresh` and `/api/auth/logout` need this header:

```
Authorization: Bearer <accessToken>
```

| Method | Route | Who can use it | What it does |
|---|---|---|---|
| GET | /health | Anyone | Server is up |
| POST | /api/auth/register | Anyone | Create a MEMBER account |
| POST | /api/auth/login | Anyone | Returns access + refresh tokens |
| POST | /api/auth/refresh | Anyone with a refresh token | Rotates refresh token, returns a new pair. Body: `{"refreshToken":"..."}` |
| POST | /api/auth/logout | Anyone | Revokes the refresh token. Body: `{"refreshToken":"..."}` |
| GET | /api/auth/me | Any logged-in user | Your own profile |
| POST | /api/auth/users | ADMIN only | Create a user with any role |
| POST | /api/projects | ADMIN, MANAGER | Create a project |
| GET | /api/projects | Any logged-in user | List projects |
| DELETE | /api/projects/:id | ADMIN only | Delete a project |
| POST | /api/tasks | ADMIN, MANAGER, MEMBER* | Create a task |
| GET | /api/tasks | Any logged-in user | List tasks, with pagination / filtering / sorting (below) |
| GET | /api/tasks/:id | Any logged-in user | One task |
| GET | /api/tasks/:id/audit | Any logged-in user | Audit log for that task |
| PATCH | /api/tasks/:id | ADMIN, MANAGER, MEMBER* | Update a task (status transitions validated) |
| DELETE | /api/tasks/:id | ADMIN only | Delete a task |
| GET | /api/dashboard | Any logged-in user | Totals, by status, by priority, overdue count |
| GET | /api/dashboard/export?format=csv | Any logged-in user | Team report as CSV (without `?format=csv` it returns JSON) |

\* Member rule: a Member can only create a task assigned to themselves,
and can only update tasks assigned to them, and cannot reassign tasks.
Admins and Managers can create, assign and update any task.

Task list query parameters (all optional):
`?page=1&limit=20&status=TODO&priority=HIGH&assignedToId=3&projectId=1&search=login&sortBy=dueDate&sortOrder=asc`

## 8. Run the tests

```powershell
npm test
```

This runs Jest unit tests for the status machine and Joi validation.
They do not need the server to be running.

## 9. Project layout (MVC)

```
src/
  public/index.html    # Web frontend (served at http://localhost:3000)
  server.js            # Starts the server (npm run dev / npm start)
  app.js               # Express app: middleware, routes, error handler
  config/db.js         # One shared Prisma client
  routes/              # URL -> controller mapping only, no business logic
  controllers/         # Read the request, call a service, send the reply
  services/            # Business logic: auth, task rules, audit, dashboard
  config/store.js      # Data-access layer (SQL) — services never write raw SQL elsewhere
  middleware/          # Auth, roles, Joi validation, asyncHandler, errors
  validations/         # Joi schemas
  utils/               # Tokens, email, status machine
prisma/
  schema.prisma        # Reference data model for the P8 Prisma stage (same tables as the running code)
  seed.js              # Demo data (uses the built-in SQLite store)
tests/                 # Jest tests
.github/workflows/ci.yml  # Run tests on every pull request
```

Rule the code follows: controllers never talk to the database directly
(except for simple lookups), and services never read `req` or `res`.
That separation is the whole point of the MVC requirement in P8.

## 10. Switching to MySQL or PostgreSQL later (optional)

The included `prisma/schema.prisma` already describes the same model for
MySQL/PostgreSQL: change its `provider` to `"mysql"` (or `"postgresql"`),
install `prisma` + `@prisma/client`, set `DATABASE_URL` in `.env` to your
database connection string, run `npx prisma db push`, and point
`src/config/db.js` at a PrismaClient. The service and controller logic
was written against that same shape, so only the data layer changes.

## 11. Troubleshooting

- **"node:sqlite" errors / "DatabaseSync is not defined":** your Node is too
  old. This project needs Node 22.5+. Install Node 24 LTS, close and reopen
  the terminal, then run `node --version` to confirm.
- **"Environment variable not found: DATABASE_URL":** you skipped step 3.
  Make sure a file named exactly `.env` (not `.env.txt`) exists in the
  project folder, next to `package.json`.
- **Port 3000 already in use:** another program is using port 3000. Either
  stop that program, or change `PORT=3000` in `.env` to `PORT=3001` and
  use `http://localhost:3001` in all the URLs above.
- **"Access token is invalid or expired":** access tokens last 15 minutes
  by design. Log in again for a fresh token, or call
  `POST /api/auth/refresh` with your refresh token.
- **"Members can only update their own tasks" (403):** you are logged in
  as a Member trying to edit someone else's task. Log in as
  manager@demo.local or admin@demo.local instead.
- **"Invalid status transition" (400):** you skipped a step in the state
  machine. Go TODO → IN_PROGRESS → REVIEW → DONE, in that order.
- **Database is locked / `dev.db-journal` errors:** stop the server
  (Ctrl + C), delete `prisma/dev.db-journal` if it exists, then run
  `npm run setup` and start again. Do not delete `dev.db` unless you
  want to lose all your data — if you do, `npm run setup` recreates it.
- **Emails are not arriving:** that is expected without SMTP. Check the
  server console — the email text is printed there. Add SMTP settings to
  `.env` to send real mail.

## 12. What NOT to run

- Do not run `npm install` inside `node_modules`, and do not commit `.env`
  or `prisma/dev.db` to git — both are in `.gitignore` already.
- Do not run the seed script against a production database: it creates
  demo users with a known password.
- Do not edit `prisma/schema.prisma` and then skip `npx prisma db push` —
  the code and the database will be out of sync until you do.
