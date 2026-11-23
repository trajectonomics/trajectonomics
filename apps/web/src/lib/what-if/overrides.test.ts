import { describe, expect, test } from "bun:test"
import { whatIfSchema } from "./overrides"

const good = {
	plan: "base",
	sets: [{ path: "flows.salary.amount", value: "90000.50" }],
	removals: [],
}

describe("the what-if body", () => {
	test("accepts a plan with a Set and a Removal, and a removal of a whole list is refused", () => {
		expect(whatIfSchema.safeParse(good).success).toBe(true)
		expect(
			whatIfSchema.safeParse({ plan: "base", sets: [], removals: ["flows.gym"] }).success,
		).toBe(true)
		for (const removals of [["flows"], ["flows."], ["flows.gym.amount"], ["milestones"], ["0"]]) {
			expect(whatIfSchema.safeParse({ ...good, sets: [], removals }).success).toBe(false)
		}
	})

	test("is strict: any other field, or a missing list, is refused", () => {
		expect(whatIfSchema.safeParse({ ...good, extra: true }).success).toBe(false)
		expect(whatIfSchema.safeParse({ plan: "base", sets: [] }).success).toBe(false)
		expect(
			whatIfSchema.safeParse({ ...good, sets: [{ path: "a.b", value: 1, x: 2 }] }).success,
		).toBe(false)
	})

	test("refuses a plan name that starts with -, holds a control character, or is over 100 characters", () => {
		for (const plan of ["-h", "--help", "a\nb", "a\u0000b", "x".repeat(101), ""]) {
			expect(whatIfSchema.safeParse({ ...good, plan }).success).toBe(false)
		}
	})

	test("a plan name with a leading space is a name traj can take", () => {
		expect(whatIfSchema.safeParse({ ...good, plan: " early" }).success).toBe(true)
	})

	test("refuses a path that starts with -, holds a control character, or holds =", () => {
		for (const path of ["-x.amount", "flows.a\n.amount", "flows.a=b.amount", "x".repeat(201)]) {
			expect(whatIfSchema.safeParse({ ...good, sets: [{ path, value: 1 }] }).success).toBe(false)
		}
	})

	test("a value with = in it is a value, not a path, and is accepted", () => {
		expect(
			whatIfSchema.safeParse({
				...good,
				sets: [{ path: "flows.salary.name", value: "a=b" }],
			}).success,
		).toBe(true)
	})

	test("refuses a path set twice, and a removal repeated", () => {
		expect(
			whatIfSchema.safeParse({
				...good,
				sets: [
					{ path: "flows.salary.amount", value: "1" },
					{ path: "flows.salary.amount", value: "2" },
				],
			}).success,
		).toBe(false)
		expect(
			whatIfSchema.safeParse({ ...good, sets: [], removals: ["flows.a", "flows.a"] }).success,
		).toBe(false)
	})

	test("accepts JSON values: a string, a number, a boolean, null, and an object", () => {
		for (const value of ["90000.50", 0.5, true, null, { a: [1, "x"] }]) {
			expect(
				whatIfSchema.safeParse({ ...good, sets: [{ path: "flows.a.amount", value }] }).success,
			).toBe(true)
		}
	})

	test("refuses a value that is not JSON, such as a function or NaN", () => {
		expect(
			whatIfSchema.safeParse({ ...good, sets: [{ path: "flows.a.amount", value: Number.NaN }] })
				.success,
		).toBe(false)
	})
})
