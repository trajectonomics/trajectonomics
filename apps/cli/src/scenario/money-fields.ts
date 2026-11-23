import { z } from "zod"
import { scenarioDocument } from "./document-form"
import { MINOR_UNITS, PRINCIPAL_UNITS } from "./shape/terms"

/*
 * Which fields of a Scenario document are money (ADR-0047). Nothing lists them by hand: a money
 * field is a node of the published document schema whose description starts with one of the money
 * units (MINOR_UNITS, or PRINCIPAL_UNITS for a loan's principal), so the decimal conversion and
 * `traj schema` read the same schema and cannot drift, and a new money field is converted as soon as
 * it is published.
 */

/** The units a money field's description may start with. A new unit is added here and nowhere else. */
const MONEY_UNITS: readonly string[] = [MINOR_UNITS, PRINCIPAL_UNITS]

/** The unit a node's description starts with, when the node is a money field; otherwise undefined. */
export function moneyUnitOf(node: Node): string | undefined {
	const description = node["description"]
	if (typeof description !== "string") return undefined
	return MONEY_UNITS.find((unit) => description.startsWith(unit))
}

export type Node = Record<string, unknown>

export function isNode(value: unknown): value is Node {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function isMoney(node: Node): boolean {
	return moneyUnitOf(node) !== undefined
}

/** The published schema of the minor-unit form, the one `traj schema scenario apply` prints. */
export const PUBLISHED: Node = z.toJSONSchema(scenarioDocument, { io: "input" }) as Node

/**
 * Every money field of a schema, as `flows[].amount`: a list is `[]`, and an `anyOf` is searched
 * too, so a money field the converter does not reach is still named here.
 */
export function moneyPathsOf(schema: unknown, at = ""): string[] {
	if (!isNode(schema)) return []
	const found = isMoney(schema) && at !== "" ? [at] : []
	const properties = schema["properties"]
	const fields = isNode(properties)
		? Object.entries(properties).flatMap(([key, child]) =>
				moneyPathsOf(child, at === "" ? key : `${at}.${key}`),
			)
		: []
	const items = schema["items"] === undefined ? [] : moneyPathsOf(schema["items"], `${at}[]`)
	const branches = Array.isArray(schema["anyOf"])
		? schema["anyOf"].flatMap((branch) => moneyPathsOf(branch, at))
		: []
	return [...found, ...fields, ...items, ...branches]
}
