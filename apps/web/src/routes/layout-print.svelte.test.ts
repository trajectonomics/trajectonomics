import { afterAll, describe, expect, test } from "bun:test"
import { createRawSnippet } from "svelte"
import { render } from "svelte/server"
import { setTestUrl } from "../../scripts/svelte/app-stub"
import { snapshotLoader } from "../client/browser"
import { replaceSnapshot } from "../client/snapshot.svelte"
import { type Snapshot, snapshot as snapshotSchema } from "../lib/contract"
import { LOADING } from "../lib/view/state"
import Layout from "./+layout.svelte"

const DEMO: Snapshot = snapshotSchema.parse(
	JSON.parse(await Bun.file(`${import.meta.dir}/../../public/demo/snapshot.json`).text()),
)

const page = createRawSnippet(() => ({ render: () => "<p>the page</p>" }))

// The Snapshot store is shared by every test file in the process, so it is put back as it was.
afterAll(() => {
	snapshotLoader.replace(LOADING)
	setTestUrl("http://127.0.0.1/")
})

describe("the layout, printed", () => {
	test("names the plan, the As-of date and the terms on a page that is not Reports", () => {
		setTestUrl("http://127.0.0.1/projection/?demo=1&terms=real")
		replaceSnapshot(DEMO)
		const { body } = render(Layout, { props: { children: page } })
		const header = body.match(/<p data-print-header[^>]*>([^<]*)<\/p>/)
		expect(header).not.toBeNull()
		expect(header?.[1]).toContain(`As of ${DEMO.params.asOf}`)
		expect(header?.[1]).toContain("Real, in As-of terms")
		expect(header?.[1]).toContain(DEMO.params.scenarios[0] ?? "no plan in the Demo snapshot")
		expect(body).toMatch(/data-print-header[^>]*class="[^"]*\bhidden\b[^"]*\bprint:block\b/)
	})
})
