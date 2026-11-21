import { describe, expect, test } from "bun:test"
import type { ContentFile } from "./content-pages"
import { execExamples, normalizeOutput } from "./exec-fences"

function page(content: string): ContentFile {
	return { path: "cli/example.mdx", content }
}

describe("the exec examples a Docs Portal page declares", () => {
	test("an exec fence is found with the line of its opening fence", () => {
		const content = "# title\n\nprose\n\n```bash exec\ntraj version\n```\n"
		expect(execExamples(page(content))).toEqual([
			{ file: "cli/example.mdx", line: 5, script: "traj version", expected: undefined },
		])
	})

	test("a text output fence right after an exec fence is its expected output", () => {
		const content = "```bash exec\ntraj version\n```\n\n```text output\n0.4.0\n```\n"
		expect(execExamples(page(content))).toEqual([
			{
				file: "cli/example.mdx",
				line: 1,
				script: "traj version",
				expected: { language: "text", text: "0.4.0" },
			},
		])
	})

	test("an output fence separated from the exec fence by prose is not its expected output", () => {
		const content =
			"```bash exec\ntraj version\n```\n\nThe output is:\n\n```text output\n0.4.0\n```\n"
		expect(execExamples(page(content))[0]?.expected).toBeUndefined()
	})

	test("a plain bash fence is not an example", () => {
		expect(execExamples(page("```bash\ntraj version\n```\n"))).toEqual([])
	})

	test("a tilde fence is an example too, and a closing fence must use the same marker", () => {
		const content = "~~~bash exec\ntraj ~~~ version\n~~~\n"
		expect(execExamples(page(content))).toEqual([
			{ file: "cli/example.mdx", line: 1, script: "traj ~~~ version", expected: undefined },
		])
	})

	test("a longer closing fence closes a shorter opening fence", () => {
		const content = "````bash exec\n```\necho hi\n`````\n"
		expect(execExamples(page(content)).map((example) => example.script)).toEqual(["```\necho hi"])
	})
})

describe("normalizeOutput", () => {
	test("UUIDs become <id>, whatever their case", () => {
		expect(
			normalizeOutput(
				"id 0F1E2D3C-4B5A-4968-8776-A1B2C3D4E5F6 and 01234567-89ab-cdef-0123-456789abcdef",
			),
		).toBe("id <id> and <id>")
	})

	test("ISO-8601 timestamps become <timestamp>", () => {
		expect(normalizeOutput("at 2026-11-21T16:41:07.123Z and 2026-11-21T16:41:07Z")).toBe(
			"at <timestamp> and <timestamp>",
		)
	})

	test("trailing whitespace on each line and trailing newlines are dropped", () => {
		expect(normalizeOutput("a  \n\tb \t\n\n\n")).toBe("a\n\tb")
	})
})
