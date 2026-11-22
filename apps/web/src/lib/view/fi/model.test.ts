import { describe, expect, test } from "bun:test"
import { bindingSentence, type UnreachableBinding } from "./binding"
import { fiFixture, REACHABLE, REFERENCE, UNREACHABLE } from "./fixtures.test-support"
import { fiModelOf } from "./model"

describe("fiModelOf: the reachable branch", () => {
	test("shows the FI month and the day it names, as the main figure", () => {
		const model = fiModelOf(fiFixture(REACHABLE))
		expect(model.kind).toBe("reachable")
		if (model.kind !== "reachable") return
		expect(model.month).toBe("Mar 2041")
		expect(model.date).toBe("1 Mar 2041")
	})

	test("states the rule-of-thumb reference with its multiplier, date, basis, window and terms", () => {
		const model = fiModelOf(fiFixture(REACHABLE))
		if (model.kind !== "reachable") throw new Error("expected a reachable answer")
		expect(model.reference.multiplier).toBe("25×")
		expect(model.reference.date).toBe("1 Mar 2041")
		expect(model.reference.basis).toBe("Unlocked assets")
		expect(model.reference.window).toBe("The next twelve months of expenses")
		expect(model.reference.terms).toBe("Nominal money")
	})

	test("says the reference is not met and is a full twelve months, when the CLI says so", () => {
		const model = fiModelOf(fiFixture(REACHABLE))
		if (model.kind !== "reachable") throw new Error("expected a reachable answer")
		expect(model.reference.met).toBe("Not met")
		expect(model.reference.partial).toBe("Full: the window holds twelve months")
	})

	test("says the reference is met and partial when the CLI says so", () => {
		const reference = { ...REFERENCE, met: true, partial: true, terms: "real" as const }
		const model = fiModelOf(fiFixture({ reachable: true, fiDate: REFERENCE.date, reference }))
		if (model.kind !== "reachable") throw new Error("expected a reachable answer")
		expect(model.reference.met).toBe("Met")
		expect(model.reference.partial).toBe("Partial: the window holds less than twelve months")
		expect(model.reference.terms).toBe("Real money")
	})

	test("lists the reference's money figures as the CLI states them, with their labels", () => {
		const model = fiModelOf(fiFixture(REACHABLE))
		if (model.kind !== "reachable") throw new Error("expected a reachable answer")
		expect(model.reference.amounts).toEqual([
			{ label: "Unlocked assets", amount: "1000000.00" },
			{ label: "Numerator", amount: "1000000.00" },
			{ label: "Annual expenses", amount: "50000.00" },
			{ label: "Threshold", amount: "1250000.00" },
		])
	})

	test("shows the multiple in basis points, and says so, when the CLI states one", () => {
		const model = fiModelOf(fiFixture(REACHABLE))
		if (model.kind !== "reachable") throw new Error("expected a reachable answer")
		expect(model.reference.multiple).toBe("200000 basis points, where 10,000 is one times")
	})

	test("has no multiple when the CLI states none", () => {
		const reference = { ...REFERENCE, multipleBps: null }
		const model = fiModelOf(fiFixture({ reachable: true, fiDate: REFERENCE.date, reference }))
		if (model.kind !== "reachable") throw new Error("expected a reachable answer")
		expect(model.reference.multiple).toBeNull()
	})
})

describe("fiModelOf: the unreachable branch", () => {
	test("reads no best case when no month could start a stop", () => {
		const model = fiModelOf(fiFixture(UNREACHABLE.noCandidateMonth))
		expect(model.kind).toBe("unreachable")
		if (model.kind !== "unreachable") return
		expect(model.binding).toBe("noCandidateMonth")
		expect(model.best).toBeNull()
		expect(model.horizon).toBe("31 Dec 2060")
	})

	const bindings: readonly Exclude<UnreachableBinding, "noCandidateMonth">[] = [
		"shortfallBeforeStop",
		"undrawableMoney",
		"insufficientMoney",
		"minimumBuffer",
	]

	for (const binding of bindings) {
		test(`says what the ${binding} binding means, in its own words`, () => {
			const model = fiModelOf(fiFixture(UNREACHABLE[binding]))
			if (model.kind !== "unreachable") throw new Error("expected an unreachable answer")
			expect(model.binding).toBe(binding)
			expect(model.sentence).toBe(bindingSentence(binding))
		})
	}

	test("reads a run-out best case: the month, the day the money runs out, and the unmet amount", () => {
		const model = fiModelOf(fiFixture(UNREACHABLE.insufficientMoney))
		if (model.kind !== "unreachable") throw new Error("expected an unreachable answer")
		expect(model.best).toEqual({
			kind: "runsOut",
			month: "Mar 2030",
			date: "1 Aug 2031",
			unmet: "900.00",
		})
	})

	test("reads a buffer-breach best case: the month, the breach day, and required against accessible", () => {
		const model = fiModelOf(fiFixture(UNREACHABLE.minimumBuffer))
		if (model.kind !== "unreachable") throw new Error("expected an unreachable answer")
		expect(model.best).toEqual({
			kind: "bufferBreach",
			month: "Apr 2030",
			date: "1 Sep 2030",
			required: "300000.00",
			accessible: "250000.00",
		})
	})
})
