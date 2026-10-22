import pg from 'pg';
import config from './src/config/config.js';

const pool = new pg.Pool({
    connectionString: config.databaseUrl,
    max: 10,
    connectionTimeoutMillis: 5000,
});

pool.on('error', (error) => {
    console.error('database pool error:', error.message);
});

export default pool;
