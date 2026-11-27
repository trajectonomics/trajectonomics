import { describe, expect, it } from "bun:test"
import {
	grantLifetimeRejection,
	mergeResourceSources,
	refreshResourceRejection,
	resourceParameterRejection,
	resourceValues,
} from "./resource-request"

describe("resourceParameterRejection", () => {
	it("allows zero or one resource value", () => {
		expect(resourceParameterRejection([])).toBeNull()
		expect(resourceParameterRejection(["https://relay.trajectonomics.com"])).toBeNull()
	})

	it("rejects a repeated resource parameter and a JSON array", () => {
		expect(
			resourceParameterRejection([
				"https://trajectonomics.com/data",
				"https://relay.trajectonomics.com",
			]),
		).toBe("multiple-resources")
		expect(
			resourceParameterRejection([
				"https://trajectonomics.com/data",
				"https://trajectonomics.com/data",
			]),
		).toBe("multiple-resources")
	})
})

describe("refreshResourceRejection", () => {
	const data = "https://trajectonomics.com/data"
	const relay = "https://relay.trajectonomics.com"

	it("allows a refresh that keeps the grant's resource or asks for none", () => {
		expect(refreshResourceRejection({ requested: [], granted: [data] })).toBeNull()
		expect(refreshResourceRejection({ requested: [data], granted: [data] })).toBeNull()
	})

	it("rejects adding a resource to a grant that had none", () => {
		expect(refreshResourceRejection({ requested: [data], granted: null })).toBe("resource-widening")
		expect(refreshResourceRejection({ requested: [data], granted: [] })).toBe("resource-widening")
		expect(refreshResourceRejection({ requested: [data], granted: undefined })).toBe(
			"resource-widening",
		)
	})

	it("rejects widening from data to relay", () => {
		expect(refreshResourceRejection({ requested: [relay], granted: [data] })).toBe(
			"resource-widening",
		)
		expect(refreshResourceRejection({ requested: [data, relay], granted: [data] })).toBe(
			"resource-widening",
		)
	})
})

describe("grantLifetimeRejection", () => {
	const approvedAt = new Date("2026-01-01T00:00:00.000Z")
	const lifetimeSeconds = 90 * 24 * 60 * 60

	it("allows a grant inside its absolute lifetime", () => {
		expect(
			grantLifetimeRejection({
				approvedAt,
				now: new Date("2026-03-31T00:00:00.000Z"),
				lifetimeSeconds,
			}),
		).toBeNull()
	})

	it("rejects a grant at or past the boundary", () => {
		expect(
			grantLifetimeRejection({
				approvedAt,
				now: new Date("2026-04-01T00:00:00.000Z"),
				lifetimeSeconds,
			}),
		).toBe("grant-expired")
		expect(
			grantLifetimeRejection({
				approvedAt,
				now: new Date("2026-04-02T00:00:00.000Z"),
				lifetimeSeconds,
			}),
		).toBe("grant-expired")
	})

	it("fails closed when the approval record is missing", () => {
		expect(grantLifetimeRejection({ approvedAt: null, now: approvedAt, lifetimeSeconds })).toBe(
			"grant-unknown",
		)
		expect(
			grantLifetimeRejection({ approvedAt: undefined, now: approvedAt, lifetimeSeconds }),
		).toBe("grant-unknown")
	})
})

describe("resourceValues", () => {
	it("normalizes the three shapes the endpoints accept", () => {
		expect(resourceValues(undefined)).toEqual([])
		expect(resourceValues("")).toEqual([])
		expect(resourceValues("https://relay.trajectonomics.com")).toEqual([
			"https://relay.trajectonomics.com",
		])
		expect(
			resourceValues(["https://trajectonomics.com/data", "https://relay.trajectonomics.com"]),
		).toEqual(["https://trajectonomics.com/data", "https://relay.trajectonomics.com"])
	})

	it("drops non-strings and empty entries", () => {
		expect(resourceValues([1, "", null, "https://relay.trajectonomics.com"])).toEqual([
			"https://relay.trajectonomics.com",
		])
	})
})

describe("mergeResourceSources", () => {
	const data = "https://trajectonomics.com/data"
	const relay = "https://relay.trajectonomics.com"

	it("counts one value seen through the raw and parsed view of the same source once", () => {
		expect(mergeResourceSources([[data], [data]])).toEqual([data])
		expect(mergeResourceSources([[], [data], [], [data]])).toEqual([data])
	})

	it("keeps a value repeated inside one source", () => {
		expect(mergeResourceSources([[data, data], [data]])).toEqual([data, data])
		expect(mergeResourceSources([[data], [data, data]])).toEqual([data, data])
	})

	it("keeps both values when two sources disagree", () => {
		expect(mergeResourceSources([[data], [], [], [relay]])).toEqual([data, relay])
		expect(mergeResourceSources([[data], [data], [data, relay], [data]])).toEqual([data, relay])
	})

	it("leaves a smuggled JSON array above the one-resource limit", () => {
		expect(resourceParameterRejection(mergeResourceSources([[data], [], [data, relay], []]))).toBe(
			"multiple-resources",
		)
	})
})
