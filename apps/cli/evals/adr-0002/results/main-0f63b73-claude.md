# ADR 0002 eval: main (0f63b73) on claude

Run 2026-11-22 from 20:54 to 20:57 UTC, one `bun run eval -- --agent claude --persona <id> --out <file>` process per persona, started in parallel. The traj under test is the CLI built from source at main commit `0f63b73` (after #267 and #293): `--traj-command "bun apps/cli/src/index.ts" --release main-0f63b73`. Raw run files, one directory per process (the persona's files are in its subfolder): `~/.cache/eval-harness/runs/2026-11-22T20-54-15-365Z` (nok-salaried-employee), `~/.cache/eval-harness/runs/2026-11-22T20-54-15-459Z` (pim-krit-couple-mortgage), `~/.cache/eval-harness/runs/2026-11-22T20-54-15-364Z` (ploy-freelancer-40-8).

Claude Code ran `claude-opus-5-5`, the model the stream's `init` event names. Usage telemetry was off for every `traj` the run started (`DO_NOT_TRACK=1`, `TRAJ_TELEMETRY=off`). The agent's shell was restricted to `traj` (`--tools Bash --setting-sources project --permission-mode dontAsk --allowedTools Bash(traj:*)`), so `cat > file <<EOF` was refused. The 0.7.0 run did not have this restriction, so its call counts are not strictly comparable.

| Persona | Status | Correct (of 3) | FI month, given / oracle | 2026 tax, given / oracle (THB) | What-if FI month, given / oracle | traj calls | Errors | Invented flags | Model |
| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |
| nok-salaried-employee | ok | 3 | 2043-08-01 / 2043-08 (yes) | 32450 / 32450 (yes) | 2040-05-01 / 2040-05 (yes) | 26 | 1 | 0 | claude-opus-5-5 |
| pim-krit-couple-mortgage | ok | 3 | 2046-12-01 / 2046-12 (yes) | 22600 / 22600 (yes) | 2043-12-01 / 2043-12 (yes) | 25 | 0 | 0 | claude-opus-5-5 |
| ploy-freelancer-40-8 | ok | 3 | 2043-10-01 / 2043-10 (yes) | 20800 / 20800 (yes) | 2042-12-01 / 2042-12 (yes) | 32 | 4 | 0 | claude-opus-5-5 |

How to read it:
- **Correct** counts the three questions answered within tolerance: FI month within one month of the oracle, 2026 tax within 1 baht. A `null` FI month must match a `null` oracle month.
- **traj calls** counts every `traj` invocation the agent made, logged by the shim on PATH. **Errors** counts those that exited non-zero. A Bash call the restricted shell refused never reached `traj`, so it counts in neither column (nok 4, pim 5 and ploy 3 such refusals).
- **Invented flags** counts flags a call used that the command's `traj help` does not list.
- The oracle is the tax core and the sim core called directly, with no agent involved. See the eval README for what each figure means.
