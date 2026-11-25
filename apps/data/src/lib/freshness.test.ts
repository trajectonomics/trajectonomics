import { describe, expect, test } from "bun:test"
import { freshness } from "./freshness"

describe("the freshness label", () => {
	test("says when no ingest has arrived", () => {
		expect(freshness({ lastIngestAt: null, minutesSinceIngest: null, stale: true })).toEqual({
			label: "No ingest recorded yet",
			note: "The data may be behind.",
		})
	})

	test("names one minute in the singular", () => {
		expect(
			freshness({
				lastIngestAt: "2026-11-25T12:33:56.000Z",
				minutesSinceIngest: 1,
				stale: false,
			}),
		).toEqual({ label: "Last updated 1 minute ago", note: null })
	})

	test("names any other count in the plural", () => {
		expect(
			freshness({
				lastIngestAt: "2026-11-25T11:52:56.000Z",
				minutesSinceIngest: 42,
				stale: false,
			}),
		).toEqual({ label: "Last updated 42 minutes ago", note: null })
	})

	test("adds a neutral note when the data is stale", () => {
		expect(
			freshness({
				lastIngestAt: "2026-11-25T09:00:00.000Z",
				minutesSinceIngest: 214,
				stale: true,
			}),
		).toEqual({
			label: "Last updated 214 minutes ago",
			note: "The data may be behind the latest ingest.",
		})
	})
})
