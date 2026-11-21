import { describe, expect, test } from "bun:test"
import { type Snapshot, snapshot as snapshotSchema } from "../contract"
import { type FetchedText, fetchSnapshot } from "./fetch-snapshot"
import { headerLine } from "./header"
import { withSearch } from "./links"
import { createSnapshotLoader } from "./loader"
import { netWorthHistorySeries } from "./overview/net-worth-history"
import { parseSnapshotText } from "./parse-snapshot"
import { parseHideAmounts, resolveTheme, serializeHideAmounts } from "./preferences"
import { DEMO_SNAPSHOT_PATH, isDemo, SNAPSHOT_PATH, snapshotUrl } from "./snapshot-url"

const DEMO_TEXT = await Bun.file(`${import.meta.dir}/../../../public/demo/snapshot.json`).text()
const DEMO: Snapshot = snapshotSchema.parse(JSON.parse(DEMO_TEXT))

function response(status: number, body: string): FetchedText {
	return { ok: status >= 200 && status < 300, status, text: async () => body }
}

describe("snapshotUrl", () => {
	test("reads the Demo snapshot only when the query says demo=1", () => {
		expect(isDemo("?demo=1")).toBe(true)
		expect(isDemo("?demo=0")).toBe(false)
		expect(isDemo("")).toBe(false)
		expect(snapshotUrl("?demo=1&x=2")).toBe(DEMO_SNAPSHOT_PATH)
		expect(snapshotUrl("")).toBe(SNAPSHOT_PATH)
	})
})

describe("withSearch", () => {
	test("keeps the query string on a path, and leaves a path alone without one", () => {
		expect(withSearch("/net-worth/", "?demo=1")).toBe("/net-worth/?demo=1")
		expect(withSearch("/net-worth/", "")).toBe("/net-worth/")
		expect(withSearch("/a/?x=1", "?demo=1")).toBe("/a/?x=1&demo=1")
	})
})

describe("parseSnapshotText", () => {
	test("accepts the committed Demo snapshot", () => {
		expect(parseSnapshotText(DEMO_TEXT).ok).toBe(true)
	})

	test("names the version of a Snapshot this Dashboard does not read", () => {
		const result = parseSnapshotText(JSON.stringify({ snapshotVersion: 2 }))
		expect(result.ok).toBe(false)
		if (!result.ok) expect(result.reason).toContain("Snapshot version 2")
	})

	test("says a file that is not JSON is not JSON", () => {
		const result = parseSnapshotText("<html>")
		expect(result.ok).toBe(false)
		if (!result.ok) expect(result.reason).toStartWith("is not JSON")
	})

	test("names the path of the first field that breaks the contract", () => {
		const broken = JSON.parse(DEMO_TEXT)
		broken.reads.netWorth.data.totals[0].amount = 1082000
		const result = parseSnapshotText(JSON.stringify(broken))
		expect(result.ok).toBe(false)
		if (!result.ok)
			expect(result.details.join("\n")).toContain("reads.netWorth.data.totals.0.amount")
	})
})

describe("fetchSnapshot", () => {
	test("reports a 404 as a missing Snapshot", async () => {
		const state = await fetchSnapshot("/snapshot.json", async () => response(404, ""))
		expect(state).toEqual({ status: "missing", url: "/snapshot.json" })
	})

	test("reports a failed request as invalid, with its status", async () => {
		const state = await fetchSnapshot("/snapshot.json", async () => response(500, ""))
		expect(state).toMatchObject({ status: "invalid", reason: "could not be read (HTTP 500)" })
	})

	test("reports a network failure as invalid rather than throwing", async () => {
		const state = await fetchSnapshot("/snapshot.json", async () => {
			throw new Error("offline")
		})
		expect(state).toMatchObject({ status: "invalid" })
	})

	test("reads the Demo snapshot as ready", async () => {
		const state = await fetchSnapshot(DEMO_SNAPSHOT_PATH, async () => response(200, DEMO_TEXT))
		expect(state.status).toBe("ready")
	})
})

describe("createSnapshotLoader", () => {
	test("reads one URL once, however many islands ask for it", async () => {
		let calls = 0
		const loader = createSnapshotLoader(async () => {
			calls += 1
			return response(200, DEMO_TEXT)
		})
		const [first, second] = await Promise.all([loader.load("/d.json"), loader.load("/d.json")])
		expect(calls).toBe(1)
		expect(first).toBe(second)
		expect(loader.current().status).toBe("ready")
	})

	test("tells its listeners when the read settles", async () => {
		const loader = createSnapshotLoader(async () => response(404, ""))
		let heard = 0
		const stop = loader.subscribe(() => {
			heard += 1
		})
		await loader.load("/snapshot.json")
		stop()
		expect(heard).toBe(1)
		expect(loader.current()).toEqual({ status: "missing", url: "/snapshot.json" })
	})
})

describe("header and overview view models, on the Demo snapshot", () => {
	test("states the As-of, the currency and the traj version", () => {
		expect(headerLine(DEMO)).toEqual({ asOf: "31 Oct 2026", currency: "THB", cliVersion: "0.0.0" })
	})

	test("charts month-end net worth from the CLI's strings, one point per month", () => {
		const series = netWorthHistorySeries(DEMO.reads.netWorthHistory)
		expect(series.points).toHaveLength(24)
		expect(series.points.at(-1)).toEqual({
			x: 23,
			xLabel: "Oct 2026",
			y: 1082000,
			display: "1,082,000.00",
		})
	})
})

describe("preferences", () => {
	test("follows the system until a Theme is stored", () => {
		expect(resolveTheme(null, true)).toBe("dark")
		expect(resolveTheme(null, false)).toBe("light")
		expect(resolveTheme("light", true)).toBe("light")
		expect(resolveTheme("sepia", true)).toBe("dark")
	})

	test("hides amounts only when the stored value is 1", () => {
		expect(parseHideAmounts("1")).toBe(true)
		expect(parseHideAmounts("0")).toBe(false)
		expect(parseHideAmounts(null)).toBe(false)
		expect(serializeHideAmounts(true)).toBe("1")
	})
})
