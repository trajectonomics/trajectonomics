import { describe, expect, it } from "bun:test"
import { analyse, type GraphNode } from "./graph"

const DATE = { kind: "date" } as const
const OTHER = { kind: "other" } as const
const after = (to: string, months = 0) => ({ kind: "milestone" as const, to, months })

describe("the Milestone graph classifies, orders and checks references", () => {
	it("marks a Milestone static when it names only dates and static Milestones", () => {
		const nodes: GraphNode[] = [
			{ id: "born", criteria: [DATE] },
			{ id: "adult", criteria: [after("born", 216)] },
			{ id: "rich", criteria: [OTHER] },
			{ id: "later", criteria: [after("rich", 0)] },
		]
		expect(analyse(nodes).isStatic).toEqual([true, true, false, false])
	})

	it("orders dependencies first, with ties in Scenario order", () => {
		// 'a' waits for 'c'. Ready at the start: 'b' and 'c'; the earlier one, 'b', goes first.
		const nodes: GraphNode[] = [
			{ id: "a", criteria: [after("c")] },
			{ id: "b", criteria: [OTHER] },
			{ id: "c", criteria: [OTHER] },
		]
		expect(analyse(nodes).order).toEqual([1, 2, 0])
	})

	it("reports a cycle at the reference that closes it, and leaves its members out of the order", () => {
		const nodes: GraphNode[] = [
			{ id: "a", criteria: [after("b")] },
			{ id: "b", criteria: [after("a")] },
			{ id: "c", criteria: [OTHER] },
		]
		const report = analyse(nodes)
		expect(report.cycles).toEqual([{ node: 1, criterion: 0 }])
		expect(report.order).toEqual([2])
	})

	it("reports a self-reference as a cycle", () => {
		expect(analyse([{ id: "a", criteria: [after("a")] }]).cycles).toEqual([
			{ node: 0, criterion: 0 },
		])
	})

	it("reports a reference to no node as unknown", () => {
		expect(analyse([{ id: "a", criteria: [after("ghost")] }]).unknown).toEqual([
			{ node: 0, criterion: 0 },
		])
	})

	it("flags a negative offset from a dynamic node as lookahead, and allows one from a static node", () => {
		const nodes: GraphNode[] = [
			{ id: "dyn", criteria: [OTHER] },
			{ id: "stat", criteria: [DATE] },
			{ id: "fromDyn", criteria: [after("dyn", -12)] },
			{ id: "fromStat", criteria: [after("stat", -12)] },
			{ id: "zeroFromDyn", criteria: [after("dyn", 0)] },
		]
		expect(analyse(nodes).lookahead).toEqual([{ node: 2, criterion: 0 }])
	})

	it("counts a Milestone that names a dynamic one as dynamic, through any depth", () => {
		const nodes: GraphNode[] = [
			{ id: "dyn", criteria: [OTHER] },
			{ id: "mid", criteria: [after("dyn", 0)] },
			{ id: "top", criteria: [after("mid", 0)] },
		]
		expect(analyse(nodes).isStatic).toEqual([false, false, false])
	})
})
