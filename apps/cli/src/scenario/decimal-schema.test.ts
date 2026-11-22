import { describe, expect, it } from "bun:test"
import { z } from "zod"
import { decimalDocument } from "./decimal-schema"
import { moneyPathsOf, PUBLISHED } from "./money-fields"

type Schema = Record<string, unknown>

/** The schema node a dotted money path names, following list items by `[]`. */
function nodeAt(schema: Schema, path: string): Schema {
	let node: unknown = schema
	for (const segment of path.split(".")) {
		const listed = segment.endsWith("[]")
		const key = listed ? segment.slice(0, -2) : segment
		const props = (node as Schema)["properties"] as Schema
		const child = props[key] as Schema
		node = listed ? child["items"] : child
	}
	return node as Schema
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
