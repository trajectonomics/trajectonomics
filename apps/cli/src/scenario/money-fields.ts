import { z } from "zod"
import { scenarioDocument } from "./document-form"
import { ACCOUNT_PERCENT_UNITS, ACCOUNT_RATE_UNITS } from "./shape/account-terms"
import { ESTATE_PERCENT_UNITS, ESTATE_RATE_UNITS, ESTATE_UNITS } from "./shape/estate-terms"
import {
	MINOR_UNITS,
	PERCENT_UNITS,
	PRINCIPAL_UNITS,
	RULE_RATE_UNITS,
	YEARLY_UNITS,
} from "./shape/terms"

/*
 * Which fields of a Scenario document are money (ADR-0047), and which are a Spending rule's, an
 * estate line's or an Account's payout or fee rates (cli ADR-0063, ADR-0064, ADR-0067). Nothing lists them by hand: a money field is a node of the published document
 * schema whose description starts with one of the money units (MINOR_UNITS, PRINCIPAL_UNITS for a
 * loan's principal, YEARLY_UNITS for a rule's bound), and a rule rate one whose description starts
 * with RULE_RATE_UNITS, so the decimal conversion and `traj schema` read the same schema and cannot
 * drift, and a new field is converted as soon as it is published. No other rate is converted.
 */

/** The units a money field's description may start with. A new unit is added here and nowhere else. */
const MONEY_UNITS: readonly string[] = [MINOR_UNITS, PRINCIPAL_UNITS, YEARLY_UNITS, ESTATE_UNITS]

/** A rate field's stored unit, and the percent unit the decimal form replaces it with. */
export type RateUnit = { stored: string; percent: string }

/** The units a rate field's description may start with, and so the decimal form writes as a percent string. */
const RATE_UNITS: readonly RateUnit[] = [
	{ stored: RULE_RATE_UNITS, percent: PERCENT_UNITS },
	{ stored: ESTATE_RATE_UNITS, percent: ESTATE_PERCENT_UNITS },
	{ stored: ACCOUNT_RATE_UNITS, percent: ACCOUNT_PERCENT_UNITS },
]

/** How the decimal form writes a field: money as the Currency's major unit, a rule's rate as a percent. */
export type FieldKind = "money" | "percent"

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

/** The unit a node's description starts with, when the node is a rate the decimal form writes as a percent. */
export function rateUnitOf(node: Node): RateUnit | undefined {
	const description = node["description"]
	if (typeof description !== "string") return undefined
	return RATE_UNITS.find((unit) => description.startsWith(unit.stored))
}

/** Which decimal form a node is written in, or undefined when the decimal form leaves it as stored. */
export function fieldKindOf(node: Node): FieldKind | undefined {
	if (isMoney(node)) return "money"
	return rateUnitOf(node) === undefined ? undefined : "percent"
}

/** The published schema of the minor-unit form, the one `traj schema scenario apply` prints. */
export const PUBLISHED: Node = z.toJSONSchema(scenarioDocument, { io: "input" }) as Node

/**
 * Every money field of a schema, as `flows[].amount`: a list is `[]`, and an `anyOf` is searched
 * too, so a money field the converter does not reach is still named here.
 */
export function moneyPathsOf(schema: unknown, at = ""): string[] {
	return fieldPathsOf(schema, "money", at)
}

/** Every rate of a schema the decimal form writes as a percent, named as `moneyPathsOf` names a money field. */
export function ratePathsOf(schema: unknown): string[] {
	return fieldPathsOf(schema, "percent", "")
}

function fieldPathsOf(schema: unknown, kind: FieldKind, at: string): string[] {
	if (!isNode(schema)) return []
	const found = fieldKindOf(schema) === kind && at !== "" ? [at] : []
	const properties = schema["properties"]
	const fields = isNode(properties)
		? Object.entries(properties).flatMap(([key, child]) =>
				fieldPathsOf(child, kind, at === "" ? key : `${at}.${key}`),
			)
		: []
	const items = schema["items"] === undefined ? [] : fieldPathsOf(schema["items"], kind, `${at}[]`)
	const branches = Array.isArray(schema["anyOf"])
		? schema["anyOf"].flatMap((branch) => fieldPathsOf(branch, kind, at))
		: []
	return [...found, ...fields, ...items, ...branches]
}
