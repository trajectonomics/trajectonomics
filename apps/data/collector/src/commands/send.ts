import { readFileSync } from "node:fs"
import { homedir } from "node:os"
import { errorMessage } from "../message"
import {
	DEFAULT_INGEST_URL,
	defaultKeyFile,
	type FetchLike,
	readIngestKey,
	sendText,
} from "../send"
import { fail } from "./errors"

const USAGE = "Usage: bun src/cli.ts send [--url <url>] [--key-file <path>] [files...]"

/** Parsed `send` arguments. */
export type SendArgs = { url: string; keyFile: string; files: string[] }

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

async function readInput(files: readonly string[]): Promise<string> {
	if (files.length > 0) return files.map((file) => readFileSync(file, "utf8")).join("\n")
	return Bun.stdin.text()
}

const postFetch: FetchLike = (url, init) => fetch(url, init)

/** Reads key and rows, posts them, and exits non-zero on any failure. */
export async function runSendCommand(argv: readonly string[]): Promise<void> {
	const args = parseSendArgs(argv, process.env)
	let key: string
	try {
		key = readIngestKey(args.keyFile)
	} catch (error) {
		console.error(errorMessage(error))
		process.exitCode = 1
		return
	}
	try {
		const report = await sendText(await readInput(args.files), {
			url: args.url,
			key,
			fetch: postFetch,
			log: (line) => console.error(line),
		})
		process.exitCode = report.ok ? 0 : 1
	} catch (error) {
		console.error(`send: ${errorMessage(error)}`)
		process.exitCode = 1
	}
}
