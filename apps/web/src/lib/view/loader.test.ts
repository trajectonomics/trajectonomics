import { describe, expect, test } from "bun:test"
import type { FetchedText } from "./fetch-snapshot"
import { createSnapshotLoader } from "./loader"

const DEMO_TEXT = await Bun.file(`${import.meta.dir}/../../../public/demo/snapshot.json`).text()

function response(status: number, body: string): FetchedText {
	return { ok: status >= 200 && status < 300, status, text: async () => body }
}

/** A fetcher where `/snapshot.json` is missing and `/demo/snapshot.json` is the Demo snapshot. */
function fetcher(calls: string[]) {
	return async (url: string): Promise<FetchedText> => {
		calls.push(url)
		return url === "/demo/snapshot.json" ? response(200, DEMO_TEXT) : response(404, "")
	}
}

describe("a loader that is asked for another URL", () => {
	test("shows the Demo snapshot after the missing one, which is what the demo link does", async () => {
		const loader = createSnapshotLoader(fetcher([]))
		await loader.load("/snapshot.json")
		expect(loader.current().status).toBe("missing")
		await loader.load("/demo/snapshot.json")
		expect(loader.current().status).toBe("ready")
	})

	test("going back to a URL it has read shows that result again without a second read", async () => {
		const calls: string[] = []
		const loader = createSnapshotLoader(fetcher(calls))
		await loader.load("/snapshot.json")
		await loader.load("/demo/snapshot.json")
		await loader.load("/snapshot.json")
		expect(loader.current()).toEqual({ status: "missing", url: "/snapshot.json" })
		expect(calls).toEqual(["/snapshot.json", "/demo/snapshot.json"])
	})

	test("a slower read of an earlier URL does not replace the one asked for last", async () => {
		let release: (value: FetchedText) => void = () => {}
		const slow = new Promise<FetchedText>((resolve) => {
			release = resolve
		})
		const loader = createSnapshotLoader(async (url) =>
			url === "/snapshot.json" ? slow : response(200, DEMO_TEXT),
		)
		const first = loader.load("/snapshot.json")
		await loader.load("/demo/snapshot.json")
		release(response(404, ""))
		await first
		expect(loader.current().status).toBe("ready")
	})

	test("says it is loading while the new URL is read", async () => {
		const loader = createSnapshotLoader(fetcher([]))
		await loader.load("/snapshot.json")
		const seen: string[] = []
		loader.subscribe(() => seen.push(loader.current().status))
		await loader.load("/demo/snapshot.json")
		expect(seen).toEqual(["loading", "ready"])
	})
})
