import { describe, expect, test } from "bun:test"
import type { Collector } from "../core/collectors"
import {
	collectorState,
	collectorsAriaLabel,
	collectorsGeometry,
	exactMinute,
	relativeAge,
} from "./collectors"

const NOW_MS = Date.parse("2026-11-25T12:34:56.000Z")
const HOUR_MS = 3_600_000

function collector(overrides: Partial<Collector> = {}): Collector {
	return {
		machine: "machine-a",
		firstDay: "2026-11-20",
		lastDay: "2026-11-24",
		rows: 10,
		lastSendAt: "2026-11-25T12:22:56.000Z",
		...overrides,
	}
}

function ago(ms: number): string {
	return new Date(NOW_MS - ms).toISOString()
}

describe("collectorState", () => {
	test("is ok under two hours", () => {
		expect(collectorState(ago(2 * HOUR_MS - 1), NOW_MS)).toBe("ok")
	})

	test("is late at exactly two hours", () => {
		expect(collectorState(ago(2 * HOUR_MS), NOW_MS)).toBe("late")
	})

	test("is late under 26 hours", () => {
		expect(collectorState(ago(26 * HOUR_MS - 1), NOW_MS)).toBe("late")
	})

	test("is stopped at exactly 26 hours", () => {
		expect(collectorState(ago(26 * HOUR_MS), NOW_MS)).toBe("stopped")
	})

	test("is stopped for an unreadable time", () => {
		expect(collectorState("not-a-time", NOW_MS)).toBe("stopped")
	})
})

describe("relativeAge", () => {
	test.each([
		[12 * 60_000, "12 min ago"],
		[0, "0 min ago"],
		[59 * 60_000, "59 min ago"],
		[60 * 60_000, "1 h ago"],
		[3 * HOUR_MS, "3 h ago"],
		[47 * HOUR_MS, "47 h ago"],
		[48 * HOUR_MS, "2 d ago"],
	])("writes %i ms as %s", (age, label) => {
		expect(relativeAge(ago(age), NOW_MS)).toBe(label)
	})

	test("never goes below zero", () => {
		expect(relativeAge(new Date(NOW_MS + HOUR_MS).toISOString(), NOW_MS)).toBe("0 min ago")
	})

	test("says unknown for an unreadable time", () => {
		expect(relativeAge("not-a-time", NOW_MS)).toBe("unknown")
	})
})

describe("collectorsGeometry", () => {
	test("has nothing to draw without a collector", () => {
		expect(collectorsGeometry([], NOW_MS)).toBeNull()
	})

	test("runs the shared axis from the earliest first day to today", () => {
		const geometry = collectorsGeometry(
			[
				collector({ machine: "machine-b", firstDay: "2026-11-22", lastDay: "2026-11-25" }),
				collector({ machine: "machine-a" }),
			],
			NOW_MS,
		)
		if (geometry === null) throw new Error("no geometry")
		expect(geometry.from).toBe("2026-11-20")
		expect(geometry.to).toBe("2026-11-25")
		const a = geometry.bars.find((bar) => bar.machine === "machine-a")
		const b = geometry.bars.find((bar) => bar.machine === "machine-b")
		expect(a?.start).toBeCloseTo(0, 6)
		expect(a?.end).toBeCloseTo(5 / 6, 6)
		expect(b?.start).toBeCloseTo(2 / 6, 6)
		expect(b?.end).toBeCloseTo(1, 6)
	})

	test("gives a one-day collector a whole day", () => {
		const geometry = collectorsGeometry(
			[collector({ firstDay: "2026-11-25", lastDay: "2026-11-25" })],
			NOW_MS,
		)
		if (geometry === null) throw new Error("no geometry")
		expect(geometry.bars[0]?.start).toBeCloseTo(0, 6)
		expect(geometry.bars[0]?.end).toBeCloseTo(1, 6)
	})

	test("clamps a span beyond today's axis end to the axis's end", () => {
		const geometry = collectorsGeometry(
			[
				collector({ machine: "machine-a", firstDay: "2026-11-20", lastDay: "2026-11-20" }),
				collector({
					machine: "machine-b",
					firstDay: "2026-12-10",
					lastDay: "2026-12-10",
				}),
			],
			NOW_MS,
		)
		if (geometry === null) throw new Error("no geometry")
		expect(geometry.bars[1]?.start).toBe(1)
		expect(geometry.bars[1]?.end).toBe(1)
		// The minimum width stays on the axis instead of being clipped past its end.
		expect(geometry.bars[1]?.width).toBe(0.01)
		expect(geometry.bars[1]?.left).toBeCloseTo(0.99, 10)
	})

	test("carries the state and age onto each bar", () => {
		const geometry = collectorsGeometry([collector()], NOW_MS)
		if (geometry === null) throw new Error("no geometry")
		expect(geometry.bars[0]?.state).toBe("ok")
		expect(geometry.bars[0]?.ageLabel).toBe("12 min ago")
	})
})

describe("collectorsAriaLabel", () => {
	test("counts the collectors and the fresh ones", () => {
		const geometry = collectorsGeometry(
			[
				collector({ machine: "machine-a" }),
				collector({ machine: "machine-b" }),
				collector({ machine: "machine-c", lastSendAt: ago(30 * HOUR_MS) }),
			],
			NOW_MS,
		)
		if (geometry === null) throw new Error("no geometry")
		expect(collectorsAriaLabel(geometry.bars)).toBe("3 collectors; 2 sent in the last 2 hours")
	})
})

describe("exactMinute", () => {
	test("writes the exact UTC minute", () => {
		expect(exactMinute("2026-11-25T12:22:56.000Z")).toBe("2026-11-25 12:22 UTC")
	})

	test("leaves an unreadable value alone", () => {
		expect(exactMinute("not-a-time")).toBe("not-a-time")
	})
})
