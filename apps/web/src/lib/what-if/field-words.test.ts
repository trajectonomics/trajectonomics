import { describe, expect, test } from "bun:test"
import { changesOf, startWhatIf, withSet } from "./session"

const HASH = `jcs1:sha256:${"ab".repeat(32)}`

describe("the What-if bar's words for a changed field", () => {
	test("names every field by the words its card uses, not by its key", () => {
		const labels = (path: string, value: Parameters<typeof withSet>[2]) =>
			changesOf(withSet(startWhatIf("base", HASH), path, value)).map((change) => change.label)
		expect(labels("flows.x.displayLabel", "Salary")).toEqual(["X name set to Salary"])
		expect(labels("flows.x.endAt", "ms")).toEqual(["X end set to ms"])
		expect(labels("flows.x.frequency", "monthly")).toEqual(["X how often set to monthly"])
		expect(labels("accounts.x.lockedUntil", "2033-09-15")).toEqual([
			"X locked until set to 2033-09-15",
		])
		expect(labels("flows.x.source", "cash")).toEqual(["X move from set to cash"])
		expect(labels("flows.x.startAt", "ms")).toEqual(["X start set to ms"])
		expect(labels("flows.x.target", "fund")).toEqual(["X move to set to fund"])
	})

	test("names the employer share's account as its form does, and its share in the card's percent", () => {
		const labels = (path: string, value: Parameters<typeof withSet>[2]) =>
			changesOf(withSet(startWhatIf("base", HASH), path, value), new Set(["salary-employer"])).map(
				(change) => change.label,
			)
		expect(labels("flows.salary-employer.target", "fund")).toEqual([
			"Salary-employer account set to fund",
		])
		const share = {
			measures: [
				{ id: "pay", op: "flow", flow: "salary" },
				{ id: "share", op: "scale", of: "pay", num: 700, den: 10000, rounding: "floor" },
			],
			result: "share",
		}
		expect(labels("flows.salary-employer.derive", share)).toEqual([
			"Salary-employer share set to 7.00%",
		])
		// A derive that is not an employer's share keeps its JSON: the bar never guesses what a rule means.
		expect(labels("flows.x.derive", { measures: [], result: "none" })).toEqual([
			'X share set to {"measures":[],"result":"none"}',
		])
	})

	test("names an employer share only when the plan's own shape says so, never by an id's ending", () => {
		const label = (id: string) =>
			changesOf(
				withSet(startWhatIf("base", HASH), `flows.${id}.target`, "fund"),
				new Set(["salary-employer"]),
			)[0]?.label
		expect(label("salary-employer")).toBe("Salary-employer account set to fund")
		expect(label("paid-by-employer")).toBe("Paid-by-employer move to set to fund")
	})

	test("words a transfer's derive as its card moves it, not as JSON", () => {
		const labels = (value: Parameters<typeof withSet>[2]) =>
			changesOf(withSet(startWhatIf("base", HASH), "flows.move.derive", value)).map(
				(change) => change.label,
			)
		expect(
			labels({ measures: [{ id: "held", op: "account", account: "cash" }], result: "held" }),
		).toEqual(["Move share set to all of the source"])
		const part = {
			measures: [
				{ id: "held", op: "account", account: "cash" },
				{ id: "part", op: "scale", of: "held", num: 1500, den: 10000, rounding: "floor" },
			],
			result: "part",
		}
		expect(labels(part)).toEqual(["Move share set to 15% of the source"])
	})

	test("says a gain's tax flag in words, and a rate or swing in the percent its field holds", () => {
		const labels = (path: string, value: Parameters<typeof withSet>[2]) =>
			changesOf(withSet(startWhatIf("base", HASH), path, value)).map((change) => change.label)
		expect(labels("flows.x.realise", true)).toEqual(["X count any gain for tax: on"])
		expect(labels("flows.x.realise", false)).toEqual(["X count any gain for tax: off"])
		expect(labels("accounts.x.volatility", 1500)).toEqual(["X swing set to 15.00%"])
		expect(labels("accounts.fund.rate", 700)).toEqual(["Fund rate set to 7.00%"])
		expect(labels("economy.inflation", 300)).toEqual(["Inflation set to 3.00%"])
		expect(labels("flows.x.growth", { bps: 300 })).toEqual(["X growth set to 3.00%"])
	})
})
