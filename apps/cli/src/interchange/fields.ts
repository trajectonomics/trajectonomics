import { type AppError, isAppError } from "../errors"
import { householdDocument } from "../scenario/household/document"
import { canonicalHousehold } from "../scenario/household/model"
import { canonicalTax, requestOfStored, storedTaxOf } from "../scenario/tax/stored"
import { storedTax } from "../scenario/tax/stored-schema"
import { parseUnstated, serializeUnstated } from "../scenario/unstated/entry"
import { canonicalScenarioDocument, formatMinorUnits, parseMinorUnits } from "../store"
import { correction, dimensions, flag, notes } from "./fields-simple"
import type { FieldKind } from "./format"
import { invalid } from "./invalid"

type Decode = (value: unknown, path: string, record: Record<string, unknown>) => unknown | AppError

const TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

function text(value: unknown, path: string): unknown | AppError {
	return typeof value === "string" ? value : invalid(path, "must be a string")
}

function time(value: unknown, path: string): unknown | AppError {
	const valid = typeof value === "string" && TIME.test(value)
	if (valid && new Date(value).toISOString() === value) return value
	return invalid(path, "must be a YYYY-MM-DDTHH:MM:SS.sssZ timestamp")
}

function nullable(decode: Decode): Decode {
	return (value, path, record) => (value === null ? null : decode(value, path, record))
}

function int(value: unknown, path: string): unknown | AppError {
	return Number.isSafeInteger(value) ? value : invalid(path, "must be a safe integer")
}

function amount(value: unknown, path: string, record: Record<string, unknown>): unknown {
	const currency = record["currency"]
	if (typeof value !== "string") return invalid(path, "must be a decimal string such as 1234.56")
	if (typeof currency !== "string")
		return invalid(path.replace(/amount$/, "currency"), "must be a string")
	const minor = parseMinorUnits(value, currency, path)
	if (isAppError(minor)) return minor
	// Only the writer's own form, so a restored row re-exports as the same bytes.
	const canonical = formatMinorUnits(minor, currency)
	if (canonical === value) return minor
	return invalid(path, `must be the canonical decimal "${canonical}"`, {
		expected: canonical,
		actual: value,
	})
}

function document(value: unknown, path: string): unknown | AppError {
	return canonicalScenarioDocument(value, path)
}

/** A household document, checked by the rules `traj scenario household` applies, as canonical text. */
function household(value: unknown, path: string): unknown | AppError {
	const parsed = householdDocument.safeParse(value)
	if (!parsed.success) {
		const reason = parsed.error.issues[0]?.message ?? "does not match the household schema"
		return invalid(path, `is not a household document: ${reason}`)
	}
	return canonicalHousehold(parsed.data)
}

/** A tax profile, checked by the rules `traj scenario tax` stores, as canonical text. */
function tax(value: unknown, path: string): unknown | AppError {
	const parsed = storedTax.safeParse(value)
	if (!parsed.success) {
		const reason = parsed.error.issues[0]?.message ?? "does not match the tax profile schema"
		return invalid(path, `is not a tax profile: ${reason}`)
	}
	return canonicalTax(storedTaxOf(requestOfStored(parsed.data)))
}

/** The paths a plan's writes left unstated, as the column stores them: canonical text or null. */
function unstated(value: unknown, path: string): unknown | AppError {
	if (value === null) return null
	if (!Array.isArray(value)) return invalid(path, "must be an array of entries or null")
	const parsed = parseUnstated(value, path)
	return isAppError(parsed) ? parsed : serializeUnstated(parsed)
}

/** How each field kind is checked and turned back into the store's row value. */
export const DECODERS: Record<FieldKind, Decode> = {
	text,
	"text?": nullable(text),
	time,
	"time?": nullable(time),
	int,
	amount,
	dimensions: nullable(dimensions),
	document,
	"household?": nullable(household),
	"tax?": nullable(tax),
	"notes?": nullable(notes),
	"unstated?": unstated,
	flag,
	correction,
}
