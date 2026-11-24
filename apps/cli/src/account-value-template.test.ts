import { describe, expect, it } from "bun:test"
import { valueDocument } from "./account/value/document"
import { capture } from "./test-support"

describe("account value --template", () => {
	it("prints a document the schema accepts, and opens no data directory", async () => {
		const res = await capture(["account", "value", "--template"])
		expect(res.code).toBe(0)
		expect(valueDocument.safeParse(JSON.parse(res.out)).success).toBe(true)
		const json = await capture(["account", "value", "--template", "--json"])
		expect(typeof JSON.parse(json.out)).toBe("string")
	})

	it("takes none of the other forms' flags", async () => {
		for (const flags of [["--dry-run"], ["--value", "1.00"], ["--against", "Gains"]]) {
			const res = await capture(["account", "value", "--template", ...flags, "--json"])
			expect(res.code).toBe(2)
		}
	})

	it("publishes both forms in traj schema", async () => {
		const res = await capture(["schema", "account", "value", "--json"])
		const data = JSON.parse(res.out)
		expect(Object.keys(data.input.properties).sort()).toEqual(
			["account", "against", "date", "dryRun", "file", "template", "value"].sort(),
		)
		expect(data.document.flag).toBe("file")
		expect(data.document.schema.required).toEqual(["against", "values"])
		expect(data.document.schema.properties.values.items.required).toEqual([
			"account",
			"date",
			"value",
		])
		expect(data.errors ?? data.errorCodes).toBeDefined()
	})
})
