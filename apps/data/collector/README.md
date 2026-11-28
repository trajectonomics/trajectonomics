# @trajectonomics/data-collector

Reads the local logs of the AI coding tools on this machine and prints **hourly usage totals** as
one JSON object per line. It can also sample the subscription quotas of Claude, OpenCode Go,
Antigravity, Cursor and Meta (Muse), and send both kinds of row to the `data` Worker in batches.
Sending is a separate subcommand; reading logs alone does no network I/O.

## Run

```sh
bun apps/data/collector/src/cli.ts --since 2026-11-24T00:00:00Z
bun apps/data/collector/src/cli.ts usage --since 2026-11-24T00:00:00Z --mistral-csv ~/Downloads/mistral-usage.csv
bun apps/data/collector/src/cli.ts quota
bun apps/data/collector/src/cli.ts login
bun apps/data/collector/src/cli.ts whoami
bun apps/data/collector/src/cli.ts send rows.jsonl
bun apps/data/collector/src/cli.ts hourly --config ~/.config/traj-data/hosts.json
```

With no subcommand, or with `usage`, the collector prints usage rows. `--machine` defaults to `m-`
plus the first 8 hex chars of SHA-256(`os.hostname()`), so raw hostnames never appear in the output;
pass `--machine` to override the label. Rows are sorted by UTC bucket, plan, model and source. The
`--mistral-csv` import is the only input outside `$HOME` and is opt-in.

Rows whose plan is `unknown` are dropped before printing or sending, with one stderr line per run
that carries the count. The sender drops them again in case it is fed a file from an older run.

`--skip-opencode-before <ISO>` drops a row whose `source` includes `opencode-db` and whose
`hourUtc` is at or before that time. A combined row (`opencode-db+pi-jsonl`) is dropped whole: its
OpenCode part cannot be separated, and keeping it would resend a copied database.

## What it reads

| Source | Path | Plan |
| --- | --- | --- |
| Claude Code | `~/.claude/projects/**/*.jsonl` | `claude` |
| OpenCode | `~/.local/share/opencode/opencode.db` (read-only) | `opencode-go`, `opencode-free` |
| Pi | `~/.pi/**/*.jsonl` | matched from the provider id |
| Antigravity | `~/.gemini/**/transcript.jsonl`, `~/.t3/userdata/providers/antigravity/**/transcript.jsonl` | `antigravity` |
| Cursor | `~/.cursor/projects/*/sdk-agent-store/*/index.db` (read-only) | `cursor` |
| T3 Code (Muse) | `~/.t3/userdata/logs/provider/*.log` | `meta` |
| Mistral console CSV | `--mistral-csv <path>` | `mistral` |

Claude streaming repeats one request's usage several times, so one row is kept per `requestId`
(the occurrence with the largest `output_tokens`; a tie keeps one). Claude `<synthetic>` models are
skipped. OpenCode has two schemas in the wild (`message` and the newer `session_message`); both are
read when present, only assistant rows are selected in SQL, and a message id seen in both counts
once. With `--since`, Claude, Pi and Antigravity files whose mtime is older than the cutoff are not
opened. Antigravity is read from `~/.gemini` and from T3 Code's own
`~/.t3/userdata/providers/antigravity` tree; `transcript_full.jsonl` duplicates the same steps and
is skipped, a conversation present under both roots counts once (and its model inference spans
both), and a step with no model borrows its conversation's only model, else it is `unknown-gemini`.
T3's `claudeAgent` lines are ignored because Claude Code's own logs are the Claude source.

Reasoning is part of `tokensOut` only when the source reports it outside its output count.
OpenCode's `tokens.output` excludes `tokens.reasoning`, so the collector adds it. The other sources
already include reasoning in output, and adding it again would double count:

- Cursor SDK (`usage_json`): `totalTokens` is `inputTokens` + `outputTokens` in all 47 inspected
  runs, and `reasoningTokens` never exceeds `outputTokens` in the 46 runs that carry it.
