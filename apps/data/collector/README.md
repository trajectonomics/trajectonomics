# @trajectonomics/data-collector

Reads the local logs of the AI coding tools on this machine and prints **hourly usage totals** as
one JSON object per line. It does no network I/O, holds no server, and knows no prices. This is
slice 1 of the `apps/data` app (issue #592); sending the rows is a separate step.

## Run

```sh
bun apps/data/collector/src/cli.ts --since 2026-11-24T00:00:00Z
bun apps/data/collector/src/cli.ts --since 2026-11-24T00:00:00Z --mistral-csv ~/Downloads/mistral-usage.csv
```

`--machine` defaults to `m-` plus the first 8 hex chars of SHA-256(`os.hostname()`), so raw
hostnames never appear in the output; pass `--machine` to override the label. Rows are sorted by
UTC bucket, plan, model and source. The `--mistral-csv` import is the only input outside `$HOME`
and is opt-in.

## What it reads

| Source | Path | Plan |
| --- | --- | --- |
| Claude Code | `~/.claude/projects/**/*.jsonl` | `claude` |
| OpenCode | `~/.local/share/opencode/opencode.db` (read-only) | `opencode-go`, `opencode-free` |
| Pi | `~/.pi/**/*.jsonl` | matched from the provider id |
| Antigravity | `~/.gemini/**/transcript.jsonl` | `antigravity` |
| Cursor | `~/.cursor/projects/*/sdk-agent-store/*/index.db` (read-only) | `cursor` |
| T3 Code (Muse) | `~/.t3/userdata/logs/provider/*.log` | `meta` |
| Mistral console CSV | `--mistral-csv <path>` | `mistral` |

Claude streaming repeats one request's usage several times, so one row is kept per `requestId`
(the occurrence with the largest `output_tokens`; a tie keeps one). Claude `<synthetic>` models are
skipped. OpenCode has two schemas in the wild (`message` and the newer `session_message`); both are
read when present, only assistant rows are selected in SQL, and a message id seen in both counts
once. With `--since`, Claude, Pi and Antigravity files whose mtime is older than the cutoff are not
opened. Antigravity's `transcript_full.jsonl` duplicates the same steps and is skipped; a step with
no model borrows its conversation's only model, else it is `unknown-gemini`. T3's `claudeAgent`
lines are ignored because Claude Code's own logs are the Claude source.

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

## Output

```json
{"contributor":"trajectonomics","machine":"m-0123abcd","plan":"claude","model":"claude-opus-5-5","hourUtc":"2026-11-24T16:00:00.000Z","granularity":"hour","tokensIn":10,"tokensOut":20,"cacheRead":30,"cacheWrite":40,"tokensTotal":100,"requests":1,"source":"claude-code","bestEffort":false}
```

`tokensIn` is uncached input; `cacheRead`/`cacheWrite` are separate. `tokensTotal` is the source's
reported total where one exists, otherwise the sum of the parts. When two tools share one plan,
model and hour (Pi and OpenCode both use OpenCode Go), their rows are summed and `source` joins
both labels with `+`. Mistral rows are `granularity: "day"`, keep only `billing_metric`, `value`
and `nb_api_calls`, and drop every id column. `bestEffort` is true only for Muse.

## Rules

- **Never commit real logs, collector output, hostnames, prompts, paths or ids.** Fixtures in
  `test/` are hand-written and synthetic.
- `src/extract/` and `src/aggregate.ts` are pure: lines or rows in, `UsageRow[]` out, no `fs`,
  SQLite, network or clock. I/O lives in `src/cli.ts`, `src/collect.ts` and `src/stores/`.
- No prices in this slice. A price is added only with a dated, cited source.
