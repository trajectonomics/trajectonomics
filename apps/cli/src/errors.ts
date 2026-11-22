import { type ErrorCode, type ExitCode, registry } from "./registry"

export type { ErrorCode, ExitCode } from "./registry"
export { registry }

/** Codes a caller may retry unchanged; every other code is permanent (ADR-0037). */
export const RETRYABLE_CODES: readonly ErrorCode[] = ["database_busy", "disk_full"]

export type FailOptions = {
	/** Replaces the registry message with a more specific one. */
	message?: string
	/** The input field the failure points at, dot-separated. */
	path?: string
	hint?: string
	details?: unknown
}

/** The `error` object of the JSON envelope. */
export type ErrorBody = {
	code: ErrorCode
	exitCode: ExitCode
	message: string
	path?: string
	hint?: string
	details?: unknown
}

// Not exported as a value: `fail()` is the only way to obtain an AppError, and the private field
// makes the type nominal, so a hand-written `{ code, exitCode }` is not assignable to it.
class AppErrorImpl {
	readonly #body: ErrorBody
	constructor(body: ErrorBody) {
		this.#body = body
	}
	get body(): ErrorBody {
		return this.#body
	}
}

/** A failed command. Produced only by `fail()`. */
export type AppError = AppErrorImpl

/** The sentence an `internal` failure names where to report it. A domain failure carries only its own hint. */
const INTERNAL_HINT =
	"Report it at https://github.com/trajectonomics/trajectonomics/issues/new/choose, with the command you ran and without your ledger figures."

/** Builds the only value a command may return on failure. */
export function fail(code: ErrorCode, options: FailOptions = {}): AppError {
	const spec = registry[code]
	const body: ErrorBody = {
		code,
		exitCode: spec.exit,
		message: options.message ?? spec.message,
	}
	if (options.path !== undefined) body.path = options.path
	const hint = options.hint ?? (code === "internal" ? INTERNAL_HINT : undefined)
	if (hint !== undefined) body.hint = hint
	if (options.details !== undefined) body.details = options.details
	return new AppErrorImpl(body)
}

export function isAppError(value: unknown): value is AppError {
	return value instanceof AppErrorImpl
}