- T3 Cursor (`turn-ended`): `reasoningTokens` never exceeds `outputTokens` in all 47 inspected
  events that carry it; the event has no separate total.
- Muse: `totalTokens` is `inputTokens` + `outputTokens` in all 49 inspected events, and
  `reasoningTokens` never exceeds `outputTokens` in all 49.
- Pi: `totalTokens` is `input` + `output` + `cacheRead` + `cacheWrite` in all 5,534 inspected
  assistant records, and `reasoning` never exceeds `output` in the 5,509 that carry it.

## Cursor source choice

On this machine every `runs.usage_json` inspected was populated, so Cursor usage comes from the
Cursor SDK agent store. That is the primary Cursor source. It is chosen by an existence check that
ignores `--since`: if any store has a populated `usage_json` row, the store is the source for the
run, even when `--since` leaves no rows in the window (the run then reports no Cursor usage). T3
Code's `provider:"cursor"` lines are read only when no store has populated usage at all, so a Cursor
run is never counted from both places. When the T3 fallback is used, its rows have no model id in
the log and are labelled `unknown-cursor`.

## Muse dedupe

T3's `session/tokenUsage` events are per-call deltas: each event's `params.usage` is one model call,
while `params.cumulative` is the running total for the session (`cumulative.promptTokens` equals the
sum of the earlier `usage.inputTokens`). The collector counts each event's `usage` once and never
differences `cumulative`. One turn can contain several calls, so `turnId` is not an event id; an
event is identified by `providerSessionId` plus `sourceRange.first.id`, `sourceRange.last.id` and
`stream`, and a replayed line counts once. In the inspected logs 49 events covered 9 turns, all 49
source ranges were distinct, and no identical event repeated.

## Usage output

```json
{"contributor":"trajectonomics","machine":"m-0123abcd","plan":"claude","model":"claude-opus-5-5","hourUtc":"2026-11-24T16:00:00.000Z","granularity":"hour","tokensIn":10,"tokensOut":20,"cacheRead":30,"cacheWrite":40,"tokensTotal":100,"requests":1,"source":"claude-code","bestEffort":false}
```

`tokensIn` is uncached input; `cacheRead`/`cacheWrite` are separate. `tokensTotal` is the source's
reported total where one exists, otherwise the sum of the parts. When two tools share one plan,
model and hour (Pi and OpenCode both use OpenCode Go), their rows are summed and `source` joins
both labels with `+`. Mistral rows are `granularity: "day"`, keep only `billing_metric`, `value`
and `nb_api_calls`, and drop every id column. `bestEffort` is true only for Muse.

## Quota samples

