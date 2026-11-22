import type { Context, Env, Group } from "./command"
import { root as defaultRoot } from "./commands"
import { type AppError, fail, isAppError } from "./errors"
import { dispatchFailure } from "./invalid"
import { type Format, renderResult, resolveFormat } from "./render"
import { route, type Stdin } from "./route"
import { badFormat, type Ended, failureOf, namedLeaf, type Seen } from "./run-outcome"
import type { RenderHint } from "./table"
import type { RunRecord } from "./telemetry/event"

export interface Io {
	out: (line: string) => void
	err: (line: string) => void
	/**
	 * Told once per invocation, on every path, what ran and how it ended. It only reports: the
	 * caller decides what to do with it, and `run()` never reads anything back.
	 */
	observe?: (record: RunRecord) => void
}

const defaultStdin: Stdin = () => Bun.stdin.text()

type Dispatched = { data: unknown; hint?: RenderHint }

async function dispatch(
	argv: string[],
	env: Env,
	root: Group,
	stdin: Stdin,
	notify: (line: string) => void,
	seen: Seen,
): Promise<Dispatched | AppError> {
	const invocation = await route(argv, root, stdin)
	if (isAppError(invocation)) return invocation
	// The leaf that actually runs, a built-in such as `help` included, is the one reported.
	seen.command = invocation.path.join(" ")
	const ctx: Context = { env, root, stdin, notify }
	const result = await invocation.leaf.run(invocation.input, invocation.document, ctx)
	// The dispatch step knows the leaf, so a command-raised failure follows ADR-0013's input paths.
	if (isAppError(result)) return dispatchFailure(invocation.leaf, invocation.path, result)
	// A result that breaks its own output schema is a programming error: it throws, and the
	// top-level catch turns it into the fixed `internal` envelope.
	const data = invocation.leaf.output.parse(result.data)
	return invocation.leaf.render === undefined ? { data } : { data, hint: invocation.leaf.render }
}

async function execute(
	argv: string[],
	io: Io,
	env: Env,
	root: Group,
	stdin: Stdin,
	format: Format,
	invalid: string | undefined,
	seen: Seen,
): Promise<Ended> {
	try {
		if (invalid !== undefined) return badFormat(invalid, io.err)
		const outcome = await dispatch(argv, env, root, stdin, io.err, seen)
		if (isAppError(outcome)) return failureOf(outcome, format, io.err)
		io.out(renderResult(outcome.data, format, outcome.hint))
		return { exitCode: 0 }
	} catch (error) {
		// The message is fixed text; diagnostics go to stderr only when TRAJ_DEBUG asks for them.
		if (env["TRAJ_DEBUG"] === "1") {
			io.err(error instanceof Error ? (error.stack ?? error.message) : String(error))
		}
		return failureOf(fail("internal"), format, io.err)
	}
}

/** Runs the CLI and returns the exit code. Never calls process.exit, so tests can drive it. */
export async function run(
	argv: string[],
	io: Io,
	env: Env,
	root: Group = defaultRoot,
	stdin: Stdin = defaultStdin,
): Promise<number> {
	// The format is settled first, by a pre-scan that cannot fail, so even a malformed command
	// line is answered in the format the caller asked for.
	const choice = resolveFormat(argv, env)
	const seen: Seen = { command: namedLeaf(root, argv) }
	const ended = await execute(argv, io, env, root, stdin, choice.format, choice.invalid, seen)
	io.observe?.({
		command: seen.command,
		exitCode: ended.exitCode,
		errorCode: ended.errorCode,
		format: choice.format,
	})
	return ended.exitCode
}
