import { describe, expect, it } from "bun:test"
import { DATA_AUDIENCE, OAUTH_RESOURCES, RELAY_AUDIENCE } from "./resources"

describe("OAUTH_RESOURCES", () => {
	it("allows data:ingest only on the data audience", () => {
		const data = OAUTH_RESOURCES.find((resource) => resource.identifier === DATA_AUDIENCE)
		const relay = OAUTH_RESOURCES.find((resource) => resource.identifier === RELAY_AUDIENCE)
		expect(data?.allowedScopes).toContain("data:ingest")
		expect(relay?.allowedScopes).not.toContain("data:ingest")
	})

	it("uses the data site's real home as the data audience", () => {
		expect(DATA_AUDIENCE).toBe("https://trajectonomics.com/data")
	})
})
