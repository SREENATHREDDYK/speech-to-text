import fs from 'fs';
import pool from './connection.js';

const migrationsDir = new URL('./migrations/', import.meta.url);

const runMigrations = async () => {
    const files = fs
        .readdirSync(migrationsDir)
        .filter((file) => file.endsWith('.sql'))
        .sort();

    for (const file of files) {
        const sql = fs.readFileSync(new URL(file, migrationsDir), 'utf8');
        await pool.query(sql);
        console.log(`applied ${file}`);
    }
};

try {
    await runMigrations();
    console.log('migrations finished');
} catch (error) {
    console.error('migration failed:', error.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}
