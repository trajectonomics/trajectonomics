import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { accountList } from "../src/lib/contract"
import { DEMO_ACCOUNTS, DEMO_OPENING_DATE, DEMO_OPENINGS } from "./demo/accounts"
import {
	baseScenarioDocument,
	DEMO_TAX,
	type DemoAccountIds,
	RETIRE_EARLY_SALARY_END,
} from "./demo/scenario"
import { demoCsv } from "./demo/transactions"
import { spawnCapture } from "./spawn"

/** Where the fictional ledger is built: the `traj` binary, the data directory, and a scratch directory. */
export type DemoLedgerPlace = { binary: string; home: string; scratch: string }

/** Runs one `traj` write and throws its message when it fails, so a broken demo stops at its cause. */
async function traj(place: DemoLedgerPlace, argv: string[]): Promise<string> {
	const captured = await spawnCapture([place.binary, ...argv, "--json"], {
		env: { ...process.env, TRAJ_HOME: place.home },
	})
	if (captured.code !== 0) {
		throw new Error(`traj ${argv.join(" ")} failed: ${captured.stderr.trim()}`)
	}
	return captured.stdout
}

/** The ids of the accounts the demo Scenario names, read back from the ledger. */
async function idsOf(place: DemoLedgerPlace): Promise<DemoAccountIds> {
	const parsed = accountList.parse(JSON.parse(await traj(place, ["account", "list"])))
	const idOf = (name: string): string => {
		const found = parsed.accounts.find((account) => account.name === name)
		if (found === undefined) throw new Error(`the demo ledger has no account ${name}`)
		return found.id
	}
	return { bank: idOf("Bank"), fund: idOf("Fund"), loan: idOf("Car Loan") }
}

/**
 * Builds the fictional ledger in `place.home`: a chart of accounts, opening balances, about two years
 * of monthly transactions imported from CSV, and two Scenarios, `base` and `retire-early`, with the Thai
 * Levy on both. Every name and figure is invented.
 */
export async function buildDemoLedger(place: DemoLedgerPlace): Promise<DemoAccountIds> {
	await mkdir(place.home, { recursive: true })
	await traj(place, ["init"])
	for (const account of DEMO_ACCOUNTS) {
		await traj(place, ["account", "add", account.name, "--type", account.type, "--currency", "THB"])
	}
	for (const opening of DEMO_OPENINGS) {
		await traj(place, [
			"tx",
			"add",
			"--opening",
			"--from",
			"Opening",
			"--to",
			opening.to,
			"--amount",
			opening.amount,
			"--date",
			DEMO_OPENING_DATE,
			"--external-ref",
			opening.ref,
		])
	}
	const csv = join(place.scratch, "demo-transactions.csv")
	await writeFile(csv, demoCsv())
	await traj(place, ["tx", "import", csv])
	const ids = await idsOf(place)
	await applyScenarios(place, ids)
	return ids
}

/** Applies `base`, adds the Thai Levy to it, then forks `retire-early` from it with one changed flow. */
async function applyScenarios(place: DemoLedgerPlace, ids: DemoAccountIds): Promise<void> {
	const file = join(place.scratch, "base.json")
	const document = baseScenarioDocument(ids)
	await writeFile(file, JSON.stringify(document, null, "\t"))
	await traj(place, ["scenario", "apply", "base", "--file", file])
	await traj(place, ["scenario", "tax", "base", "--tax", DEMO_TAX.tax, "--label", DEMO_TAX.label])
	await traj(place, [
		"scenario",
		"fork",
		"base",
		"retire-early",
		"--set",
		`flows.salary.end="${RETIRE_EARLY_SALARY_END}"`,
	])
}
