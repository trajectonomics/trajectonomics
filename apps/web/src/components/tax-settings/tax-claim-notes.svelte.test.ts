import { afterAll, afterEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { preferences } from "../../client/preferences.svelte.js"
import TaxClaimNotes from "./TaxClaimNotes.svelte"

const SHARED =
	"60,000 baht of shared home-loan interest is stored for separate Returns, and this Return does not claim it."
const KEPT =
	'The claims stored for "partner" are kept for a separate filing, and this Return does not claim them.'

function body(lines: readonly string[]): string {
	return render(TaxClaimNotes, { props: { lines } }).body
}

afterEach(() => {
	preferences.hidden = false
})
afterAll(() => {
	preferences.hidden = false
})

describe("the CLI's notes under the claims", () => {
	test("states each sentence as a paragraph of its own, in the CLI's words", () => {
		const page = body([SHARED, KEPT])
		expect(page).toContain("Notes on the stored claims")
		expect(page.match(/<p[ >]/g)?.length).toBe(2)
		expect(page).toContain(SHARED)
		expect(page).toContain(KEPT)
	})

	test("keeps every sentence whole while amounts are hidden: they are notes, not figures", () => {
		preferences.hidden = true
		const page = body([SHARED])
		expect(page).toContain(SHARED)
		expect(page).not.toContain("••")
	})

	test("shows no section when the CLI stated no note", () => {
		expect(body([])).not.toContain("Notes on the stored claims")
	})
})
