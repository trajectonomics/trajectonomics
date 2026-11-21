import { describe, expect, test } from "bun:test"
import { brandArtwork } from "./brand-artwork"

describe("brandArtwork", () => {
	test("removes the mark's role, label and title, since the brand link names itself", () => {
		const mark =
			'<svg role="img" aria-label="Trajectonomics" viewBox="0 0 8 8"><title>Trajectonomics</title><path d="M0 0"/></svg>'
		const artwork = brandArtwork(mark)
		expect(artwork).not.toContain("role=")
		expect(artwork).not.toContain("aria-label")
		expect(artwork).not.toContain("<title>")
		expect(artwork.startsWith('<svg focusable="false" viewBox="0 0 8 8">')).toBe(true)
		expect(artwork).toContain('<path d="M0 0"/>')
	})
})
