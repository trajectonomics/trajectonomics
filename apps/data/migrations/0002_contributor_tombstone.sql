-- One row per deleted auth user: the SHA-256 hex of the id, never the id itself (ADR 0015).
CREATE TABLE contributor_tombstone (
	auth_user_hash TEXT PRIMARY KEY,
	deleted_at TEXT NOT NULL
);
