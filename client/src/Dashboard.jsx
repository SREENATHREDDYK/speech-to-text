import { useEffect, useRef, useState } from 'react';
import { getTranscripts, updateTranscript, deleteTranscript, getAudioUrl } from './api.js';
import TranscriptItem from './TranscriptItem.jsx';
import TranscriptFilters, { getDateRange } from './TranscriptFilters.jsx';

const getEmptyHint = (search, dateRange) => {
    if (search && dateRange !== 'all') return 'Nothing matches your search in the selected date range.';
    if (search) return `Nothing matches "${search}". Try fewer or different letters.`;
    if (dateRange !== 'all')
        return 'There are no recordings in the selected date range. Choose All Dates to see everything.';
    return 'Start a recording above to create your first transcript.';
};

function Dashboard({ refreshKey }) {
    const [transcripts, setTranscripts] = useState([]);
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('newest');
    const [dateRange, setDateRange] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [playingId, setPlayingId] = useState(null);
    const audioRef = useRef(null);
    const audioUrlsRef = useRef({});

    useEffect(() => {
        let cancelled = false;
        const timer = setTimeout(async () => {
            setLoading(true);
            setError('');
            try {
                const result = await getTranscripts({ search: search.trim(), sort, ...getDateRange(dateRange) });
                if (!cancelled) setTranscripts(result);
            } catch (err) {
                if (!cancelled) setError(err.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }, 300);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [search, sort, dateRange, refreshKey]);

    const stopPlayback = () => {
        const audio = audioRef.current;
        if (audio) {
            audio.onended = null;
            audio.onerror = null;
            audio.pause();
        }
        audioRef.current = null;
    };

    const forgetAudioUrl = (id) => {
        if (audioUrlsRef.current[id]) {
            URL.revokeObjectURL(audioUrlsRef.current[id]);
            delete audioUrlsRef.current[id];
        }
    };

    useEffect(() => {
        return () => {
            stopPlayback();
            Object.keys(audioUrlsRef.current).forEach(forgetAudioUrl);
        };
    }, []);

    const loadAudioUrl = async (id) => {
        const response = await fetch(getAudioUrl(id));
        if (!response.ok) {
            throw new Error('Could not load this recording');
        }
        const blob = await response.blob();
        audioUrlsRef.current[id] = URL.createObjectURL(blob);
        return audioUrlsRef.current[id];
    };

    const togglePlay = async (id) => {
        const wasPlaying = playingId === id;
        stopPlayback();
        if (wasPlaying) {
            setPlayingId(null);
            return;
        }

        const audio = new Audio();
        audioRef.current = audio;
        setPlayingId(id);
        setError('');

        const isActive = () => audioRef.current === audio;
        const endPlayback = (message) => {
            if (!isActive()) return;
            audioRef.current = null;
            setPlayingId(null);
            if (message) setError(message);
        };
        audio.onended = () => endPlayback('');
        audio.onerror = () => endPlayback('Could not play this recording');

        try {
            audio.src = audioUrlsRef.current[id] || (await loadAudioUrl(id));
            if (!isActive()) return;
            await audio.play();
        } catch (err) {
            if (err.name === 'AbortError') return;
            endPlayback(err.name === 'NotAllowedError' ? 'Tap Play again to start playback' : err.message);
        }
    };

    const saveEdit = async (id, text) => {
        setError('');
        try {
            const updated = await updateTranscript(id, text);
            setTranscripts((prev) => prev.map((item) => (item.id === id ? updated : item)));
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this transcript?')) {
            return;
        }

        setError('');
        try {
            await deleteTranscript(id);
            if (playingId === id) {
                stopPlayback();
                setPlayingId(null);
            }
            forgetAudioUrl(id);
            setTranscripts((prev) => prev.filter((item) => item.id !== id));
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <section className="card">
            <div className="card-head">
                <h2>Saved Transcripts</h2>
                <p className="muted">View, search and manage your recorded transcripts.</p>
            </div>

            <TranscriptFilters
                search={search}
                sort={sort}
                dateRange={dateRange}
                onSearchChange={setSearch}
                onSortChange={setSort}
                onDateRangeChange={setDateRange}
            />

            {error && <p className="error">{error}</p>}
            {loading && transcripts.length === 0 && <p className="muted">Loading...</p>}
            {!loading && !error && transcripts.length === 0 && (
                <div className="empty-state">
                    <p className="empty-title">No transcripts found.</p>
                    <p className="muted">{getEmptyHint(search.trim(), dateRange)}</p>
                </div>
            )}

            <ul className="transcript-list">
                {transcripts.map((transcript) => (
                    <TranscriptItem
                        key={transcript.id}
                        transcript={transcript}
                        isPlaying={playingId === transcript.id}
                        onPlay={togglePlay}
                        onSave={saveEdit}
                        onDelete={handleDelete}
                    />
                ))}
            </ul>
        </section>
    );
}

export default Dashboard;
