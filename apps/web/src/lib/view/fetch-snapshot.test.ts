import { describe, expect, test } from "bun:test"
import { type FetchedText, fetchSnapshot } from "./fetch-snapshot"

const URL = "/snapshot.json"

function response(status: number, body: string): FetchedText {
	return { ok: status >= 200 && status < 300, status, text: async () => body }
}

describe("fetchSnapshot: a missing file", () => {
	test("a 200 whose body is the app's HTML is a missing Snapshot, not an invalid one", async () => {
		// `vite preview` answers a path it does not serve with its index.html and status 200.
		const html = "<!doctype html><html><body>Dashboard</body></html>"
		const state = await fetchSnapshot(URL, async () => response(200, html))
		expect(state).toEqual({ status: "missing", url: URL })
	})

	test("an empty 200 body is a missing Snapshot", async () => {
		expect(await fetchSnapshot(URL, async () => response(200, ""))).toEqual({
			status: "missing",
			url: URL,
		})
	})

	test("a 404 is a missing Snapshot", async () => {
		expect(await fetchSnapshot(URL, async () => response(404, ""))).toEqual({
			status: "missing",
			url: URL,
		})
	})

	test("a JSON body that is not a Snapshot is still an invalid Snapshot", async () => {
		const state = await fetchSnapshot(URL, async () => response(200, '{"hello":"world"}'))
		expect(state).toMatchObject({ status: "invalid", url: URL })
	})

	test("a file cut short is an invalid Snapshot, so a broken write is not read as no file", async () => {
		const state = await fetchSnapshot(URL, async () => response(200, '{"snapshotVersion": 1, "par'))
		expect(state).toMatchObject({ status: "invalid", url: URL })
	})
})
