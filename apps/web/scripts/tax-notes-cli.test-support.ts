// The helpers of the tax-note guard: run the workspace's own traj, read a plan's notes the way the Snapshot
// does, and hand the page the paragraphs it would show.
import { fileURLToPath } from "node:url"
import { type Read, scenarioTax, type TaxNotes } from "../src/lib/contract"
import { decodeRead } from "../src/lib/snapshot/decode-read"
import { claimNoteLines, taxNotesFrom } from "../src/lib/view/tax-settings/notes"

/** The workspace's own traj binary, built by `turbo run build --filter=@trajectonomics/cli`. */
export const BINARY = fileURLToPath(new URL("../../cli/dist/traj", import.meta.url))

/** One captured `traj` call in a scratch ledger. */
export function spawn(home: string, argv: string[], stdin?: string) {
	return Bun.spawnSync([BINARY, ...argv], {
		env: { ...process.env, TRAJ_HOME: home, DO_NOT_TRACK: "1" },
		...(stdin === undefined ? {} : { stdin: new Blob([stdin]) }),
	})
}

/** Runs one `traj` write or read against the scratch ledger, or throws its refusal. */
export function traj(home: string, argv: string[], stdin?: string): unknown {
	const run = spawn(home, [...argv, "--json"], stdin)
	if (run.exitCode !== 0) throw new Error(`traj ${argv.join(" ")}: ${run.stderr.toString()}`)
	return JSON.parse(run.stdout.toString())
}

/** Stores a Scenario document, in the decimal form the tests write, under its name. */
export function store(home: string, name: string, document: unknown): void {
	traj(home, ["scenario", "apply", name, "--file", "-", "--decimal"], JSON.stringify(document))
}

/** The household the plans share: each salary is its Owner's, and the loan is both people's. */
export function household(loan: string, partner = "partner"): unknown {
	return {
		schemaVersion: 2,
		people: [
			{ id: "me", role: "holder", born: "1990-01", lifeExpectancy: 90 },
			{ id: partner, role: "partner", born: "1992-01", lifeExpectancy: 90 },
		],
		anchors: [],
		owners: [
			{ path: "flows.salary", person: "me" },
			{ path: "flows.partner-salary", person: partner },
			{ path: `accounts.${loan}`, person: "shared" },
		],
	}
}

/** An earned monthly income Flow with no growth. */
function salaryFlow(id: string, amount: string): unknown {
	return {
		id,
		kind: "income",
		earned: true,
		amount,
		frequency: "monthly",
		start: "2026-01-01",
		growth: { bps: 0 },
	}
}

/** The couple's document: two salaries in the Bank, and one loan both people own. */
export function coupleDocument(bank: string, loan: string): unknown {
	return {
		schemaVersion: 4,
		currency: "THB",
		economy: { inflation: 0 },
		accounts: [
			{ id: bank, kind: "asset", rate: 0 },
			{ id: loan, kind: "liability", rate: 0 },
		],
		flows: [salaryFlow("salary", "100000.00"), salaryFlow("partner-salary", "60000.00")],
		cashflow: { surplus: [{ account: bank }], contribute: [], withdraw: [bank] },
	}
}

/** The separate-filing flags, and both salaries' income labels. */
const SEPARATE = ["--tax", "th-2026", "--filing-status", "married_separate"]
const LABELS = [
	"--label",
	"salary=income.section40_1",
	"--label",
	"partner-salary=income.section40_1",
]

/** `traj scenario tax <name> --tax th-2026 --filing-status married_separate`, both salaries labelled. */
export function taxSeparately(home: string, name: string, extra: readonly string[] = []): void {
	traj(home, ["scenario", "tax", name, ...SEPARATE, ...extra, ...LABELS])
}

/** The plan's notes, read from a real dry run exactly as the Snapshot reads them. */
export function readNotes(home: string, name: string): Read<TaxNotes> {
	const argv = ["scenario", "tax", "--from-stored", "--dry-run", "--json", "--", name]
	const run = spawn(home, argv)
	const captured = {
		code: run.exitCode,
		stdout: run.stdout.toString(),
		stderr: run.stderr.toString(),
	}
	return taxNotesFrom(decodeRead(argv, captured, scenarioTax))
}

/** The paragraphs the page would show for the plan, or none when the CLI refused. */
export function linesOf(home: string, name: string): readonly string[] {
	return claimNoteLines(readNotes(home, name))
}
