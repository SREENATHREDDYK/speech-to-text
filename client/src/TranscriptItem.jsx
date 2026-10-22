import { useState } from 'react';
import { CalendarIcon, ClockIcon, EditIcon, FileIcon, PlayIcon, StopIcon, TrashIcon } from './Icons.jsx';

const formatDuration = (ms) => {
    const totalSeconds = Math.round(ms / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
};

const formatDate = (value) =>
    new Date(value).toLocaleString(undefined, {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });

function TranscriptItem({ transcript, isPlaying, onPlay, onSave, onDelete }) {
    const [editing, setEditing] = useState(false);
    const [editText, setEditText] = useState('');
    const [saving, setSaving] = useState(false);
    const [editError, setEditError] = useState('');

    const startEdit = () => {
        setEditText(transcript.text);
        setEditError('');
        setEditing(true);
    };

    const handleSave = async () => {
        if (!editText.trim()) {
            setEditError('Text cannot be empty');
            return;
        }
        setSaving(true);
        const saved = await onSave(transcript.id, editText);
        setSaving(false);
        if (saved) setEditing(false);
    };

    return (
        <li className="transcript">
            <div className="file-icon">
                <FileIcon size={22} />
            </div>

            <div className="transcript-body">
                {editing ? (
                    <textarea value={editText} onChange={(event) => setEditText(event.target.value)} rows={3} />
                ) : (
                    <p className="text">{transcript.text}</p>
                )}
                {editError && <p className="error">{editError}</p>}

                <div className="meta">
                    <span>
                        <CalendarIcon size={15} /> {formatDate(transcript.createdAt)}
                    </span>
                    <span>
                        <ClockIcon size={15} /> {formatDuration(transcript.durationMs)}
                    </span>
                    {transcript.updatedAt !== transcript.createdAt && <span>Edited</span>}
                </div>
            </div>

            <div className="row-actions">
                {editing ? (
                    <>
                        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button className="btn btn-light btn-sm" onClick={() => setEditing(false)} disabled={saving}>
                            Cancel
                        </button>
                    </>
                ) : (
                    <>
                        <button className="btn btn-light btn-sm" onClick={startEdit}>
                            <EditIcon size={16} /> Edit
                        </button>
                        <button className="btn btn-danger-light btn-sm" onClick={() => onDelete(transcript.id)}>
                            <TrashIcon size={16} /> Delete
                        </button>
                        {transcript.hasAudio && (
                            <button
                                className="btn btn-light btn-icon"
                                onClick={() => onPlay(transcript.id)}
                                aria-label={isPlaying ? 'Stop playback' : 'Play recording'}
                                title={isPlaying ? 'Stop playback' : 'Play recording'}
                            >
                                {isPlaying ? <StopIcon size={16} /> : <PlayIcon size={16} />}
                            </button>
                        )}
                    </>
                )}
            </div>
        </li>
    );
}

export default TranscriptItem;
