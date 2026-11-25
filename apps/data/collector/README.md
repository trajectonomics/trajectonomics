# @trajectonomics/data-collector

Reads the local logs of the AI coding tools on this machine and prints **hourly usage totals** as
one JSON object per line. It does no network I/O, holds no server, and knows no prices. This is
slice 1 of the `apps/data` app (issue #592); sending the rows is a separate step.

## Run

```sh
bun apps/data/collector/src/cli.ts --since 2026-11-24T00:00:00Z
bun apps/data/collector/src/cli.ts --since 2026-11-24T00:00:00Z --mistral-csv ~/Downloads/mistral-usage.csv
```

`--machine` defaults to `os.hostname()`. Rows are sorted by UTC bucket, plan, model and source.
The `--mistral-csv` import is the only input outside `$HOME` and is opt-in.

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
(the occurrence with the largest `output_tokens`). Claude `<synthetic>` models are skipped.
OpenCode has two schemas in the wild (`message` and the newer `session_message`); both are read when
present and a message id seen in both counts once. Reasoning tokens are part of `tokensOut`.
Antigravity's `transcript_full.jsonl` duplicates the same steps and is skipped; a step with no model
borrows its conversation's only model, else it is `unknown-gemini`. T3's `claudeAgent` lines are
ignored because Claude Code's own logs are the Claude source.

## Cursor source choice

On this machine every `runs.usage_json` inspected was populated, so Cursor usage comes from the
Cursor SDK agent store. That is the primary Cursor source. The collector reads T3 Code's
`provider:"cursor"` lines only when the Cursor store yields no populated usage rows at all, so a
Cursor run is never counted from both places. When the T3 fallback is used, its rows have no model
id in the log and are labelled `unknown-cursor`.

## Output

```json
{"contributor":"trajectonomics","machine":"host","plan":"claude","model":"claude-opus-5-5","hourUtc":"2026-11-24T16:00:00.000Z","granularity":"hour","tokensIn":10,"tokensOut":20,"cacheRead":30,"cacheWrite":40,"tokensTotal":100,"requests":1,"source":"claude-code","bestEffort":false}
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
