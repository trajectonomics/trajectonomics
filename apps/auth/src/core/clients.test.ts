import { describe, expect, it } from "bun:test"
import { clientManifestProblems } from "./client-manifest"
import { DEVICE_CODE_GRANT_TYPE, OAUTH_CLIENTS } from "./clients"
import { DATA_AUDIENCE, OAUTH_RESOURCES, RELAY_AUDIENCE } from "./resources"

describe("OAUTH_CLIENTS", () => {
	it("has no manifest problems", () => {
		expect(clientManifestProblems()).toEqual([])
	})

	it("registers the collector as a public device client on the data audience", () => {
		const collector = OAUTH_CLIENTS.find((client) => client.clientId === "traj-data-collector")
		expect(collector).toBeDefined()
		expect(collector?.applicationType).toBe("native")
		expect(collector?.grantTypes).toContain(DEVICE_CODE_GRANT_TYPE)
		expect(collector?.grantTypes).toContain("refresh_token")
		expect(collector?.scopes).toEqual(["openid", "offline_access", "data:ingest"])
		expect(collector?.resource).toBe(DATA_AUDIENCE)
		expect(collector?.redirectUris).toEqual([])
	})

	it("registers the data site as a PKCE web client with the real callback", () => {
		const web = OAUTH_CLIENTS.find((client) => client.clientId === "traj-data-web")
		expect(web).toBeDefined()
		expect(web?.applicationType).toBe("web")
		expect(web?.grantTypes).toContain("authorization_code")
		expect(web?.scopes).toEqual(["openid", "profile", "email"])
		expect(web?.requirePkce).toBe(true)
		expect(web?.redirectUris).toEqual(["https://trajectonomics.com/data/auth/callback"])
		expect(web?.resource).toBe(DATA_AUDIENCE)
	})
})

describe("clientManifestProblems", () => {
	it("rejects two resources on one client by construction of the type", () => {
		const [collector] = OAUTH_CLIENTS
		expect(collector).toBeDefined()
		if (collector === undefined) return
		expect(
			clientManifestProblems([
				{ ...collector, clientId: "duplicate", resource: "https://unregistered.example" },
			]),
		).toContainEqual({
			clientId: "duplicate",
			problem: "resource https://unregistered.example is not registered",
		})
	})

	it("rejects a scope the resource does not allow", () => {
		const [collector] = OAUTH_CLIENTS
		expect(collector).toBeDefined()
		if (collector === undefined) return
		expect(
			clientManifestProblems([
				{ ...collector, clientId: "relay-collector", resource: RELAY_AUDIENCE },
			]),
		).toContainEqual({
			clientId: "relay-collector",
			problem: `scope data:ingest is not allowed for ${RELAY_AUDIENCE}`,
		})
	})

	it("keeps every client on exactly one registered resource", () => {
		const identifiers = new Set(OAUTH_RESOURCES.map((resource) => resource.identifier))
		for (const client of OAUTH_CLIENTS) {
			expect(identifiers.has(client.resource)).toBe(true)
		}
		expect(OAUTH_CLIENTS.every((client) => !client.resource.includes(" "))).toBe(true)
	})
})
