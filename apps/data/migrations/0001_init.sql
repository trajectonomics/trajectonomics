-- traj-data holds numbers only: a contributor id, never an email or a name.
CREATE TABLE contributor (
	id TEXT PRIMARY KEY,
	auth_user_id TEXT UNIQUE,
	handle TEXT,
	kind TEXT NOT NULL CHECK (kind IN ('org', 'community')),
	created_at TEXT NOT NULL
);

INSERT INTO contributor (id, auth_user_id, handle, kind, created_at)
VALUES ('trajectonomics', NULL, NULL, 'org', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

CREATE TABLE usage_hourly (
	contributor_id TEXT NOT NULL REFERENCES contributor (id),
	machine TEXT NOT NULL,
	plan TEXT NOT NULL,
	model TEXT NOT NULL,
	hour_utc TEXT NOT NULL,
	granularity TEXT NOT NULL CHECK (granularity IN ('hour', 'day')),
	tokens_in INTEGER,
	tokens_out INTEGER,
	cache_read INTEGER,
	cache_write INTEGER,
	tokens_total INTEGER NOT NULL,
	requests INTEGER NOT NULL,
	source TEXT NOT NULL,
	best_effort INTEGER NOT NULL DEFAULT 0,
	received_at TEXT NOT NULL,
	PRIMARY KEY (contributor_id, machine, plan, model, hour_utc, source)
);

CREATE TABLE quota_sample (
	contributor_id TEXT NOT NULL REFERENCES contributor (id),
	plan TEXT NOT NULL,
	window TEXT NOT NULL CHECK (window IN ('five_hour', 'weekly', 'monthly')),
	sampled_at TEXT NOT NULL,
	used_pct REAL NOT NULL,
	resets_at TEXT,
	received_at TEXT NOT NULL,
	PRIMARY KEY (contributor_id, plan, window, sampled_at)
);

CREATE TABLE rollup_daily (
	series TEXT NOT NULL,
	day TEXT NOT NULL,
	plan TEXT NOT NULL,
	model TEXT NOT NULL,
	tokens_in INTEGER,
	tokens_out INTEGER,
	cache_read INTEGER,
	cache_write INTEGER,
	tokens_total INTEGER NOT NULL,
	requests INTEGER NOT NULL,
	granularity TEXT NOT NULL CHECK (granularity IN ('hour', 'day')),
	best_effort INTEGER NOT NULL,
	PRIMARY KEY (series, day, plan, model)
);

CREATE TABLE ingest_log (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	contributor_id TEXT NOT NULL REFERENCES contributor (id),
	received_at TEXT NOT NULL,
	rows INTEGER NOT NULL,
	status TEXT NOT NULL
);

-- The API filters rollups by series and day, then optionally by plan and model.
CREATE INDEX rollup_daily_series_day ON rollup_daily (series, day);
CREATE INDEX rollup_daily_series_plan_model_day ON rollup_daily (series, plan, model, day);

-- A replay reads the affected day before it rewrites the rollup.
CREATE INDEX usage_hourly_contributor_hour ON usage_hourly (contributor_id, hour_utc);

CREATE INDEX quota_sample_plan ON quota_sample (contributor_id, plan, sampled_at);

CREATE INDEX ingest_log_received_at ON ingest_log (received_at);
