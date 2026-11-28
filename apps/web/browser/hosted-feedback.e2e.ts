import { expect, test } from "@playwright/test"
import { DEMO_SNAPSHOT, failures, logRequests, openHosted, snapshotsRead, strays } from "./hosted"

// The hosted Demo's feedback faces: one tap opens the GitHub issue form, already filled with the face and the page.
const FORM =
	"https://github.com/trajectonomics/trajectonomics/issues/new?template=demo-feedback.yml&"
const FACES = ["Like it", "It's okay", "Confusing"] as const

test("hosted: the notice's three feedback faces are visible at a phone width and open the feedback form", async ({
	page,
}) => {
	await page.setViewportSize({ width: 360, height: 800 })
	const requests = logRequests(page)
	await openHosted(page, "/")

	const group = page
		.getByRole("note", { name: "About this demo" })
		.getByRole("group", { name: "Feedback on this demo" })
	for (const label of FACES) {
		const link = group.getByRole("link", {
			name: `Feedback: ${label}, opens GitHub in a new tab`,
			exact: true,
		})
		await expect(link).toBeVisible()
		const box = await link.boundingBox()
		expect(box?.width ?? 0, `${label} tap width`).toBeGreaterThanOrEqual(24)
		expect(box?.height ?? 0, `${label} tap height`).toBeGreaterThanOrEqual(24)
		const href = await link.getAttribute("href")
		expect(href, label).toContain(FORM)
		expect(href, label).toContain("page=%2Fdemo%2F")
	}

	// A link, not a call: opening the page sends nothing but its own reads.
	expect(strays(requests), "requests that are not a GET under /demo/ of this origin").toEqual([])
	expect(failures(requests), "responses with an error status under /demo/").toEqual([])
	expect(snapshotsRead(requests)).toEqual([DEMO_SNAPSHOT])
})
