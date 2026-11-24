import { describe, expect, it } from "bun:test"
import { z } from "zod"
import { decimalDocument, decimalRoot } from "./decimal-schema"
import { moneyPathsOf, PUBLISHED, ratePathsOf } from "./money-fields"

type Schema = Record<string, unknown>

/** The branch of an `anyOf` a path goes on through (the object form) or ends at (the plain form, cli ADR-0070). */
function branchOf(node: Schema, through: boolean): Schema {
	const branches = node["anyOf"]
	if (!Array.isArray(branches)) return node
	const found = (branches as Schema[]).find(
		(branch) => (branch["properties"] !== undefined) === through,
	)
	if (found === undefined) throw new Error("an anyOf has no branch for this path")
	return found
}

/** The schema node a dotted money path names, following list items by `[]`. */
function nodeAt(schema: Schema, path: string, plain = true): Schema {
	let node: unknown = schema
	for (const segment of path.split(".")) {
		const listed = segment.endsWith("[]")
		const key = listed ? segment.slice(0, -2) : segment
		const props = branchOf(node as Schema, true)["properties"] as Schema
		const child = props[key] as Schema
		node = listed ? child["items"] : child
	}
	// A field with two forms ends at the plain one, which is the money; its object form is a path of its own.
	return plain ? branchOf(node as Schema, false) : (node as Schema)
}

describe("the decimal form's published schema", () => {
	const published = z.toJSONSchema(decimalDocument, { io: "input" }) as Schema

	for (const path of moneyPathsOf(PUBLISHED)) {
		it(`states ${path} as a decimal string with the decimal unit`, () => {
			const node = nodeAt(published, path)
			expect(node["type"]).toBe("string")
			expect(node["pattern"]).toBe("^-?(0|[1-9][0-9]*)(\\.[0-9]+)?$")
			expect(String(node["description"])).toContain('"350.00" is 35000 satang')
		})
	}

	it("keeps rates and counts integers", () => {
		const properties = nodeAt(published, "accounts[]")["properties"] as Schema
		expect((properties["rate"] as Schema)["type"]).toBe("integer")
	})

	it("shows its worked example in the decimal form", () => {
		const examples = published["examples"] as Schema[]
		expect(examples.length).toBe(1)
		const flows = examples[0]?.["flows"] as Schema[]
		expect(flows[0]?.["amount"]).toBe("1000.00")
	})
})

/** Every node of a schema whose description starts with `head`, found by walking the whole tree. */
function nodesWithHead(schema: unknown, head: string, found: Schema[] = []): Schema[] {
	if (typeof schema !== "object" || schema === null) return found
	if (Array.isArray(schema)) {
		for (const item of schema) nodesWithHead(item, head, found)
		return found
	}
	const node = schema as Schema
	if (typeof node["description"] === "string" && node["description"].startsWith(head)) {
		found.push(node)
	}
	for (const value of Object.values(node)) nodesWithHead(value, head, found)
	return found
}

describe("the decimal form's percent fields", () => {
	const published = z.toJSONSchema(decimalDocument, { io: "input" }) as Schema
	const percentNodes = nodesWithHead(published, "A percent string")

	it("finds every rate that percentRanges rewrites", () => {
		expect(percentNodes.length).toBe(ratePathsOf(PUBLISHED).length)
		expect(percentNodes.length).toBeGreaterThan(0)
	})

	for (const path of ratePathsOf(PUBLISHED)) {
		it(`states ${path} with no bare integer of three or more digits`, () => {
			const description = String(nodeAt(published, path)["description"])
			// Quoted strings are the percent forms ("0.00" to "100.00"); anything else is prose.
			const prose = description.replace(/"[^"]*"/g, "")
			expect(prose.match(/\b\d{3,}\b/g) ?? []).toEqual([])
		})
	}
})

describe("the decimal form's root description", () => {
	it("states decimal strings, and that derive graphs and Levies stay in minor units", () => {
		const description = String(decimalRoot()["description"])
		expect(description).not.toContain("Every amount is an integer of minor units")
		expect(description).toContain("every money field is a decimal string")
		expect(description).toContain("inside a Flow's `derive` graph and inside `levies`")
		expect(String(PUBLISHED["description"])).toContain("Every amount is an integer of minor units")
	})
})
