// Spawned by concurrency.test.ts as a separate `bun` process: argv is <home> <writer> <count> [busy timeout ms]
// [apply <scenario> <hash> <set>]. Count 0 only opens the store, which is how concurrent first-opens
// are exercised. The apply form runs `traj scenario apply <scenario> --set <set> --if-hash <hash>`,
// so the race is the CLI's own. A refusal is printed as its envelope and sets a non-zero exit code;
// only src/index.ts calls process.exit. The busy timeout is the store's own `busyTimeoutMs` option;
// omitted, the store's default applies.
import { run } from "../cli"
import { type AppError, isAppError } from "../errors"
import { openStore, type Store } from "./index"
import { SCENARIO_DOCUMENT } from "./testing"

const [home = "", writer = "0", count = "0", busy, mode, name, hash, set] = process.argv.slice(2)

function failed(outcome: unknown): outcome is AppError {
	if (!isAppError(outcome)) return false
	console.error(JSON.stringify(outcome.body))
	process.exitCode = 1
	return true
}

function write(store: Store): void {
	const accounts = store.listAccounts({ sort: "name" })
	if (failed(accounts)) return
	const [cash, food] = accounts.map((a) => a.id)
	for (let n = 0; n < Number(count); n++) {
		// One valid Scenario per write, distinct per writer and step.
		const variant = Number(writer) * 1000 + n
		const document = { ...SCENARIO_DOCUMENT, economy: { inflation: variant } }
		if (failed(store.saveScenario({ name: "shared", document }))) {
			return
		}
		if (cash === undefined || food === undefined) continue
		const added = store.addTransaction({
			date: "2026-03-01",
			externalRef: `writer-${writer}-${n}`,
			postings: [
				{ accountId: food, amount: 100, currency: "THB" },
				{ accountId: cash, amount: -100, currency: "THB" },
			],
		})
		if (failed(added)) return
	}
}

async function applyWhatIf(): Promise<void> {
	const argv = [
		"scenario",
		"apply",
		name ?? "",
		"--set",
		set ?? "",
		"--if-hash",
		hash ?? "",
		"--json",
	]
	process.exitCode = await run(
		argv,
		{
			out: (line) => console.log(line),
			err: (line) => console.error(line),
		},
		{ TRAJ_HOME: home },
	)
}

if (mode === "apply") {
	await applyWhatIf()
} else {
	const store = openStore({
		env: { TRAJ_HOME: home },
		clock: () => new Date(),
		...(busy === undefined ? {} : { busyTimeoutMs: Number(busy) }),
	})
	if (!failed(store)) {
		write(store)
		store.close()
	}
}
