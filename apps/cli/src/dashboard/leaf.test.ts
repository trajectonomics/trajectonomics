import { describe, expect, it } from "bun:test"
import type { DashboardStart, ErrorBody, Snapshot } from "@trajectonomics/web/serve"
import { defineGroup } from "../command"
import { capture, errorOf } from "../test-support"
import { DEFAULT_PORT, dashboardLeaf } from "./leaf"
import type { DashboardDeps } from "./run"

type Started = Parameters<DashboardDeps["start"]>[0]

const read = (argv: string[], ok: boolean) => ({ argv, ok })
const single = (leaf: string) => read([leaf, "--json"], true)
const SNAPSHOT = {
	reads: {
		doctor: single("doctor"),
		accounts: single("account"),
		balance: single("balance"),
		netWorth: single("report"),
		pnl: single("report"),
		transactions: single("tx"),
		baseline: single("baseline"),
		scenarios: single("scenario"),
		netWorthHistory: [read(["report", "networth", "--json"], true)],
		projections: {
			base: read(["projection", "run", "--scenario", "base", "--breakdown", "--json"], false),
		},
		fi: { ok: read(["fi", "--scenario", "ok", "--json"], true) },
		compare: null,
		chance: {},
		documents: {},
	},
} as unknown as Snapshot

/** A root holding only the leaf, whose start answers `start` and whose stop is immediate. */
function harness(start: DashboardStart) {
	const calls: Started[] = []
	const stops: string[] = []
	const leaf = dashboardLeaf({
		start: async (options) => {
			calls.push(options)
			return start
		},
		untilStopped: async () => {
			stops.push("stopped")
		},
	})
	return { root: defineGroup({ name: "traj", summary: "test", children: [leaf] }), calls, stops }
}

const SERVED: DashboardStart = {
	ok: true,
	server: { url: "http://127.0.0.1:4321/", snapshot: SNAPSHOT, stop: async () => {} },
}
const DATES = ["--as-of", "2026-11-30", "--horizon", "2056-11-30"]

describe("traj dashboard", () => {
	it("serves until stopped, says where on stderr, then prints what it served", async () => {
		const { root, calls, stops } = harness(SERVED)
		const res = await capture(["dashboard", ...DATES, "--json"], {}, root)
		expect(res.code).toBe(0)
		expect(res.err).toBe("The Dashboard is on http://127.0.0.1:4321/ . Press Ctrl-C to stop.")
		expect(stops).toEqual(["stopped"])
		expect(JSON.parse(res.out)).toEqual({
			url: "http://127.0.0.1:4321/",
			asOf: "2026-11-30",
			horizon: "2056-11-30",
			reads: 11,
			failedReads: ["traj projection run --scenario base --breakdown --json"],
		})
		expect(calls[0]?.port).toBe(DEFAULT_PORT)
		expect(calls[0]?.params.compare).toBeNull()
	})

	it("passes the Scenarios, the compare pair, the ages and the port to the Plan", async () => {
		const { root, calls } = harness(SERVED)
		const argv = ["--scenario", "base", "--compare", "base", "--compare", "lean"]
		const more = ["--birth-date", "1990-01-01", "--age", "45", "--monthly", "--port", "0"]
		await capture(["dashboard", ...DATES, ...argv, ...more, "--json"], {}, root)
		expect(calls[0]?.port).toBe(0)
		expect(calls[0]?.params).toMatchObject({
			scenarios: ["base"],
			compare: { a: "base", b: "lean" },
			birthDate: "1990-01-01",
			ages: [45],
			monthly: true,
		})
	})

	it("refuses a compare with one name before it reads anything", async () => {
		const { root, calls } = harness(SERVED)
		const res = await capture(["dashboard", ...DATES, "--compare", "base", "--json"], {}, root)
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({ code: "invalid_input", path: "--compare" })
		expect(calls).toEqual([])
	})

	it("refuses a horizon before the As-of with the Plan's sentence", async () => {
		const { root } = harness(SERVED)
		const argv = ["dashboard", "--as-of", "2026-11-30", "--horizon", "2026-01-01", "--json"]
		const res = await capture(argv, {}, root)
		expect(errorOf(res)).toMatchObject({
			code: "invalid_input",
			message: "--horizon must not be before --as-of.",
		})
	})

	it("keeps a stage-one read's own failure, such as a missing ledger", async () => {
		const error: ErrorBody = {
			code: "ledger_missing",
			exitCode: 4,
			message: "No ledger.",
			hint: "traj init",
		}
		const { root, stops } = harness({ ok: false, error })
		const res = await capture(["dashboard", ...DATES, "--json"], {}, root)
		expect(res.code).toBe(4)
		expect(errorOf(res)).toMatchObject({
			code: "ledger_missing",
			message: "No ledger.",
			hint: "traj init",
		})
		expect(stops).toEqual([])
	})

	it("refuses a port outside 0 to 65535 before it reads anything", async () => {
		const { root, calls } = harness(SERVED)
		const res = await capture(["dashboard", ...DATES, "--port", "70000", "--json"], {}, root)
		expect(errorOf(res)).toMatchObject({ code: "invalid_input", path: "--port" })
		expect(calls).toEqual([])
	})

	it("turns a taken port into invalid input on --port", async () => {
		const error: ErrorBody = { code: "port_unavailable", exitCode: 2, message: "In use." }
		const { root } = harness({ ok: false, error })
		const res = await capture(["dashboard", ...DATES, "--json"], {}, root)
		expect(errorOf(res)).toMatchObject({
			code: "invalid_input",
			path: "--port",
			message: "In use.",
		})
	})
})
