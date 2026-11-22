import type { Group } from "./command"
import { type AppError, type ErrorCode, fail, isAppError } from "./errors"
import { type Format, renderError } from "./render"
import { walk } from "./tree"

/** How a run ended: its exit code, and the error code when it failed. */
export type Ended = { exitCode: number; errorCode?: ErrorCode | undefined }

/** The command that ran, when the tree named one. Filled in as the run gets that far. */
export type Seen = { command?: string | undefined }

/** Prints a failure in the chosen format and says how the run ended. */
export function failureOf(error: AppError, format: Format, err: (line: string) => void): Ended {
	err(renderError(error, format))
	return { exitCode: error.body.exitCode, errorCode: error.body.code }
}

/** A TRAJ_FORMAT that is neither human nor json, answered in human text. */
export function badFormat(requested: string, err: (line: string) => void): Ended {
	const error = fail("unknown_format", {
		message: `Unknown format: ${requested}`,
		hint: "Set TRAJ_FORMAT to human or json, or pass --json.",
	})
	return failureOf(error, "human", err)
}

/**
 * The leaf the command line names by its words alone, before any flag is read, or `undefined` when
 * the words do not reach a leaf. A run that fails on a flag still named its command.
 */
export function namedLeaf(root: Group, argv: readonly string[]): string | undefined {
	const landed = walk(root, argv)
	if (isAppError(landed) || landed.node.kind !== "leaf") return undefined
	return landed.path.join(" ")
}
