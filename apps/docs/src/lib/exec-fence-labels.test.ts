import { describe, expect, test } from "bun:test"
import type { ContentFile } from "./content-pages"
import { fenceLabelProblems } from "./exec-fence-labels"

const CONTENT_ROOT = "src/content/docs"

async function readCliTree(): Promise<ContentFile[]> {
	const files: ContentFile[] = []
	const glob = new Bun.Glob("cli/**/*.{md,mdx}")
	for await (const path of glob.scan({ cwd: CONTENT_ROOT })) {
		files.push({ path, content: await Bun.file(`${CONTENT_ROOT}/${path}`).text() })
	}
	return files.sort((left, right) => left.path.localeCompare(right.path))
}

function page(content: string): ContentFile {
	return { path: "cli/example.mdx", content }
}

describe("the fence labels in the Docs Portal content", () => {
	test("no CLI page has a misspelled or unclaimed exec or output label", async () => {
		const problems = (await readCliTree()).flatMap(fenceLabelProblems)
		expect(problems).toEqual([])
	})
})

describe("a fence label that would silently skip an example", () => {
	test("a misspelled output label is reported", () => {
		const content = "```bash exec\ntraj version\n```\n\n```text outptu\n0.4.0\n```\n"
		expect(fenceLabelProblems(page(content))).toEqual([
			'cli/example.mdx:5: "outptu" looks like a misspelled "exec" or "output" label',
		])
	})

	test("a misspelled exec label is reported", () => {
		const content = "```bash exce\ntraj version\n```\n"
		expect(fenceLabelProblems(page(content))).toEqual([
			'cli/example.mdx:1: "exce" looks like a misspelled "exec" or "output" label',
		])
	})

	test("an output fence separated from its exec fence by prose is reported", () => {
		const content = "```bash exec\ntraj version\n```\n\nSome prose.\n\n```text output\n0.4.0\n```\n"
		expect(fenceLabelProblems(page(content))).toEqual([
			"cli/example.mdx:7: an output fence is not directly after a bash exec fence",
		])
	})

	test("a correct exec and output pair is not reported", () => {
		const content = "```bash exec\ntraj version\n```\n\n```text output\n0.4.0\n```\n"
		expect(fenceLabelProblems(page(content))).toEqual([])
	})

	test("a key=value setting on a fence is not reported", () => {
		const content = '```json title="x"\n{}\n```\n'
		expect(fenceLabelProblems(page(content))).toEqual([])
	})
})
