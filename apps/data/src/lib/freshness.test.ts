import { describe, expect, test } from "bun:test"
import { freshness } from "./freshness"

const STALE_NOTE = "Uploads are paused, so the figures stop at the last update."

function health(minutesSinceIngest: number | null, stale = false) {
	return {
		lastIngestAt: "2026-11-25T18:14:56.000Z",
		minutesSinceIngest,
		stale,
	}
}

describe("the freshness label", () => {
	test("says when no ingest has arrived", () => {
		expect(freshness({ lastIngestAt: null, minutesSinceIngest: null, stale: true })).toEqual({
			label: "No ingest recorded yet",
			at: null,
			note: STALE_NOTE,
		})
	})

	test("has no note for a null age that is not stale", () => {
		expect(freshness({ lastIngestAt: null, minutesSinceIngest: null, stale: false })).toEqual({
			label: "No ingest recorded yet",
			at: null,
			note: null,
		})
	})

	test.each([
		[0, "Last updated 0 minutes ago"],
		[1, "Last updated 1 minute ago"],
		[59, "Last updated 59 minutes ago"],
		[60, "Last updated 1 hour ago"],
		[61, "Last updated 1 hour ago"],
		[119, "Last updated 1 hour ago"],
		[120, "Last updated 2 hours ago"],
		[47 * 60, "Last updated 47 hours ago"],
		[48 * 60, "Last updated 2 days ago"],
	])("turns %i minutes into %s", (minutes, label) => {
		expect(freshness(health(minutes))).toEqual({
			label,
			at: "2026-11-25 18:14 UTC",
			note: null,
		})
	})

	test("drops an invalid timestamp instead of slicing it", () => {
		expect(freshness({ lastIngestAt: "not-a-time", minutesSinceIngest: 10, stale: false })).toEqual(
			{
				label: "Last updated 10 minutes ago",
				at: null,
				note: null,
			},
		)
	})

	test("adds the paused note when the data is stale", () => {
		expect(freshness(health(214, true))).toEqual({
			label: "Last updated 3 hours ago",
			at: "2026-11-25 18:14 UTC",
			note: STALE_NOTE,
		})
	})
})
