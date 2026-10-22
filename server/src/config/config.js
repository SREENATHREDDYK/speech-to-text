const config = {
    port: Number(process.env.PORT) || 5000,
    isProduction: process.env.NODE_ENV === 'production',
    databaseUrl: process.env.DATABASE_URL || '',

    jsonBodyLimit: '100kb',
    textMaxLength: 50000,
    maxDurationMs: 60 * 60 * 1000,
    searchMaxLength: 200,
    listLimit: 100,

    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: 'gemini-3.5-transcribe-live',
    sessionLimitSeconds: Math.min(Number(process.env.SESSION_LIMIT_SECONDS) || 300, 600),
    maxConcurrentSessions: Number(process.env.MAX_CONCURRENT_SESSIONS) || 3,
    allowedOrigins: (process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    maxAudioChunkBytes: 64 * 1024,
};

export default config;
