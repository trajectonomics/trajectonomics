import { type AppError, fail, isAppError } from "../errors"
import { currencyOf, mapDecimalFields } from "./decimal"
import { hintOf, MONEY_HINT, notDecimal, parseField } from "./decimal-field"
import { isNode, type Node, PUBLISHED } from "./money-fields"
import { formatPath } from "./path"
import { flagError, type OverrideFlag } from "./set-parse"

/*
 * The decimal form of one `--set` value (cli ADR-0056): the same conversion `decimal.ts` makes for a
 * whole document, applied to the value of one Scenario path. The node a path names is found by
 * walking the published schema, so a money field under `anyOf` is converted as well.
 */

/** The schema node a Scenario path names: a key through `properties`, a list item by its id through `items`. */
export function schemaAtPath(schema: unknown, segments: readonly string[]): unknown {
	if (segments.length === 0) return schema
	if (!isNode(schema)) return undefined
	const [head = "", ...rest] = segments
	return (
		fromProperty(schema, head, rest) ?? fromItems(schema, rest) ?? fromBranches(schema, segments)
	)
}

function fromProperty(node: Node, head: string, rest: readonly string[]): unknown {
	const properties = node["properties"]
	if (!isNode(properties) || !Object.hasOwn(properties, head)) return undefined
	return schemaAtPath(properties[head], rest)
}

function fromItems(node: Node, rest: readonly string[]): unknown {
	return node["items"] === undefined ? undefined : schemaAtPath(node["items"], rest)
}

/** An `anyOf` is searched branch by branch, so the first branch that names the path wins. */
function fromBranches(node: Node, segments: readonly string[]): unknown {
	const branches = node["anyOf"]
	if (!Array.isArray(branches)) return undefined
	for (const branch of branches) {
		const found = schemaAtPath(branch, segments)
		if (found !== undefined) return found
	}
	return undefined
}

/** A refusal from the conversion of one value, at the flag (`--set` or `--add`) that carried it. */
function atSetFlag(error: AppError, index: number, path: string, flag: OverrideFlag): AppError {
	const body = error.body
	const details = isNode(body.details) ? body.details : {}
	const hint = body.hint ?? (body.code === "invalid_input" ? MONEY_HINT : undefined)
	// The conversion's message opens with the path it names; the flag sentence says where instead.
	// A flag refusal reads "At <path>, ..." once the dispatch drops the `<flag>: ` it carries, and this one
	// keeps its own `--<flag>` path, so it states the sentence the same way.
	const lead = `${path}: `
	const reason = body.message.startsWith(lead) ? body.message.slice(lead.length) : body.message
	return fail(body.code, {
		message: `At ${path}, ${reason}`,
		path: `--${flag}`,
		...(hint === undefined ? {} : { hint }),
		details: { ...details, index, path },
	})
}

/**
 * One `--set` value, or one `--add` item (cli ADR-0062), read in the decimal form (cli ADR-0056): a value whose path names a money field
 * becomes minor units through the same exact parser `scenario apply --decimal` uses, and a value that
 * replaces an object or list converts every money field inside it. Any other value is returned as
 * given. The Override echoes the value as it was given; only the document receives the converted one.
 */
export function setValueFromDecimal(
	document: Node,
	index: number,
	path: string,
	segments: readonly string[],
	value: unknown,
	flag: OverrideFlag = "set",
): unknown | AppError {
	const node = schemaAtPath(PUBLISHED, segments)
	if (node === undefined) return value
	return mapDecimalFields(node, value, segments, (raw, at, kind) => {
		const currency = currencyOf(document)
		if (isAppError(currency)) return currency
		const dotted = formatPath(at)
		if (typeof raw !== "string") {
			return flagError(flag, index, `at ${dotted}, ${notDecimal(raw, kind)}`, {
				hint: hintOf(kind),
				details: { path: dotted },
			})
		}
		const minor = parseField(kind, raw, currency, dotted)
		return isAppError(minor) ? atSetFlag(minor, index, path, flag) : minor
	})
}
