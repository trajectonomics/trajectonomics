-- A signed-in browser on the data site: the SHA-256 hex of a random session id, never the id itself (ADR 0015).
CREATE TABLE web_session (
	session_hash TEXT PRIMARY KEY,
	auth_user_id TEXT NOT NULL,
	created_at TEXT NOT NULL,
	expires_at TEXT NOT NULL
);
CREATE INDEX web_session_expires_at ON web_session (expires_at);
CREATE INDEX web_session_auth_user_id ON web_session (auth_user_id);
