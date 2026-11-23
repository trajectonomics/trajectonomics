import type { ErrorCode } from "./codes"

/** Location of a problem: a segment is an object key or an array index. */
export type Path = readonly (string | number)[]

export interface Problem {
	readonly code: ErrorCode
	readonly path: Path
}

export type Emit = (code: ErrorCode, path: Path) => void

export type Check = (value: unknown, path: Path, emit: Emit) => void

/** Declared account id -> raw `kind` value from the scenario. */
export type AccountIndex = ReadonlyMap<string, unknown>
