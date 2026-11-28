import { describe, expect, test } from "bun:test"
import { routedSnapshot } from "../../../components/routing/routing.test-support"
import { drawsPlace } from "./shown"

const { ctx } = routedSnapshot()
const row = (index: number) => ({ kind: "row", list: "withdraw", index, field: "" }) as const
const flow = (id: string) => ({ kind: "flow", id, field: "" }) as const

describe("the places the routing page draws", () => {
	test("a row of a list the page shows, and no row past its end", () => {
		expect(drawsPlace(row(2), ctx)).toBe(true)
		expect(drawsPlace(row(3), ctx)).toBe(false)
	})

	test("a planned move, and no other Flow", () => {
		const other = ctx.doc.flows.find((one) => one.kind !== "transfer")
		expect(drawsPlace(flow("roll"), ctx)).toBe(true)
		expect(drawsPlace(flow(other?.id ?? ""), ctx)).toBe(false)
	})

	test("nothing for a refusal that names no place", () => {
		expect(drawsPlace(null, ctx)).toBe(false)
	})
})
