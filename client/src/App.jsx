import { useState } from 'react';
import Recorder from './Recorder.jsx';
import Dashboard from './Dashboard.jsx';
import { MicIcon } from './Icons.jsx';

const STATUS_TEXT = {
    idle: 'Ready to record',
    connecting: 'Connecting...',
    recording: 'Listening',
    paused: 'Paused',
    stopping: 'Saving...',
};

function App() {
    const [refreshKey, setRefreshKey] = useState(0);
    const [status, setStatus] = useState('idle');

    return (
        <main className="app">
            <header className="app-header">
                <div className="brand">
                    <div className="brand-icon">
                        <MicIcon size={26} />
                    </div>
                    <div>
                        <h1>Speech to Text</h1>
                        <p className="subtitle">Convert your voice to text in real time</p>
                    </div>
                </div>
                <div className={`status-pill status-${status}`}>
                    <span className="status-dot" /> {STATUS_TEXT[status]}
                </div>
            </header>

            <Recorder onStatusChange={setStatus} onSaved={() => setRefreshKey((prev) => prev + 1)} />
            <Dashboard refreshKey={refreshKey} />
        </main>
    );
}

export default App;
