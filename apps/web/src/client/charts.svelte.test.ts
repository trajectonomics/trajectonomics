import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { CHARTS_KEY, serializeCharts } from "../lib/view/charts/stored"
import type { ChartDef } from "../lib/view/charts/types"
import { chartStore } from "./charts.svelte"

// `window` is stubbed here and put back in afterAll: a stub that leaked would change every later test file.
const SAVED = Object.getOwnPropertyDescriptor(globalThis, "window")

const CHART: ChartDef = {
	id: "spend",
	name: "Spend",
	kind: "stacked-bars",
	series: ["income", "tax:th:due"],
}

function stubStorage(store: Map<string, string> | null): void {
	const localStorage = {
		getItem: (key: string) => {
			if (store === null) throw new Error("blocked")
			return store.get(key) ?? null
		},
		setItem: (key: string, value: string) => {
			if (store === null) throw new Error("blocked")
			store.set(key, value)
		},
	}
	Object.defineProperty(globalThis, "window", {
		value: { localStorage },
		configurable: true,
		writable: true,
	})
}

beforeEach(() => {
	chartStore.charts = []
	chartStore.problem = null
	chartStore.unsaved = false
	chartStore.notice = null
})

afterAll(() => {
	if (SAVED === undefined) Reflect.deleteProperty(globalThis, "window")
	else Object.defineProperty(globalThis, "window", SAVED)
})

describe("the chart store", () => {
	test("a chart is kept in storage and read back", () => {
		const store = new Map<string, string>()
		stubStorage(store)
		expect(chartStore.save(CHART)).toBe(true)
		expect(chartStore.unsaved).toBe(false)
		expect(store.get(CHARTS_KEY)).toBe(serializeCharts([CHART]))
		chartStore.charts = []
		chartStore.sync()
		expect(chartStore.charts).toEqual([CHART])
	})

	test("with storage unavailable the chart still shows, and the page says it is not kept", () => {
		stubStorage(null)
		chartStore.sync()
		expect(chartStore.charts).toEqual([])
		expect(chartStore.problem).toBeNull()
		expect(chartStore.save(CHART)).toBe(true)
		expect(chartStore.charts).toEqual([CHART])
		expect(chartStore.unsaved).toBe(true)
	})

	test("saved text that cannot be read is no charts and says why", () => {
		stubStorage(new Map([[CHARTS_KEY, "{"]]))
		chartStore.sync()
		expect(chartStore.charts).toEqual([])
		expect(chartStore.problem).toContain("could not be read")
	})

	test("duplicating and deleting change the list", () => {
		stubStorage(new Map())
		chartStore.save(CHART)
		expect(chartStore.duplicate("spend")).toBe("spend-2")
		expect(chartStore.charts.map((chart) => chart.name)).toEqual(["Spend", "Spend (copy)"])
		chartStore.remove("spend")
		expect(chartStore.charts.map((chart) => chart.id)).toEqual(["spend-2"])
	})

	test("a bad file is refused and changes nothing; a good one is taken in", async () => {
		stubStorage(new Map())
		await chartStore.importFile(new File(["nope"], "x.json"))
		expect(chartStore.notice).toContain("not a chart file")
		expect(chartStore.charts).toEqual([])
		await chartStore.importFile(new File([serializeCharts([CHART])], "charts.json"))
		expect(chartStore.notice).toBe("Imported 1 chart.")
		expect(chartStore.charts).toEqual([CHART])
	})
})
