CREATE TABLE IF NOT EXISTS transcript_audio (
    transcript_id UUID PRIMARY KEY REFERENCES transcripts (id) ON DELETE CASCADE,
    audio BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
