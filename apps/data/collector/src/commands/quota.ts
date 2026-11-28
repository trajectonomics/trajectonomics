import { homedir } from "node:os"
import { readTextFile } from "../quota/credentials"
import { findAntigravityTokenPath, resolveMuseBinary } from "../quota/credentials-extra"
import { type CommandResult, type CommandRunner, sampleQuota } from "../quota/sample"
import { fail } from "./errors"

const USAGE = "Usage: bun src/cli.ts quota"
const QUOTA_CMD_TIMEOUT_MS = 15_000

/** Runs a local quota CLI with a hard SIGKILL deadline and auto-update disabled. */
export async function runQuotaCommandProc(
	argv: readonly string[],
	timeoutMs = QUOTA_CMD_TIMEOUT_MS,
): Promise<CommandResult> {
	let proc: ReturnType<typeof Bun.spawn>
	try {
		proc = Bun.spawn([...argv], {
			stdin: "ignore",
			stdout: "pipe",
			stderr: "ignore",
			env: { ...process.env, MUSE_NO_AUTO_UPDATE: "1" },
		})
	} catch {
		return null
	}
	let timer: ReturnType<typeof setTimeout> | undefined
	const timedOut = new Promise<CommandResult>((resolve) => {
		timer = setTimeout(() => {
			try {
				proc.kill("SIGKILL")
			} catch {
				// Process already exited.
			}
			resolve({ exitCode: 124, stdout: "" })
		}, timeoutMs)
	})
	const completed = Promise.all([
		new Response(proc.stdout as ReadableStream).text(),
		proc.exited,
	]).then(([stdout, exitCode]) => ({ exitCode, stdout }))
	try {
		return await Promise.race([completed, timedOut])
	} finally {
		if (timer !== undefined) clearTimeout(timer)
	}
}

const defaultRunner: CommandRunner = (argv) => runQuotaCommandProc(argv)

/** Samples all supported plans and prints quota rows as JSON lines. */
export async function runQuotaCommand(argv: readonly string[]): Promise<void> {
	for (const arg of argv) {
		if (arg === "--help" || arg === "-h") {
			console.log(USAGE)
			return
		}
		fail(`Unknown argument: ${arg}`, USAGE)
	}
	const rows = await sampleQuota({
		home: homedir(),
		nowMs: Date.now(),
		fetch,
		readText: readTextFile,
		log: (line) => console.error(line),
		antigravityTokenPath: findAntigravityTokenPath,
		museBinary: resolveMuseBinary,
		runCommand: defaultRunner,
	})
	for (const row of rows) console.log(JSON.stringify({ kind: "quota", ...row }))
}
