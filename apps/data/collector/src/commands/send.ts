import { readFileSync } from "node:fs"
import { homedir } from "node:os"
import { credentialsPath } from "../auth/credentials"
import type { AuthFetch } from "../auth/http"
import { errorMessage } from "../message"
import { type FetchLike, type SendConfig, type SendReport, sendText } from "../send"
import { type BearerDeps, realBearerDeps, resolveBearer } from "../send/bearer"
import { tokenAllowedFor } from "../send/token-url"
import { parseSendArgs } from "./send-args"

/** The I/O one send run touches, injected so tests never read stdin or the owner's files. */
export type SendCommandDeps = {
	env: Record<string, string | undefined>
	home: string
	readInput: (files: readonly string[]) => Promise<string>
	bearer: BearerDeps
	fetch: FetchLike
	send: (text: string, config: SendConfig) => Promise<SendReport>
	log: (line: string) => void
	exit: (code: 0 | 1) => void
}

async function readInput(files: readonly string[]): Promise<string> {
	if (files.length > 0) return files.map((file) => readFileSync(file, "utf8")).join("\n")
	return Bun.stdin.text()
}

const postFetch: FetchLike = (url, init) => fetch(url, init)
const authFetch: AuthFetch = (url, init) => fetch(url, init)

/** Reads the rows, then (only if there are any) the credentials, posts them, and exits non-zero on any failure. */
export async function runSendCommand(
	argv: readonly string[],
	deps: SendCommandDeps = realSendCommandDeps(),
): Promise<void> {
	const args = parseSendArgs(argv, deps.env)
	let text: string
	try {
		text = await deps.readInput(args.files)
	} catch (error) {
		deps.log(`send: ${errorMessage(error)}`)
		deps.exit(1)
		return
	}
	if (text.trim().length === 0) {
		deps.log("send: nothing to send")
		deps.exit(0)
		return
	}
	try {
		const bearer = await resolveBearer(
			{
				credentialsPath: credentialsPath(deps.home),
				url: args.url,
				tokenUrlAllowed: tokenAllowedFor(args.url, deps.env),
			},
			deps.bearer,
		)
		const report = await deps.send(text, {
			url: args.url,
			bearer,
			fetch: deps.fetch,
			log: deps.log,
		})
		deps.exit(report.ok ? 0 : 1)
	} catch (error) {
		deps.log(`send: ${errorMessage(error)}`)
		deps.exit(1)
	}
}

function realSendCommandDeps(): SendCommandDeps {
	const log = (line: string): void => console.error(line)
	return {
		env: process.env,
		home: homedir(),
		readInput,
		bearer: realBearerDeps(authFetch),
		fetch: postFetch,
		send: sendText,
		log,
		exit: (code) => {
			process.exitCode = code
		},
	}
}
