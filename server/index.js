import express from 'express';
import { WebSocketServer } from 'ws';
import config from './src/config/config.js';
import pool from './connection.js';
import responseHandler from './src/middlewares/response-handler.js';
import responseMessages from './src/middlewares/response-messages.js';
import { errorHandler } from './src/middlewares/error.js';
import router from './src/routes/__index.js';
import { handleTranscription } from './src/services/gemini_live.js';

const app = express();

app.disable('x-powered-by');
app.use(responseHandler());
app.use(express.json({ limit: config.jsonBodyLimit }));

app.get('/health', async (req, res) => {
    let database = 'connected';
    try {
        await pool.query('SELECT 1');
    } catch (error) {
        database = 'disconnected';
    }

    return res.ok({
        msg: responseMessages[1012],
        result: { status: 'up', database, uptime: Math.round(process.uptime()) },
    });
});

app.use('/', router);

app.use((req, res) => res.notFound({ msg: responseMessages[1008] }));

app.use(errorHandler);

if (!config.databaseUrl) {
    console.warn('DATABASE_URL is empty - database routes will answer 503 until it is set');
}

const server = app.listen(config.port, (error) => {
    if (error) {
        console.error(`could not start server on port ${config.port}:`, error.message);
        process.exit(1);
    }
    console.log(`server running on port ${config.port}`);
});

const isAllowedOrigin = (req) => {
    const origin = req.headers.origin;
    if (!origin) return false;
    if (config.allowedOrigins.includes(origin)) return true;

    try {
        return new URL(origin).host === req.headers.host;
    } catch (error) {
        return false;
    }
};

const wss = new WebSocketServer({ noServer: true, maxPayload: config.maxAudioChunkBytes });

server.on('upgrade', (req, socket, head) => {
    if (req.url !== '/ws' || !isAllowedOrigin(req)) {
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
        return socket.destroy();
    }

    wss.handleUpgrade(req, socket, head, (browserSocket) => handleTranscription(browserSocket));
});

const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);

    server.close(async () => {
        await pool.end();
        process.exit(0);
    });

    setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
