# ADR 0002 eval: can an agent answer from `traj` alone?

[ADR 0002](../../docs/adr/0002-success-criteria.md) says the CLI is validated when an agent, given only the CLI and its own `schema` output, builds a plan from a conversation and answers what-ifs correctly. This folder is the rerunnable check of that claim. Issue [#55](https://github.com/trajectonomics/trajectonomics/issues/55) queued it, and the owner's decision of 2026-11-22 sets how it runs: on the owner's existing subscriptions, with no API keys and no per-release API spend.

It is a manual eval, run once per release. It is not part of `bun run check`. Only its oracle's unit tests are: `bun test` in `apps/cli` runs them with the rest of the CLI's tests.

## Run it

```sh
cd apps/cli
bun run eval -- --agent opencode                       # all personas, latest published release
bun run eval -- --agent claude --persona nok-salaried-employee
bun run eval -- --agent antigravity --release 0.4.0    # a pinned release
bun run eval -- --agent claude --dry-run               # print what would run, run nothing
```

To split a run across processes, give each its own `--out` file, so none overwrites another's results:

```sh
for p in nok-salaried-employee ploy-freelancer-40-8 pim-krit-couple-mortgage; do
  bun run eval -- --agent claude --persona $p --out results/rows/0.7.0-claude-$p.md &
done
wait
```

Each process writes a one-persona table. Merge the rows into `results/<release>-<agent>.md` by hand (the header is the same for each).

- `--agent` is required: `claude` (Claude Code, `claude -p`), `antigravity` (the `agy` CLI, `-p`) or `opencode` (`opencode run`).
- `--persona <id>` runs one persona; repeat it for several. Ids are the file names in `personas/`.
- `--release` is `latest` by default and is resolved to a version before the run. The traj under test is `npx -y @trajectonomics/cli@<version>`.
- `--traj-command "<command>" --release <label>` tests a local build instead, for example `--traj-command "bun /path/to/apps/cli/src/index.ts" --release dev`.
- `--out <file>` writes the results table there instead of `results/<release>-<agent>.md`. A relative path is taken from the directory the command ran in. The dry run prints the file it would write.
- `--timeout-minutes` caps each agent session (default 40).

If the agent CLI is not on PATH the runner prints a `skipped:` line and exits 0. It writes nothing for that agent.

## What it costs

Only subscription quota. Each persona is one agent session per agent, so a full run is three sessions per agent. The owner's keys are never read or sent: the agents use the logins they already have, because the runner keeps `HOME`.

- **OpenCode** runs on `opencode/deepseek-v4.1-flash-free` first. At the free usage limit it reruns the persona on `opencode-go/deepseek-v4.1-flash`, which draws on the OpenCode Go subscription. The results row says which model answered.
- **Claude Code** and **Antigravity** use their own subscription quota.

Each run also downloads the release binary (about 100 MB) once per persona, because `TRAJ_HOME` is a fresh directory each time and the npm launcher caches its binary there.

## How a run works

For each persona the runner:

1. makes `~/.cache/eval-harness/runs/<timestamp>/<persona>/` with `home/` (the `TRAJ_HOME`), `bin/`, and `workspace/` (the agent's working directory);
2. writes `bin/traj`, a shim that forwards every call to the release under test and appends one line per call to `calls.jsonl`;
3. starts the agent with `PATH` set to the shim, the directory holding `node`, and the system directories, so `traj` is the only financial tool it finds;
4. gives the agent the persona's conversation and three questions, and asks it to end with one JSON block of its answers;
5. reads the final answer, scores it against the oracle, and counts the calls in `calls.jsonl`.

Before the first persona the runner reads the release's own `traj schema --json` and `traj help <command>` for every command. Invented flags are the flags a call used that its command's help does not list.

The prompt forbids reading files, searching, or looking for the repository, and forbids writing any file outside the agent's working directory. The OpenCode smoke run (`results/0.4.0-opencode.md`) predates the write rule: it wrote its scenario documents to `/tmp/opencode/`, on the shared tmpfs. Its figures were produced with the earlier prompt and persona wording, so it is kept as a record, not as a result for the current prompt. The prompt is a request, not a sandbox. The sandbox is the working directory, the PATH and the `TRAJ_HOME`. Each agent is also configured to refuse file and web tools (Claude: only the `Bash` tool is offered, and Bash may run only `traj`, see below; OpenCode: bash denied except `traj`, and `read`, `glob`, `grep`, `list`, `edit` and `webfetch` denied). Claude Code's shell is restricted by four flags together: `--tools Bash` (no file, web, ToolSearch or MCP tools), `--setting-sources project` (the user's own settings, which allow Bash, are not loaded; the workspace has no project settings), `--permission-mode dontAsk` (any call not pre-approved is denied, with no prompt) and `--allowedTools Bash(traj:*)` (the one pre-approval). Probed on Claude Code 2.1.330 with a stand-in `traj`: `echo hi > f.txt` and `cat /etc/hostname` were refused, `traj` ran. What the agent can still run is Claude Code's own built-in read-only commands (`ls`, `pwd` and `grep` inside the workspace), which cannot write and cannot read outside it. A deny rule alone cannot do this, because it cannot say "everything except `traj`", and `--allowedTools` only pre-approves. Antigravity has no per-tool allow-list in print mode, so it runs with `--dangerously-skip-permissions`. Its shell is not restricted beyond the PATH and the prompt. Read its `calls.jsonl` to see what it actually ran.

Every `traj` the runner starts (the shim, the agent's environment and the reference reads of `schema` and `help`) gets `DO_NOT_TRACK=1` and `TRAJ_TELEMETRY=off`, so an eval run is never counted as real use by the usage telemetry. `sandbox.test.ts` pins it.

Each agent still loads its own user-level configuration from `HOME` (for example a global `CLAUDE.md`). That is intentional, because the logins live there, and it is outside this eval's control.

## The personas

`personas/*.json` holds three fictional people. Nothing in them is a real person's money.

| Persona | Situation | The tax questions it exercises |
| --- | --- | --- |
| `nok-salaried-employee` | Single salaried office worker | Section 40(1), social security, life and health insurance |
| `ploy-freelancer-40-8` | Single freelance designer | Section 40(8) income, standard expense deduction |
| `pim-krit-couple-mortgage` | Married, one income, two children, a home loan | Married allowances, children (one born 2018 or later), mortgage interest |

Each file has the `conversation` the agent is given, and the structured `accounts`, `flows`, `cashflow`, `tax` and `whatIf` the oracle computes from. The persona test checks that every amount in the structured facts appears in the conversation, so the agent is given the same numbers the oracle uses.

Each conversation also states the facts the oracle assumes that a bare amount does not carry:

- which amounts grow with inflation: salary, living costs and business costs;
- which stay fixed in baht: each monthly fund contribution and the home-loan payment;
- that insurance and social security payments are already inside the stated living costs, so the oracle has no separate flow for them;
- that nothing from 2025 carries into the plan, which matches the empty Levy carry-in.

`oracle.test.ts` checks that the oracle reads these facts as the conversation states them.

Every persona asks three things:

1. **When can I stop working?** The first month the survival definition ([ADR 0008](../../docs/adr/0008-fi-survival-method.md)) reaches FI.
2. **What is my 2026 income tax, in baht?** The net tax payable for tax year 2026.
3. **What if one cost changes?** The same FI question after one stated change.

The agent's final answer must end with one fenced block:

```json
{"fiDate": "YYYY-MM-DD or null", "tax2026Baht": 0, "whatIfFiDate": "YYYY-MM-DD or null"}
```

## The oracle

The oracle computes the expected answers from the persona's facts, by calling `@trajectonomics/core` directly. No agent is involved, and it is deterministic.

- Tax: `calculateThTax` from `@trajectonomics/core/tax/th`, for the persona's income and allowances.
- FI: `financialIndependence` from `@trajectonomics/core/sim` with the survival method. The Scenario carries the Thai Levy from `emitThLevy`, so tax is charged the way the engine charges it, and the Levy's 2025 period has the empty carry-in the CLI writes for this build's Levy (ADR 0032).

`oracle.test.ts` checks the oracle three ways:

- The three 2026 tax figures (32,450, 22,600 and 20,800 baht) were checked by hand against the brackets and deductions. The freelancer's figure uses the core's 60% section 40(8) standard deduction, which the test states.
- FI is reached inside each horizon, and a lower-cost what-if never gives a later FI month.
- The oracle is deterministic.

The oracle encodes the core's rules. It is not an independent check of the statute. A wrong core rule would be wrong in the oracle too, and that is what the tax core's own tests and its Revenue Department references are for.

## Tolerances

- **FI month:** within one calendar month of the oracle. A `null` answer must match a `null` oracle.
- **2026 tax:** within 1 baht.

These are constants in `oracle.ts` (`TOLERANCE`). Changing them changes what counts as correct, so do it in a commit that says so.

## Reading a result

`results/<release>-<agent>.md` is one table per run. It is overwritten by each run of that release and agent, so a run of one persona replaces a run of three, unless `--out` names another file. Its columns:

- **Correct (of 3):** the number of the three questions answered within tolerance. This is the headline.
- **FI month, given / oracle:** what the agent said, then the oracle. Each question's `yes`/`no` is in brackets.
- **2026 tax:** the same, in baht.
- **traj calls:** every `traj` invocation the shim logged. More is not always worse: a careful agent reads `help` more. Read it with the errors.
- **Errors:** calls that exited non-zero, from the shim's log.
- **Invented flags:** flags a call used that the command's `traj help` does not list. A non-zero count means the agent guessed at the interface, which is what ADR 0002's schema-only test is meant to catch.
- **Model:** the model that answered: the OpenCode model the runner chose, or the one Claude Code reports in its first `system` `init` event. `n/a` for Antigravity, whose text output names none.
- **Status:** `ok`, or why no answer was read (`no answer block`, `agent exited N`, `timed out`).

The raw files are in the run's directory under `~/.cache/eval-harness/runs/`: `transcript.txt` (the agent's stdout), `stderr.txt`, `calls.jsonl` (every `traj` call with its exit code), and `home/` (the ledger it built, which is useful when an answer is wrong).

## Status of the agent adapters

- **OpenCode** was run live once: the free model on `nok-salaried-employee`, release 0.4.0. The result is `results/0.4.0-opencode.md`, produced with the persona wording from before the review fixes: 1 of 3 correct. The 2026 tax matched the oracle exactly (32,450 baht). FI came out at 2043-03 against the oracle's 2043-08, and the what-if at 2040-02 against 2040-05. The agent applied the tax Levy (four `scenario tax` calls). The gap came from the persona, not the engine: the earlier wording did not say the 15,000 baht contribution stays fixed, and the agent grew it with inflation. Growing that one contribution gives 2043-03 and 2040-02, the smoke run's figures. The current persona states that the contribution is fixed, so the oracle's 2043-08 and 2040-05 are the expected answers. No run of the current persona is committed yet.
- **Claude Code** was run live on release 0.7.0 with Claude Code 2.1.330, which ran `claude-opus-5-5`: 3 of 3 correct on all three personas (`results/0.7.0-claude.md`). That run used only `--allowedTools Bash(traj:*)`, which pre-approves `traj` but did not stop the agents from running other shell commands, because their own user settings allow Bash: they ran `ls`, `cd` and `cat > base.json <<EOF` inside their workspaces, and one tried `ToolSearch` for `Read` and `Write`. Nothing was written outside the workspace. The runner now restricts the shell as described above ([#281](https://github.com/trajectonomics/trajectonomics/issues/281)), and reads the model from the stream's `init` event. The committed 0.7.0 results file predates both: its Model column was filled in by hand. The first run with the restricted shell is `results/main-0f63b73-claude.md` (the CLI built from main after the help and schema fixes): 3 of 3 correct on all three personas again, with 83 `traj` calls and 5 errors, against 101 and 15 for 0.7.0. The restricted shell refuses `cat > file <<EOF` and a heredoc after `traj`, so the agents applied their Scenario documents with `echo '<json>' | traj scenario apply <name> --file -` or `printf`, which the allow-list admits.
- **Antigravity** flags were taken from `agy --help` on agy 1.5.13. They have not been run live by the author, and its JSON output is not parsed: the runner reads its text output as the answer. The runner passes `--model gemini-4-hydrogen-medium`. `agy models` lists the Hydrogen family only with an effort suffix (`-low`, `-medium`, `-high`, `-xhigh`), and has no bare `gemini-4-hydrogen`, so the medium-effort model is the one named (root AGENTS.md rule 7). Change `ANTIGRAVITY_MODEL` in `agents.ts` to run another effort level.

Run `--dry-run` to see the exact argv for each.
