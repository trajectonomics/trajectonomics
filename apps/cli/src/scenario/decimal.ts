import { type AppError, fail, isAppError } from "../errors"
import { isPlainObject } from "../json"
import { formatMinorUnits, supportedCurrency } from "../store/money"
import { hintOf, notDecimal, parseField } from "./decimal-field"
import { branchOf, type FieldKind, fieldKindOf, isNode, type Node, PUBLISHED } from "./money-fields"
import { formatPath } from "./path"
import { formatPercent } from "./percent"

/*
 * The decimal form of a Scenario document (ADR-0047): the same document with every money field
 * written as a decimal string of the Currency's major unit, such as "350.00" for 35000 satang.
 * The money fields are found by walking the published schema (field-paths.ts), never listed here.
 */

/** The element a document path names: a list item's `id` when it has one, otherwise its index. */
function elementKey(item: unknown, index: number): string {
	const id = isPlainObject(item) ? item["id"] : undefined
	return typeof id === "string" ? id : String(index)
}

/** The document path an error names: `document.` and the Override grammar's dotted path. */
function at(path: readonly string[]): string {
	return ["document", formatPath(path)].filter((part) => part !== "").join(".")
}

/** The Currency every amount is stated in. Missing or unsupported is refused before any field. */
export function currencyOf(document: Node): string | AppError {
	const path = "document.currency"
	const raw = document["currency"]
	if (typeof raw !== "string") {
		return fail("unsupported_currency", {
			path,
			message: `${path}: the decimal form needs the currency its amounts are stated in`,
			details: { supported: ["THB"] },
		})
	}
	return supportedCurrency(raw, path) ?? raw
}

type Convert = (value: unknown, path: readonly string[], kind: FieldKind) => unknown

/**
 * Walks a value beside its schema and converts each field the schema marks as money or as a rule's
 * rate (cli ADR-0063). Only the keys a
 * value holds are visited, so an absent optional field stays absent. A failure stops the walk and
 * is returned as the value, so the caller checks `isAppError` once.
 */
export function mapDecimalFields(
	schema: unknown,
	value: unknown,
	path: readonly string[],
	convert: Convert,
): unknown {
	if (!isNode(schema)) return value
	const kind = fieldKindOf(schema)
	if (kind !== undefined) return convert(value, path, kind)
	if (Array.isArray(schema["anyOf"])) {
		return mapDecimalFields(branchOf(schema["anyOf"], value), value, path, convert)
	}
	if (isNode(schema["properties"]) && isPlainObject(value)) {
		return mapFields(schema["properties"], value, path, convert)
	}
	if (schema["items"] !== undefined && Array.isArray(value)) {
		return mapItems(schema["items"], value, path, convert)
	}
	return value
}

function mapFields(properties: Node, value: Node, path: readonly string[], convert: Convert) {
	const out: Node = { ...value }
	for (const [key, child] of Object.entries(properties)) {
		if (!Object.hasOwn(value, key)) continue
		const next = mapDecimalFields(child, value[key], [...path, key], convert)
		if (isAppError(next)) return next
		out[key] = next
	}
	return out
}

function mapItems(items: unknown, list: unknown[], path: readonly string[], convert: Convert) {
	const out: unknown[] = []
	for (const [index, item] of list.entries()) {
		const next = mapDecimalFields(items, item, [...path, elementKey(item, index)], convert)
		if (isAppError(next)) return next
		out.push(next)
	}
	return out
}

/**
 * The document with each money field as a decimal string of its Currency, for `scenario show
 * --decimal` and for an apply's printed result. Nothing is rounded: each minor-unit value has
 * exactly the Currency's places.
 */
export function toDecimalForm(document: Node): Node | AppError {
	const currency = currencyOf(document)
	if (isAppError(currency)) return currency
	const out = mapDecimalFields(PUBLISHED, document, [], (value, _path, kind) => {
		// The store keeps only safe integers, so anything else here is a bug, not a caller's input.
		if (typeof value !== "number" || !Number.isSafeInteger(value)) return fail("internal")
		return kind === "percent" ? formatPercent(value) : formatMinorUnits(value, currency)
	})
	return isAppError(out) ? out : (out as Node)
}

/**
 * The stored document a decimal-form one means, for `scenario apply --decimal`: each money string
 * becomes minor units through the CLI's exact parser. A JSON number, a string that is not a plain
 * decimal, or one with more places than the Currency has is refused at its document path. The
 * result is then checked by the store exactly as a minor-unit document is (ADR-0024).
 */
export function fromDecimalForm(document: unknown): unknown {
	if (!isNode(document)) return document
	const currency = currencyOf(document)
	if (isAppError(currency)) return currency
	return mapDecimalFields(PUBLISHED, document, [], (value, path, kind) => {
		const named = at(path)
		if (typeof value !== "string") {
			const reason = notDecimal(value, kind)
			return fail("invalid_input", {
				path: named,
				message: `${named}: ${reason}`,
				hint: hintOf(kind),
			})
		}
		return parseField(kind, value, currency, named)
	})
}

/** The row a command prints: its document in decimal form under `--decimal`, or as stored. */
export function printedRow<T extends { document: Node }>(row: T, decimal: boolean): T | AppError {
	if (!decimal) return row
	const document = toDecimalForm(row.document)
	return isAppError(document) ? document : { ...row, document }
}
