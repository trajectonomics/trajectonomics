import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { accountList } from "../src/lib/contract"
import { DEMO_ACCOUNTS, DEMO_OPENING_DATE, DEMO_OPENINGS } from "./demo/accounts"
import { applyScenarios } from "./demo/apply"
import { nextFixedSource } from "./demo/fixed-source"
import type { DemoAccountIds } from "./demo/scenario"
import { demoCsv } from "./demo/transactions"
import { spawnCapture } from "./spawn"

/** Where the fictional ledger is built: the `traj` binary, the data directory, and a scratch directory. */
export type DemoLedgerPlace = { binary: string; home: string; scratch: string }

/**
 * Runs one `traj` write and throws its message when it fails, so a broken demo stops at its cause. It
 * sets the fixed source, so the clock and the ids repeat from one generation to the next.
 */
async function traj(place: DemoLedgerPlace, argv: string[]): Promise<string> {
	const captured = await spawnCapture([place.binary, ...argv, "--json"], {
		env: { ...process.env, TRAJ_HOME: place.home, ...nextFixedSource(place) },
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
 * of monthly transactions imported from CSV, and the Scenarios `base`, `retire-early` and `separate`,
 * with the Thai Levy on each. Every name and figure is invented.
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
	await applyScenarios(place, (argv) => traj(place, argv), ids)
	return ids
}
