SpendWise Student Panel — integrated with Java/MySQL

This student panel uses the shared SpendWise Java API and MySQL database for login, expenses, monthly budgets, category limits, and savings goals. Active expense categories are loaded from the shared categories table managed by the admin panel.

For the combined setup instructions, database migration, and admin panel launch steps, read ../README-INTEGRATION.md.

Important: back up your database before running the one-time admin schema migration. Keep database credentials in SPENDWISE_DB_USER and SPENDWISE_DB_PASSWORD environment variables; do not put them in source files.
