import { describe, expect, test } from "bun:test"
import { FEEDBACK_CHOICES, feedbackIssueUrl } from "./feedback"

describe("the Demo's feedback faces", () => {
	test("are three, in the order they are shown", () => {
		expect(FEEDBACK_CHOICES.map((choice) => choice.id)).toEqual(["good", "okay", "confusing"])
		expect(FEEDBACK_CHOICES.map((choice) => choice.label)).toEqual([
			"Like it",
			"It's okay",
			"Confusing",
		])
	})

	test("open the feedback form with the face and the page already filled in", () => {
		expect(feedbackIssueUrl("It's okay", "/demo/net-worth/")).toBe(
			"https://github.com/trajectonomics/trajectonomics/issues/new?template=demo-feedback.yml&title=Demo%3A%20It's%20okay%20on%20%2Fdemo%2Fnet-worth%2F&rating=It's%20okay&page=%2Fdemo%2Fnet-worth%2F",
		)
	})

	test("encode a pathname's separators, spaces and question marks", () => {
		const url = feedbackIssueUrl("Like it", "/demo/a b&c?d/")
		expect(url).toContain("page=%2Fdemo%2Fa%20b%26c%3Fd%2F")
		expect(url).toContain("on%20%2Fdemo%2Fa%20b%26c%3Fd%2F")
		expect(url).not.toContain("a b&c?d")
	})
})
