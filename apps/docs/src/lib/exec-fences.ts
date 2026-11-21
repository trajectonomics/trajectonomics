import type { ContentFile } from "./content-pages"
import { type FenceBlock, fenceBlocks, infoWords } from "./fence-blocks"

/** The Quickstart page, whose examples seed the data home every other page starts from. */
export const QUICKSTART_PAGE = "cli/index.mdx"

/** The output a `bash exec` example is expected to print, with the language its fence names. */
export interface ExpectedOutput {
	readonly language: string
	readonly text: string
}

/** One `exec` fence: the script it runs, where it sits, and the output a following fence records. */
export interface ExecExample {
	readonly file: string
	readonly line: number
	readonly script: string
	readonly expected: ExpectedOutput | undefined
}

const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi
const TIMESTAMP = /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})/g

/** The index of the first non-blank line at or after `from`, or undefined when there is none. */
function nextNonBlank(lines: readonly string[], from: number): number | undefined {
	const index = lines.findIndex((text, position) => position >= from && text.trim() !== "")
	return index === -1 ? undefined : index
}

/** The block a page's `output` fence directly after `block` records, if there is one. */
function expectedOutput(
	lines: readonly string[],
	blocks: readonly FenceBlock[],
	block: FenceBlock,
): ExpectedOutput | undefined {
	const next = nextNonBlank(lines, block.end + 1)
	const output = blocks.find((candidate) => candidate.start === next)
	if (output === undefined) {
		return undefined
	}
	const words = infoWords(output.open.info)
	if (!words.includes("output")) {
		return undefined
	}
	const [language = ""] = words
	return { language, text: output.body }
}

/** Every fence whose info string names `exec`, in page order, with the output it is checked against. */
export function execExamples(file: ContentFile): readonly ExecExample[] {
	const lines = file.content.split("\n")
	const blocks = fenceBlocks(lines)
	return blocks
		.filter((block) => infoWords(block.open.info).includes("exec"))
		.map((block) => ({
			file: file.path,
			line: block.start + 1,
			script: block.body,
			expected: expectedOutput(lines, blocks, block),
		}))
}

/**
 * Output with the parts that differ between runs made neutral: UUIDs and timestamps become
 * `<id>` and `<timestamp>`, trailing whitespace on each line and trailing newlines are dropped.
 */
export function normalizeOutput(text: string): string {
	return text
		.replace(UUID, "<id>")
		.replace(TIMESTAMP, "<timestamp>")
		.split("\n")
		.map((line) => line.trimEnd())
		.join("\n")
		.replace(/\n+$/, "")
}
