import { describe, expect, it } from "bun:test"
import type { Leaf } from "./command"
import { root } from "./commands"
import { parseNodeArgs } from "./parse"
import { capture } from "./test-support"
import { leavesOf } from "./tree"

type Property = { type?: string; flag?: string }
type Detail = { input: { properties?: Record<string, Property> } }

async function detailOf(path: readonly string[]): Promise<Detail> {
	const res = await capture(["schema", ...path, "--json"])
	expect(res.code).toBe(0)
	return JSON.parse(res.out) as Detail
}

/** Every property of every command's published input, with its leaf and the path it sits at. */
async function everyProperty() {
	const rows: { path: string[]; leaf: Leaf; field: string; property: Property }[] = []
	for (const { path, leaf } of leavesOf(root)) {
		const properties = (await detailOf(path)).input.properties ?? {}
		for (const [field, property] of Object.entries(properties)) {
			rows.push({ path, leaf, field, property })
		}
	}
	return rows
}

type Row = Awaited<ReturnType<typeof everyProperty>>[number]

/** The leaf's own parser takes the published flag and files it under the property it names. */
function expectParsed({ path, leaf, field, property }: Row): void {
	const spec = leaf.flags.find((entry) => entry.field === field)
	if (property.flag === undefined || spec === undefined) return
	const args = spec.kind === "boolean" ? [property.flag] : [property.flag, "1"]
	const parsed = parseNodeArgs(leaf.flags, args, path)
	expect("fields" in parsed, `${path.join(" ")} ${property.flag}`).toBe(true)
	if ("fields" in parsed) expect(Object.keys(parsed.fields)).toEqual([field])
}

describe("traj schema names the flag of every input property (cli ADR-0054)", () => {
	it("publishes a flag for each non-positional property, and none for a positional", async () => {
		for (const { path, leaf, field, property } of await everyProperty()) {
			const positional = leaf.positionals.includes(field)
			expect(property.flag !== undefined, `${path.join(" ")}: ${field}`).toBe(!positional)
		}
	})

	it("publishes only flags that the command's own parser accepts", async () => {
		for (const row of await everyProperty()) expectParsed(row)
	})

	it("names --external-ref for externalRef on tx add, and --dry-run for dryRun", async () => {
		const properties = (await detailOf(["tx", "add"])).input.properties ?? {}
		expect(properties["externalRef"]?.flag).toBe("--external-ref")
		expect(properties["dryRun"]?.flag).toBe("--dry-run")
		expect(properties["amount"]?.flag).toBe("--amount")
	})

	it("keeps the rest of each property as it was", async () => {
		const properties = (await detailOf(["tx", "add"])).input.properties ?? {}
		expect(properties["externalRef"]?.type).toBe("string")
	})
})
