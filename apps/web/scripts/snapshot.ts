#!/usr/bin/env bun
// The Snapshot command: runs the Plan against `traj` and writes one Snapshot, to --out or to stdout.
import { checkParams, type PlanParams } from "../src/lib/snapshot"
import { readCarryInFile } from "./carry-in-file"
import { parseSnapshotArgs } from "./snapshot-args"
import { runSnapshot } from "./snapshot-run"
import { checkBinary } from "./traj-binary"

const USAGE = `Usage: bun scripts/snapshot.ts --as-of DATE --horizon DATE [options]

  --scenario NAME       a Scenario to project; repeat for several; none means every Scenario
  --compare A B         compare two Scenarios by name
  --birth-date DATE     the birth date the ages count from
  --age N               an age to report in a compare; repeat for several
  --monthly             also read the monthly rows of each projection
  --carry-in PATH       a JSON array of Carry-in records for every Scenario named
  --return-model PATH   the Return model JSON file the chance of success draws from
  --paths N             the Market paths to run for the chance; needs --return-model and --seed
  --seed HEX            sixteen lower-case hex digits the Market paths are drawn from
  --traj PATH           the traj binary (else TRAJ_BINARY_PATH, else traj on PATH)
  --out FILE            write the Snapshot to FILE (else print it)
`

/** What the command needs before it runs: the parameters, the binary, the version and the Carry-in. */
type Prepared =
	| {
			ok: true
			params: PlanParams
			binary: string
			version: string
			records: unknown[]
			out: string | null
	  }
	| { ok: false; message: string }

/** Reads the command line, the binary and the Carry-in file, and checks the parameters. */
async function prepare(
	argv: readonly string[],
	env: Record<string, string | undefined>,
): Promise<Prepared> {
	const args = parseSnapshotArgs(argv)
	if (!args.ok) return { ok: false, message: args.message }
	// The offline Snapshot opens its five representative futures with no server, so it reads them in advance (web ADR 0020).
	const params = checkParams({ ...args.options.input, readPaths: true })
	if (!params.ok) return { ok: false, message: params.error.message }
	const binary = await checkBinary(args.options.traj, env)
	if (!binary.ok) return { ok: false, message: binary.message }
	const records =
		args.options.carryIn === null
			? { ok: true as const, records: [] }
			: await readCarryInFile(args.options.carryIn)
	if (!records.ok) return { ok: false, message: records.message }
	return {
		ok: true,
		params: params.params,
		binary: binary.binary,
		version: binary.version,
		records: records.records,
		out: args.options.out,
	}
}

/** Runs the snapshot command. Returns the process exit code. */
export async function main(
	argv: readonly string[],
	env: Record<string, string | undefined>,
): Promise<number> {
	if (argv.includes("--help") || argv.includes("-h")) {
		process.stdout.write(USAGE)
		return 0
	}
	const prepared = await prepare(argv, env)
	if (!prepared.ok) return fail(prepared.message)
	const run = await runSnapshot(
		{ binary: prepared.binary, env },
		prepared.version,
		prepared.params,
		prepared.records,
	)
	if (!run.ok) return fail(`${run.error.message}${run.error.hint ? `\n${run.error.hint}` : ""}`)
	const text = `${JSON.stringify(run.snapshot, null, "\t")}\n`
	if (prepared.out === null) process.stdout.write(text)
	else await Bun.write(prepared.out, text)
	return 0
}

function fail(message: string): number {
	process.stderr.write(`${message}\n`)
	return 1
}

if (import.meta.main) {
	process.exit(await main(process.argv.slice(2), process.env))
}
