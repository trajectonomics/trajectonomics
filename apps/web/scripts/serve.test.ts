import { describe, expect, test } from "bun:test"
import { respond } from "./serve"

const PACK = new Map([
	["/index.html", new TextEncoder().encode("<html>home</html>")],
	["/net-worth/index.html", new TextEncoder().encode("<html>nw</html>")],
	["/_app/app.js", new TextEncoder().encode("export {}")],
])
const SNAPSHOT = '{"snapshotVersion":1}'

/** A request as a browser on this machine sends it, Host header included. */
function get(path: string, init: RequestInit = {}): Response {
	const headers = { host: "127.0.0.1:4321" }
	const request = new Request(`http://127.0.0.1:4321${path}`, { ...init, headers })
	return respond(request, PACK, SNAPSHOT, 4321)
}

describe("respond", () => {
	test("serves the Snapshot and the packed pages with their types", async () => {
		const snapshot = get("/snapshot.json")
		expect(await snapshot.text()).toBe(SNAPSHOT)
		expect(snapshot.headers.get("cache-control")).toBe("no-store")
		expect(await get("/").text()).toBe("<html>home</html>")
		expect(await get("/net-worth").text()).toBe("<html>nw</html>")
		expect(get("/_app/app.js").headers.get("content-type")).toBe("text/javascript; charset=utf-8")
	})

	test("answers a missing file 404, a write 405 and another Host 403", () => {
		expect(get("/nope").status).toBe(404)
		expect(get("/snapshot.json", { method: "POST" }).status).toBe(405)
		const rebound = new Request("http://evil.example:4321/snapshot.json", {
			headers: { host: "evil.example:4321" },
		})
		expect(respond(rebound, PACK, SNAPSHOT, 4321).status).toBe(403)
	})
})
