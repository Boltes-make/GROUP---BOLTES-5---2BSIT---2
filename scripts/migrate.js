const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
});

async function runMigrations() {
    try {
        await client.connect();
        console.log("Connected to Supabase database successfully!");

        // 1. Patakbuhin ang base script
        const basePath = path.join(__dirname, '../database/HopeDB_audit.sql');
        if (fs.existsSync(basePath)) {
            console.log("Running base script: HopeDB_audit.sql...");
            const baseSql = fs.readFileSync(basePath, 'utf8');
            await client.query(baseSql);
            console.log("Base script executed successfully.");
        }

        // 2. Patakbuhin ang mga hiwalay na migrations sa loob ng migrations/ folder
        const migrationsDir = path.join(__dirname, '../database/migrations');
        if (fs.existsSync(migrationsDir)) {
            const files = fs.readdirSync(migrationsDir).sort();
            for (const file of files) {
                if (file.endsWith('.sql')) {
                    console.log(`Running migration: ${file}...`);
                    const migrationSql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
                    await client.query(migrationSql);
                    console.log(`Migration ${file} executed successfully.`);
                }
            }
        }

        console.log("All database migrations completed!");
    } catch (err) {
        console.error("Migration error:", err);
    } finally {
        await client.end();
    }
}

runMigrations();