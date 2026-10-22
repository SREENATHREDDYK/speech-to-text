import pool from '../../connection.js';

const escapeLike = (value) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

const HAS_AUDIO = 'EXISTS (SELECT 1 FROM transcript_audio a WHERE a.transcript_id = transcripts.id) AS has_audio';

export default {
    create: async (data) => {
        const { rows } = await pool.query('INSERT INTO transcripts (text, duration_ms) VALUES ($1, $2) RETURNING *', [
            data.text,
            data.durationMs,
        ]);
        return rows[0];
    },

    findById: async (id) => {
        const { rows } = await pool.query(`SELECT *, ${HAS_AUDIO} FROM transcripts WHERE id = $1`, [id]);
        return rows[0] || null;
    },

    findAll: async ({ search, sort, from, to, limit }) => {
        const conditions = [];
        const values = [];

        if (search) {
            values.push(`%${escapeLike(search)}%`);
            conditions.push(`text ILIKE $${values.length}`);
        }
        if (from) {
            values.push(from);
            conditions.push(`created_at >= $${values.length}`);
        }
        if (to) {
            values.push(to);
            conditions.push(`created_at < $${values.length}`);
        }
        values.push(limit);

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const order = sort === 'oldest' ? 'ASC' : 'DESC';

        const { rows } = await pool.query(
            `SELECT *, ${HAS_AUDIO} FROM transcripts ${where} ORDER BY created_at ${order} LIMIT $${values.length}`,
            values
        );
        return rows;
    },

    updateText: async (id, text) => {
        const { rows } = await pool.query(
            `UPDATE transcripts SET text = $2, updated_at = now() WHERE id = $1 RETURNING *, ${HAS_AUDIO}`,
            [id, text]
        );
        return rows[0] || null;
    },

    deleteById: async (id) => {
        const { rowCount } = await pool.query('DELETE FROM transcripts WHERE id = $1', [id]);
        return rowCount > 0;
    },

    saveAudio: async (transcriptId, wav) => {
        await pool.query('INSERT INTO transcript_audio (transcript_id, audio) VALUES ($1, $2)', [transcriptId, wav]);
    },

    findAudio: async (transcriptId) => {
        const { rows } = await pool.query('SELECT audio FROM transcript_audio WHERE transcript_id = $1', [
            transcriptId,
        ]);
        return rows[0]?.audio || null;
    },
};
