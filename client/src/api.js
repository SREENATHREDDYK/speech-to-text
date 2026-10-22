const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

const request = async (path, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json' },
    });

    let body = null;
    try {
        body = await response.json();
    } catch (error) {}

    if (!response.ok) {
        throw new Error(body?.msg || `Request failed with status ${response.status}`);
    }
    return body.result;
};

export const getTranscripts = ({ search = '', sort = 'newest', from = '', to = '' } = {}) => {
    const params = new URLSearchParams({ sort });
    if (search) params.set('search', search);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return request(`/transcripts?${params}`);
};

export const updateTranscript = (id, text) => {
    return request(`/transcripts/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ text }),
    });
};

export const deleteTranscript = (id) => {
    return request(`/transcripts/${id}`, { method: 'DELETE' });
};

export const getAudioUrl = (id) => `${API_BASE_URL}/transcripts/${id}/audio`;

export const getWebSocketUrl = () => {
    if (import.meta.env.VITE_WS_URL) {
        return import.meta.env.VITE_WS_URL;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${window.location.host}/ws`;
};