`quota` reads local credentials or CLI allowance output and never prints or stores tokens.
Antigravity is the only plan whose credential the collector refreshes: it exchanges the ACP's own
refresh token (`acp_token.json`, Google's token endpoint only) for an access token in memory, and
runs Antigravity's own `agy models`, which rewrites the token file its CLI keeps:

| Plan | Source | Endpoint / Command | Windows |
| --- | --- | --- | --- |
| `claude` | `~/.claude/.credentials.json`, `claudeAiOauth.accessToken` | `https://api.anthropic.com/api/oauth/usage` | `five_hour`, `weekly` |
| `opencode-go` | `~/.local/share/opencode/auth.json`, `["opencode-go"].key` | `https://opencode.ai/inference/go/v1/usage` | `five_hour`, `weekly`, `monthly` |
| `antigravity` | `~/.gemini/antigravity/antigravity-oauth-token`, `~/.gemini/antigravity-cli/antigravity-oauth-token` or `~/.t3/userdata/providers/antigravity/*/antigravity-acp/antigravity-oauth-token` (`token.access_token`), else the ACP's `acp_token.json` refresh token | `https://daily-cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary` | `five_hour`, `weekly` (Gemini buckets) |
| `cursor` | `~/.config/cursor/auth.json`, `accessToken` | `https://api2.cursor.sh/aiserver.v1.DashboardService/GetCurrentPeriodUsage` | `monthly` |
| `meta` | `muse` CLI (`~/.local/bin/muse` or `PATH`, with `MUSE_NO_AUTO_UPDATE=1`) | `muse usage --json` | `five_hour`, `weekly` |

Antigravity's token candidates come from all three roots, and the file with the latest `token.expiry`
wins, falling back to its mtime when the expiry is missing or unparseable. When no candidate is
usable, the collector reads each `acp_token.json` (under `~/.gemini/antigravity-acp` and in T3
Code's provider folders, newest first) and exchanges its refresh token with Google for an access
token held in memory only: it never stores or prints it, never writes a file, and the refresh token
does not rotate. If that yields no token, the collector runs `agy models` once, which lets
Antigravity's own CLI refresh the token it keeps, then it reads the file again; it never writes a
token file itself.

A missing file or binary, an expired token, a failed request or an unexpected body logs one stderr line
naming the plan, while a successful sample logs `quota: <plan> sampled <n> rows`. The run still exits 0
and simply emits no row for that plan. File-backed tokens other than Antigravity's are never refreshed
by the collector, because refreshing would rotate each tool's own credential. When `muse usage --json`
reports that nothing has been used yet in the current window (`allowance: null`, `reason:
"server_sent_no_usage"`), the line is `quota: meta no reading (no usage yet in this window)`, not an
unexpected-output error.

Each line is a quota row with a marker:

```json
{"kind":"quota","contributor":"trajectonomics","plan":"claude","window":"five_hour","sampledAt":"2026-11-27T14:00:00.000Z","usedPct":23,"resetsAt":"2026-11-27T14:20:00.160Z"}
```

Usage lines stay plain. The sender tells the two apart by the `window` field: a row with a string
`window` is quota, and the sender removes `kind` before posting. Do not add `kind` to usage rows.

`sampledAt` is always the **start of the current UTC hour**, because the Worker rejects anything
else. The timer fires at minute 1, so a sample taken at 14:01 is stamped `14:00:00.000Z` and covers
the usage of the hours before it, with up to one minute of the new hour folded in. Read it as the
state at approximately `sampledAt`, not as a bucket total.

`usedPct` is the percentage of the plan's limit, reported by both providers in whole numbers. One
point is 1% of the limit, so a limit estimate needs a large change in percent before it is useful:
`limit ≈ Δtokens / (ΔusedPct / 100)`. A one-point change over a quiet hour estimates almost nothing.

## Sign in

`login` runs the device flow against auth.trajectonomics.com and stores a refresh token; the send
commands then use a 15-minute access token. Sending requires this sign-in.

```sh
bun apps/data/collector/src/cli.ts login
bun apps/data/collector/src/cli.ts whoami
bun apps/data/collector/src/cli.ts logout
```

`login` prints a URL and a code, waits for approval, and writes
`~/.config/traj-data/credentials.json` (mode 600 in a mode-700 directory, written atomically). A
transient auth or network failure during polling only waits longer; a declined or expired code
fails. `whoami` prints the account id, the issuer and `Sign in again within at most N day(s)`,
without any network call. `logout` revokes this machine's refresh token when auth is reachable and
deletes the file either way, even a malformed one.

Auth allows at most 30 days without use and 90 days from the consent's original approval. Running
`login` again over an existing credentials file keeps that original date, so it does not renew
the 90 days. To renew early:

1. Run `logout` on every machine that runs the collector. It revokes that machine's refresh token
   and deletes its file; the consent and its date stay on auth.
2. Revoke the collector on the account page at `<issuer>/account/` (by default
   https://auth.trajectonomics.com/account/). This ends the consent for every machine at once.
3. Run `login` on each machine. With no file left, the new consent starts a new 90-day clock and
   `whoami` counts from it.

`TRAJ_AUTH_URL` and `login --issuer <url>` must use https. A loopback host (`localhost`,
`127.0.0.1`, `[::1]`) may use http for local development; every other value is refused before any
request.

The file holds a refresh token. Never commit it, and never print it.

## Sending

`send` reads JSON lines from the files given, or from stdin when none are given, and posts batches
of at most 5,000 rows and 1 MB of JSON body to the Worker:

```sh
bun apps/data/collector/src/cli.ts send rows.jsonl
some-command | bun apps/data/collector/src/cli.ts send
TRAJ_DATA_ALLOW_TOKEN_URL=1 bun apps/data/collector/src/cli.ts send \
  --url http://127.0.0.1:8787/data/ingest rows.jsonl
```

The URL defaults to `https://trajectonomics.com/data/ingest`; `TRAJ_DATA_URL` overrides it when
`--url` is absent. Sending requires a signed-in machine: the sender reads
`~/.config/traj-data/credentials.json` and refuses to run when it is absent, telling you to run
`login`. A lapsed sign-in fails that runner's hourly unit (exit 1, "sign-in expired" in its
journal), and running `login` again fixes it. The "no ingest for 3 hours" health warning fires only
when every runner has stopped, so check each runner's journal, or its last send on `/data/me/`.
A local `wrangler dev` also needs `ORG_AUTH_USER_ID` in its variables (`.dev.vars`), or ingest
answers `403 not_a_contributor`.

A sign-in token goes only to `https://trajectonomics.com` or `https://data.trajectonomics.com`.
For any other URL the sender fails before refreshing: set `TRAJ_DATA_ALLOW_TOKEN_URL=1` when the
target really is an auth-backed Worker, for example a local `wrangler dev`. The sender never prints
the token.

There are no retries. The Worker upserts rows, so the next hourly run resends the same hours and
converges. A non-2xx response prints its HTTP status and the error codes in its body (never the
request) and exits non-zero.

## Hourly runner

`hourly` reads a hosts file (default `~/.config/traj-data/hosts.json`) and collects every machine,
then sends all rows in one call. The file is validated before anything runs:

```json
{
  "hosts": [
    {
      "name": "example-local",
      "ssh": null,
      "bun": "/home/example/.cache/traj-collector/bun",
      "collectorDir": "/home/example/.cache/traj-collector",
      "quota": true,
      "skipOpenCodeBefore": null
    },
    {
      "name": "example-remote",
      "ssh": "example-remote",
      "bun": "/home/example/.cache/traj-collector/bun",
      "collectorDir": "/home/example/.cache/traj-collector",
      "quota": true,
      "skipOpenCodeBefore": "2026-10-23T14:00:00.000Z"
    }
  ]
}
```

`ssh: null` runs on the runner host. Any other value runs
`ssh -o BatchMode=yes -o ConnectTimeout=10 <ssh> <bun> <collectorDir>/src/cli.ts ...` with an argument
array, never a shell string. Paths must be absolute: `~` is not expanded. Host names are labels used
in the cursor filename, so they are lowercase and unique.

For each host the runner executes `usage --since <cursor minus 6 hours>`, adding
`--skip-opencode-before` when configured, and then `quota` when `quota` is true. The machine label
is left at the collector's default, so each machine keeps its own hash alias. A host with no cursor
begins at the start of the current UTC hour. A first run sends nothing from before the current hour;
the site shows only what was collected live (ADR 0010). The 6-hour overlap lets late rows and clock
skew arrive, and the upsert makes the resend harmless.

Each host's cursor is `~/.local/state/traj-data/cursor-<name>`, holding the latest `hourUtc` that
was accepted. A host that is offline, exits non-zero or prints a malformed line is logged and
skipped; its cursor does not move and the other hosts still run. After every host has been tried,
all rows are sent once. The bearer is resolved at the first send, once per run, so a long
collection does not spend its 15-minute access token before sending. A host's cursor advances only
when every row it contributed was accepted. The command exits non-zero if any host failed or any
send failed, after trying everything.

## Install on the runner host

`homeserver1` is the always-on runner. Do this on it and on every machine it reads:

1. Copy the collector to `~/.cache/traj-collector` and put a bun binary beside it, because a user
   service has a minimal `PATH`:

   ```sh
   mkdir -p ~/.cache/traj-collector
   rsync -a --exclude node_modules --exclude .turbo apps/data/collector/ ~/.cache/traj-collector/
   install -m 755 "$(command -v bun)" ~/.cache/traj-collector/bun
   ```

   The collector has no runtime dependencies outside bun and the files under `src/`.

2. The data Worker accepts auth tokens (ADR 0015). Sign the runner in once (the grant lasts at
   most 90 days):

   ```sh
   ~/.cache/traj-collector/bun ~/.cache/traj-collector/src/cli.ts login
   ```

   It writes `~/.config/traj-data/credentials.json` (mode 600). Sending requires that file; a
   lapsed sign-in fails the hourly unit with "sign-in expired" in its journal, and running `login`
   again fixes it. A host that sent with the retired key still has `~/.config/traj-data/ingest.key`;
   delete it (`rm -f ~/.config/traj-data/ingest.key`), since nothing reads it any more.

3. Write `~/.config/traj-data/hosts.json` from
   [`deploy/hosts.example.json`](deploy/hosts.example.json), with absolute paths that exist on each
   machine. Leave `ssh` null for the runner itself and give each remote its ssh host or alias.

4. Install the units and start the timer:

   ```sh
   mkdir -p ~/.config/systemd/user
   cp deploy/traj-data-hourly.service deploy/traj-data-hourly.timer ~/.config/systemd/user/
   systemctl --user daemon-reload
   systemctl --user enable --now traj-data-hourly.timer
   loginctl enable-linger "$USER"
   ```

5. Run it once by hand and read the journal:

   ```sh
   systemctl --user start traj-data-hourly.service
   journalctl --user -u traj-data-hourly.service -n 50
   ```

The timer fires at minute 1 of every hour (plus up to 60 seconds of jitter), catches up after a
missed run, and the oneshot service inherits `DO_NOT_TRACK=1`. `Persistent=true` means a laptop
that was asleep still runs once after it wakes.

## Where it runs (since 2026-11-27)

Two timers, not one, because homeserver1 cannot reach the dev machine unattended: Tailscale SSH
there asks for a browser check.

| Runner host | Collects | Quota |
|---|---|---|
| homeserver1 | itself, and homeserver2 over ssh (`skipOpenCodeBefore` `2026-10-23T14:00:00.000Z`, its `opencode.db` is a copy) | no |
| the dev machine (prameubuntu) | itself | yes: Claude Code runs there, so its OAuth token stays fresh |

Each host keeps the collector in `~/.cache/traj-collector` (`bun` is a link to `~/.local/bin/bun`,
or homeserver2's own binary), its `hosts.json` and `credentials.json` in `~/.config/traj-data/`, and
its cursors in `~/.local/state/traj-data/`. To update, copy `src/`, `deploy/` and `package.json` from
`main` over the old copy on every host. A run peaks at about 1.4 GB of memory.

## Rules

- **Never commit real logs, collector output, hostnames, prompts, paths or ids.** Fixtures in
  `test/` are hand-written and synthetic.
- `src/extract/` and `src/aggregate.ts` are pure: lines or rows in, `UsageRow[]` out, no `fs`,
  SQLite, network or clock. I/O lives in `src/cli.ts`, `src/collect.ts` and `src/stores/`. The quota
  parsers take `sampledAt` as an argument for the same reason.
- Prices live in `src/price-catalog.ts`, beside the tier catalogue. A price is added only with a
  dated, cited source: a URL, the day it was read and an exact quote. A missing price stays `null`,
  and is never inferred from a neighbouring tier or from a multiplier.
