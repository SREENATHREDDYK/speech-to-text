import { GoogleGenAI, Modality } from '@google/genai';
import config from '../config/config.js';
import { saveRecording } from './save_recording.js';

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

const FLUSH_WAIT_MS = 2000;
const RESUME_WAIT_MS = 1500;
const FINAL_SETTLE_MS = 800;
const BYTES_PER_SECOND = 32000;

let activeSessions = 0;

const normalizeWord = (word = '') => word.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '');

const removeOverlap = (previousText = '', nextText) => {
    const previous = previousText.split(/\s+/).map(normalizeWord);
    const next = nextText.split(/\s+/);
    const nextNormalized = next.map(normalizeWord);

    for (let size = Math.min(previous.length, next.length); size > 0; size--) {
        if (previous.slice(-size).join(' ') === nextNormalized.slice(0, size).join(' ')) {
            return next.slice(size).join(' ');
        }
    }
    return nextText;
};

export const handleTranscription = async (browserSocket) => {
    const send = (message) => {
        if (browserSocket.readyState === browserSocket.OPEN) {
            browserSocket.send(JSON.stringify(message));
        }
    };

    if (!config.geminiApiKey) {
        send({ type: 'error', msg: 'Transcription is not configured on the server' });
        return browserSocket.close();
    }
    if (activeSessions >= config.maxConcurrentSessions) {
        send({ type: 'error', msg: 'Too many recordings in progress, try again in a minute' });
        return browserSocket.close();
    }
    activeSessions++;

    const finalParts = [];
    const audioChunks = [];
    let audioBytes = 0;
    let interimText = '';
    let geminiSession = null;
    let startedAt = null;
    let stoppedAt = null;
    let paused = false;
    let pausedAt = null;
    let pausedTotalMs = 0;
    let stopping = false;
    let finished = false;
    let limitTimer = null;
    let flushTimer = null;
    let resumeTimer = null;
    let waitingForFinal = false;
    let heldChunks = [];
    let resumedAfterPause = false;

    const sendAudio = (data) => {
        try {
            geminiSession.sendRealtimeInput({
                audio: { data: data.toString('base64'), mimeType: 'audio/pcm;rate=16000' },
            });
        } catch (error) {
            console.error('could not send audio to gemini:', error.message);
        }
    };

    const endAudioStream = () => {
        try {
            geminiSession.sendRealtimeInput({ audioStreamEnd: true });
        } catch (error) {
            console.error('could not end gemini audio stream:', error.message);
        }
    };

    const finish = async () => {
        if (finished) return;
        finished = true;
        activeSessions--;
        clearTimeout(limitTimer);
        clearTimeout(flushTimer);
        clearTimeout(resumeTimer);
        geminiSession?.close();

        if (interimText.trim()) {
            finalParts.push(interimText.trim());
        }
        const text = finalParts.join(' ').trim().slice(0, config.textMaxLength);

        const endedAt = stoppedAt || Date.now();
        const pausedMs = pausedTotalMs + (paused && !waitingForFinal ? endedAt - pausedAt : 0);
        const durationMs = startedAt ? Math.max(endedAt - startedAt - pausedMs, 0) : 0;

        if (!text) {
            send({ type: 'done', result: null, msg: 'No speech was detected, nothing was saved' });
            return browserSocket.close();
        }

        try {
            const result = await saveRecording({ text, durationMs, pcm: Buffer.concat(audioChunks) });
            send({ type: 'done', result, msg: 'Transcript saved' });
        } catch (error) {
            console.error('could not save transcript:', error.message || error.code);
            send({ type: 'error', msg: 'Could not save the transcript' });
        }
        browserSocket.close();
    };

    const stop = (reason) => {
        if (stopping) return;
        stopping = true;
        stoppedAt = Date.now();
        clearTimeout(limitTimer);
        send({ type: 'stopping', reason });

        if (!geminiSession) {
            return finish();
        }
        if (waitingForFinal) finishResume();
        endAudioStream();
        flushTimer = setTimeout(finish, FLUSH_WAIT_MS);
    };

    const pause = () => {
        if (waitingForFinal) finishResume();
        if (!startedAt || stopping || paused) return;
        paused = true;
        pausedAt = Date.now();
        endAudioStream();
        send({ type: 'paused' });
    };

    const finishResume = () => {
        if (!waitingForFinal) return;
        waitingForFinal = false;
        clearTimeout(resumeTimer);
        if (interimText.trim()) {
            finalParts.push(interimText.trim());
            interimText = '';
        }
        paused = false;
        heldChunks.forEach(sendAudio);
        heldChunks = [];
        resumedAfterPause = true;
        send({ type: 'resumed' });
    };

    const resume = () => {
        if (!paused || stopping || waitingForFinal) return;
        pausedTotalMs += Date.now() - pausedAt;
        waitingForFinal = true;
        if (interimText.trim()) {
            resumeTimer = setTimeout(finishResume, RESUME_WAIT_MS);
        } else {
            finishResume();
        }
    };

    const handleGeminiMessage = (message) => {
        if (message.setupComplete && !startedAt) {
            startedAt = Date.now();
            limitTimer = setTimeout(() => stop('limit'), config.sessionLimitSeconds * 1000);
            send({ type: 'ready', limitSeconds: config.sessionLimitSeconds });
        }

        const content = message.serverContent;
        if (content?.interimInputTranscription?.text) {
            interimText = content.interimInputTranscription.text;
            send({ type: 'partial', text: interimText });
            if (stopping) {
                clearTimeout(flushTimer);
                flushTimer = setTimeout(finish, FLUSH_WAIT_MS);
            }
        }
        if (content?.inputTranscription?.text) {
            let text = content.inputTranscription.text.trim();
            if (resumedAfterPause) {
                resumedAfterPause = false;
                text = removeOverlap(finalParts.at(-1), text);
            }
            if (text) finalParts.push(text);
            interimText = '';
            send({ type: 'final', text });

            if (waitingForFinal) finishResume();
            if (stopping) {
                clearTimeout(flushTimer);
                flushTimer = setTimeout(finish, FINAL_SETTLE_MS);
            }
        }

        if (message.goAway) {
            stop('limit');
        }
    };

    browserSocket.on('message', (data, isBinary) => {
        if (!isBinary) {
            let type = '';
            try {
                type = JSON.parse(data.toString()).type;
            } catch (error) {
                return;
            }
            if (type === 'stop') stop('user');
            if (type === 'pause') pause();
            if (type === 'resume') resume();
            return;
        }
        if (!geminiSession || !startedAt || stopping) return;
        if (paused && !waitingForFinal) return;

        if (audioBytes < config.sessionLimitSeconds * BYTES_PER_SECOND) {
            audioChunks.push(data);
            audioBytes += data.length;
        }

        if (waitingForFinal) {
            heldChunks.push(data);
            return;
        }
        sendAudio(data);
    });

    browserSocket.on('close', () => stop('disconnected'));

    try {
        geminiSession = await ai.live.connect({
            model: config.geminiModel,
            config: {
                responseModalities: [Modality.TEXT],
                inputAudioTranscription: { languageCodes: [] },
            },
            callbacks: {
                onmessage: handleGeminiMessage,
                onerror: (event) => console.error('gemini error:', event.message),
                onclose: (event) => {
                    if (!finished && event.code !== 1000) {
                        console.error('gemini closed:', event.code, event.reason);
                        send({ type: 'error', msg: 'Transcription service closed the connection' });
                    }
                    stop('disconnected');
                    finish();
                },
            },
        });

        if (finished) geminiSession.close();
    } catch (error) {
        console.error('could not connect to gemini:', error.message);
        send({ type: 'error', msg: 'Could not start transcription, try again' });
        finish();
    }
};
