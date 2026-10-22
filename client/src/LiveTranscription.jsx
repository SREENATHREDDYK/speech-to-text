import { PauseIcon, PlayIcon, StopIcon, WaveIcon } from './Icons.jsx';

const formatTime = (totalSeconds) => {
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
};

function LiveTranscription({ status, elapsedSeconds, finalText, partialText, onStop, onPause, onResume }) {
    const isActive = status === 'recording' || status === 'paused';

    return (
        <div className="live-panel">
            <div className="live-head">
                <h3>Live Transcription</h3>
                {status === 'recording' && (
                    <span className="listening">
                        <WaveIcon /> Listening...
                    </span>
                )}
                {status === 'paused' && <span className="paused-label">Paused</span>}
                <span className="timer">{formatTime(elapsedSeconds)}</span>
            </div>

            <div className="live-text">
                {finalText || partialText ? (
                    <>
                        {finalText} <span className="partial">{partialText}</span>
                    </>
                ) : (
                    <span className="muted">Live text appears here. Speak in Hindi, English or both.</span>
                )}
            </div>

            <div className="live-actions">
                <button className="btn btn-danger" onClick={onStop} disabled={!isActive}>
                    <StopIcon /> Stop Recording
                </button>
                {status === 'paused' ? (
                    <button className="btn btn-light" onClick={onResume}>
                        <PlayIcon /> Resume
                    </button>
                ) : (
                    <button className="btn btn-light" onClick={onPause} disabled={status !== 'recording'}>
                        <PauseIcon /> Pause
                    </button>
                )}
            </div>
        </div>
    );
}

export default LiveTranscription;
