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
