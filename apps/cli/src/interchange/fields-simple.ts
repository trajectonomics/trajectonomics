import type { AppError } from "../errors"
import { isPlainObject } from "../json"
import { notesProblem } from "../scenario/notes"
import { isTxCorrection, TX_CORRECTIONS } from "../store"
import { invalid } from "./invalid"

/** A free-form dimensions object: an object of strings, or null, never `{}`. */
export function dimensions(value: unknown, path: string): unknown | AppError {
	if (!isPlainObject(value)) return invalid(path, "must be an object of strings or null")
	const entries = Object.values(value)
	if (entries.length === 0) return invalid(path, "must be null when empty, never {}")
	if (!entries.every((v) => typeof v === "string")) return invalid(path, "values must be strings")
	return value
}

/** A plan's notes, checked by the rules `scenario notes` stores them under. */
export function notes(value: unknown, path: string): unknown | AppError {
	if (typeof value !== "string") return invalid(path, "must be a string or null")
	const problem = notesProblem(value)
	return problem === null ? value : invalid(path, problem)
}

/** A JSON boolean, as the main-plan flag is written. */
export function flag(value: unknown, path: string): unknown | AppError {
	return typeof value === "boolean" ? value : invalid(path, "must be true or false")
}

/** A transaction's correction kind: null, or one this build stores. */
export function correction(value: unknown, path: string): unknown | AppError {
	if (value === null || isTxCorrection(value)) return value
	return invalid(path, `must be null or one of ${TX_CORRECTIONS.join(", ")}`)
}
