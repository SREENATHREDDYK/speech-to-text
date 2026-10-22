import db from '../models/index.js';
import { formatTranscript, pcmToWav } from '../utils/commonUtils.js';

export const saveRecording = async ({ text, durationMs, pcm }) => {
    const row = await db.transcripts.create({ text, durationMs });

    let hasAudio = false;
    if (pcm.length) {
        try {
            await db.transcripts.saveAudio(row.id, pcmToWav(pcm));
            hasAudio = true;
        } catch (error) {
            console.error('could not save audio:', error.message || error.code);
        }
    }

    return { ...formatTranscript(row), hasAudio };
};
