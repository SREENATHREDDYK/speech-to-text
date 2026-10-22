import { useEffect, useRef, useState } from 'react';
import { MicIcon } from './Icons.jsx';
import LiveTranscription from './LiveTranscription.jsx';

function Recorder({ onSaved, onStatusChange }) {
    const [status, setStatus] = useState('idle');
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [finalText, setFinalText] = useState('');
    const [partialText, setPartialText] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const socketRef = useRef(null);
    const streamRef = useRef(null);
    const audioContextRef = useRef(null);

    useEffect(() => {
        onStatusChange(status);
    }, [status]);

    useEffect(() => {
        if (status !== 'recording') return;
        const timer = setInterval(() => setElapsedSeconds((prev) => prev + 1), 1000);
        return () => clearInterval(timer);
    }, [status]);

    const releaseMic = () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        audioContextRef.current?.close();
        streamRef.current = null;
        audioContextRef.current = null;
    };

    useEffect(() => {
        return () => {
            releaseMic();
            socketRef.current?.close();
        };
    }, []);

    const handleServerMessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'ready') {
            setStatus('recording');
        } else if (data.type === 'partial') {
            setPartialText(data.text);
        } else if (data.type === 'final') {
            setFinalText((prev) => `${prev} ${data.text}`.trim());
            setPartialText('');
        } else if (data.type === 'stopping') {
            setStatus('stopping');
            releaseMic();
            if (data.reason === 'limit') setMessage('Time limit reached, saving...');
        } else if (data.type === 'done') {
            setMessage(data.msg);
            if (data.result) onSaved();
        } else if (data.type === 'error') {
            setError(data.msg);
        }
    };

    const startRecording = async () => {
        setError('');
        setMessage('');
        setFinalText('');
        setPartialText('');
        setElapsedSeconds(0);
        setStatus('connecting');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
            });
            streamRef.current = stream;

            const audioContext = new AudioContext();
            audioContextRef.current = audioContext;
            await audioContext.audioWorklet.addModule('/pcm-worklet.js');
            const source = audioContext.createMediaStreamSource(stream);
            const worklet = new AudioWorkletNode(audioContext, 'pcm-worklet');
            source.connect(worklet);
            worklet.connect(audioContext.destination);

            const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
            const socket = new WebSocket(`${protocol}://${window.location.host}/ws`);
            socket.binaryType = 'arraybuffer';
            socketRef.current = socket;

            worklet.port.onmessage = (event) => {
                if (socket.readyState === WebSocket.OPEN) socket.send(event.data);
            };

            socket.onmessage = handleServerMessage;
            socket.onerror = () => setError('Connection to the server failed');
            socket.onclose = () => {
                releaseMic();
                setStatus('idle');
                setPartialText('');
                socketRef.current = null;
            };
        } catch (err) {
            releaseMic();
            setStatus('idle');
            setError(err.name === 'NotAllowedError' ? 'Microphone permission was denied' : err.message);
        }
    };

    const stopRecording = () => {
        setStatus('stopping');
        releaseMic();
        socketRef.current?.send(JSON.stringify({ type: 'stop' }));
    };

    const pauseRecording = async () => {
        setStatus('paused');
        await audioContextRef.current?.suspend();
        socketRef.current?.send(JSON.stringify({ type: 'pause' }));
    };

    const resumeRecording = async () => {
        socketRef.current?.send(JSON.stringify({ type: 'resume' }));
        await audioContextRef.current?.resume();
        setStatus('recording');
    };

    return (
        <section className="card">
            <div className="card-head">
                <h2>Record Speech</h2>
                <p className="muted">Speak naturally. Your speech will be transcribed in real time.</p>
            </div>

            <div className="record-layout">
                <div className="mic-side">
                    <div className={`mic-circle ${status === 'recording' ? 'is-live' : ''}`}>
                        <MicIcon size={54} />
                    </div>
                    <button className="btn btn-primary btn-lg" onClick={startRecording} disabled={status !== 'idle'}>
                        <span className="dot" /> {status === 'connecting' ? 'Connecting...' : 'Start Recording'}
                    </button>
                </div>

                <LiveTranscription
                    status={status}
                    elapsedSeconds={elapsedSeconds}
                    finalText={finalText}
                    partialText={partialText}
                    onStop={stopRecording}
                    onPause={pauseRecording}
                    onResume={resumeRecording}
                />
            </div>

            {error && <p className="error">{error}</p>}
            {message && <p className="muted">{message}</p>}
        </section>
    );
}

export default Recorder;
