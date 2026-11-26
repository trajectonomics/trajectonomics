import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import type { Component } from "svelte"
import { render } from "svelte/server"
import { setTestUrl } from "../../scripts/svelte/app-stub"
import { snapshotLoader } from "../client/browser"
import { replaceSnapshot } from "../client/snapshot.svelte"
import { useSessionHooks } from "../client/what-if.test-support"
import { outsideDetails } from "../lib/view/details.test-support"
import { LOADING } from "../lib/view/state"
import { DEMO } from "../lib/view/what-if/fixtures.test-support"

useSessionHooks()

// The Snapshot store is shared by every test file in the process, so it is put back as it was.
afterAll(() => {
	snapshotLoader.replace(LOADING)
	setTestUrl("http://127.0.0.1/")
})

beforeEach(() => replaceSnapshot(DEMO))

const ROUTES = import.meta.dir

/** Every page under src/routes, as the path it is served at ("/", "/tax/"). */
function pagesUnder(directory: string, path: string): { path: string; file: string }[] {
	const found: { path: string; file: string }[] = []
	for (const entry of readdirSync(directory)) {
		const child = join(directory, entry)
		if (entry === "+page.svelte") found.push({ path, file: child })
		else if (statSync(child).isDirectory()) found.push(...pagesUnder(child, `${path}${entry}/`))
	}
	return found
}

const PAGES = pagesUnder(ROUTES, "/").sort((a, b) => a.path.localeCompare(b.path))

/** Every content hash in the Demo Snapshot, full and as the page shortens it to twelve characters. */
function hashesOf(snapshot: unknown): string[] {
	const found = new Set<string>()
	for (const match of JSON.stringify(snapshot).matchAll(/jcs\d*:sha256:([0-9a-f]+)/g)) {
		found.add(match[0])
		found.add((match[1] ?? "").slice(0, 12))
	}
	return [...found]
}

const HASHES = hashesOf(DEMO)

describe("every page of the Demo keeps its provenance behind Details", () => {
	for (const page of PAGES) {
		test(`${page.path} shows no hash, definition version or basis-point figure outside Details`, async () => {
			setTestUrl(`http://127.0.0.1${page.path}?demo=1`)
			const module = (await import(pathToFileURL(page.file).href)) as { default: Component }
			const outside = outsideDetails(render(module.default).body)
			for (const hash of HASHES) {
				expect(outside, `${page.path} shows the hash ${hash}`).not.toContain(hash)
			}
			expect(outside, `${page.path} names a definition version`).not.toContain("Definition version")
			expect(outside, `${page.path} states a basis-point figure`).not.toContain("basis points")
		})
	}

	test("the guard covers the pages the issue names", () => {
		const paths = PAGES.map((page) => page.path)
		expect(paths).toContain("/")
		expect(paths).toContain("/fi/")
		expect(paths).toContain("/compare/")
	})
})
