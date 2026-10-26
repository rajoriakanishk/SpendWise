# SpendWise Student + Admin Panels

This project contains the student frontend, the admin frontend, and the Java/MySQL API. Both panels use the same `spendwise` MySQL database and session cookie.

## Included
- `spendwise-student-panel/` — existing student UI and Java API source
- `spendwise-admin-panel/` — admin UI connected to live API data
- `spendwise-student-panel/spendwise-backend/AdminDAO.java` — admin data operations
- `spendwise-student-panel/spendwise-backend/admin-schema.sql` — one-time schema migration for user status/date and shared categories
- `spendwise-student-panel/spendwise-backend/CreateAdmin.java` — one-time admin account creator

## Setup (do this in order)

1. **Back up your `spendwise` database.**
2. In MySQL Workbench, select the `spendwise` database and run `spendwise-student-panel/spendwise-backend/admin-schema.sql` once. This adds `users.status`, `users.created_at`, and the shared `categories` table. The script is a one-time migration; do not rerun it after it succeeds.
3. Set the database environment variables in the terminal you will use to run Java:
   - Windows PowerShell:
     ```powershell
     $env:SPENDWISE_DB_USER="your_mysql_username"
     $env:SPENDWISE_DB_PASSWORD="your_mysql_password"
     ```
   - macOS/Linux:
     ```bash
     export SPENDWISE_DB_USER="your_mysql_username"
     export SPENDWISE_DB_PASSWORD="your_mysql_password"
     ```
   These credentials are read by `DatabaseConnection.java`; they are not stored in source code.
4. Compile the backend from the backend directory:
   - Windows PowerShell:
     ```powershell
     cd .\spendwise-student-panel\spendwise-backend
     javac -cp ".;lib/*" *.java
     ```
   - macOS/Linux:
     ```bash
     cd spendwise-student-panel/spendwise-backend
     javac -cp ".:lib/*" *.java
     ```
5. If you do not already have an account with role `ADMIN`, create one using the same terminal and environment:
   - Windows: `java -cp ".;lib/*" CreateAdmin`
   - macOS/Linux: `java -cp ".:lib/*" CreateAdmin`
   Follow the prompts. Use a strong password and keep it private.
6. Start the API server from the same backend directory:
   - Windows: `java -cp ".;lib/*" SpendWiseServer`
   - macOS/Linux: `java -cp ".:lib/*" SpendWiseServer`
   Check `http://localhost:8080/api/health` and `http://localhost:8080/api/db-health`.
7. Open the **project folder** in VS Code and run Live Server on port `5500` (the backend CORS configuration allows `http://localhost:5500`):
   - Student panel: `spendwise-student-panel/index.html`
   - Admin panel: `spendwise-admin-panel/login.html`

## What is connected
- Admin login verifies an existing MySQL account with role `ADMIN`; the backend checks the role on every admin API request.
- Admin dashboard totals are queried from MySQL.
- Admin Users reads and writes the `users` table. New users get a BCrypt-hashed password. Admin deletion is limited to student accounts and removes that student's expenses, budget, savings goals, and category limits.
- Admin Transactions reads the shared `expenses` table. Create/edit/delete actions update the same expenses that students see. The existing student schema has no income-transaction table, so this admin UI only supports expenses.
- Admin Categories uses the shared `categories` table. Active categories are fetched by the student panel when it loads.
- Marking a user inactive blocks subsequent student/admin logins and administrator API access. Existing student endpoints otherwise remain in place.

## Notes
- If Live Server uses a port other than `5500`, update `Access-Control-Allow-Origin` in `SpendWiseServer.addCorsHeaders`.
- The admin UI does not display or return password hashes.
- This integration was compile-checked, and both JavaScript files were syntax-checked. A live MySQL connection and browser end-to-end test require your local MySQL credentials and running database.
