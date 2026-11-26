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
import { detailsPerSection, outsideDetails } from "../lib/view/details.test-support"
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
			const body = render(module.default).body
			const outside = outsideDetails(body)
			for (const hash of HASHES) {
				expect(outside, `${page.path} shows the hash ${hash}`).not.toContain(hash)
			}
			expect(outside, `${page.path} names a definition version`).not.toContain("Definition version")
			expect(outside, `${page.path} states a basis-point figure`).not.toContain("basis points")
		})

		test(`${page.path} names each Details apart from the others`, async () => {
			setTestUrl(`http://127.0.0.1${page.path}?demo=1`)
			const module = (await import(pathToFileURL(page.file).href)) as { default: Component }
			const names = [
				...render(module.default).body.matchAll(/aria-label="(Details of [^"]*)"/g),
			].map((match) => match[1])
			expect(names.length, `${page.path} repeats a Details name`).toBe(new Set(names).size)
		})

		test(`${page.path} shows at most one Details in each of its sections`, async () => {
			setTestUrl(`http://127.0.0.1${page.path}?demo=1`)
			const module = (await import(pathToFileURL(page.file).href)) as { default: Component }
			const crowded = detailsPerSection(render(module.default).body).filter(
				(section) => section.count > 1,
			)
			expect(crowded, `${page.path} shows more than one Details in a section`).toEqual([])
		})
	}

	test("the guard covers the pages the issue names", () => {
		const paths = PAGES.map((page) => page.path)
		expect(paths).toContain("/")
		expect(paths).toContain("/fi/")
		expect(paths).toContain("/compare/")
	})
})

describe("detailsPerSection", () => {
	test("counts the old Ledger markup as two Details in one section", () => {
		const old = [
			'<section aria-labelledby="accounts"><h2 id="accounts">Accounts and balances</h2>',
			"<details><summary>Details</summary><pre>traj accounts --json</pre></details>",
			"<details><summary>Details</summary><pre>traj balance --json</pre></details></section>",
		].join("")
		expect(detailsPerSection(old)).toEqual([{ label: "Accounts and balances", count: 2 }])
	})

	test("counts a card's Details on the card, not on the page that holds it", () => {
		const nested = [
			'<section aria-labelledby="page-title"><h1 id="page-title">Overview</h1>',
			'<section class="card"><h2>FI date</h2>',
			"<details><summary>Details</summary><pre>traj fi --json</pre></details></section>",
			"</section>",
		].join("")
		expect(detailsPerSection(nested)).toEqual([
			{ label: "Overview", count: 0 },
			{ label: "FI date", count: 1 },
		])
	})
})
