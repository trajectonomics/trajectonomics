import { homedir } from "node:os"
import { DEFAULT_INGEST_URL, defaultKeyFile } from "../send"
import { fail } from "./errors"

const USAGE = "Usage: bun src/cli.ts send [--url <url>] [--key-file <path>] [files...]"

/** Parsed `send` arguments; `keyFileExplicit` is true only when `--key-file` was given. */
export type SendArgs = { url: string; keyFile: string; keyFileExplicit: boolean; files: string[] }

type Flag = "url" | "keyFile"

const FLAGS: Record<string, Flag> = { "--url": "url", "--key-file": "keyFile" }

function valueAfter(argv: readonly string[], index: number, flag: string): string {
	const value = argv[index + 1]
	if (value === undefined) fail(`${flag} needs a value`, USAGE)
	return value
}

function applyFlag(args: SendArgs, argv: readonly string[], index: number): number {
	const arg = argv[index] ?? ""
	const key = FLAGS[arg]
	if (key === undefined) return index
	args[key] = valueAfter(argv, index, arg)
	if (key === "keyFile") args.keyFileExplicit = true
	return index + 1
}

/** Parses send arguments; `TRAJ_DATA_URL` supplies the URL when `--url` is absent. */
export function parseSendArgs(
	argv: readonly string[],
	env: Record<string, string | undefined>,
): SendArgs {
	const args: SendArgs = {
		url: env["TRAJ_DATA_URL"] ?? DEFAULT_INGEST_URL,
		keyFile: defaultKeyFile(homedir()),
		keyFileExplicit: false,
		files: [],
	}
	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i] ?? ""
		if (arg === "--help" || arg === "-h") {
			console.log(USAGE)
			process.exit(0)
		}
		const next = applyFlag(args, argv, i)
		if (next !== i) {
			i = next
			continue
		}
		if (arg.startsWith("-")) fail(`Unknown argument: ${arg}`, USAGE)
		args.files.push(arg)
	}
	return args
}
