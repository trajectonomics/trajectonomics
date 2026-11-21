import type { ContentFile } from "./content-pages"
import { claimedOutputStarts } from "./exec-fences"
import { fenceBlocks, infoWords } from "./fence-blocks"

/** The info words that mark a fence as a runnable example or its expected output. */
const LABELS = ["exec", "output"] as const

/** Words a fence can carry that are settings rather than labels, such as `title="x"`. */
const SETTING = /=/

/** The number of single-character edits that turn `left` into `right`. */
function editDistance(left: string, right: string): number {
	let row = Array.from({ length: right.length + 1 }, (_, index) => index)
	for (const [i, leftChar] of [...left].entries()) {
		const next = [i + 1]
		for (const [j, rightChar] of [...right].entries()) {
			const cost = leftChar === rightChar ? 0 : 1
			next.push(Math.min((row[j + 1] ?? 0) + 1, (next[j] ?? 0) + 1, (row[j] ?? 0) + cost))
		}
		row = next
	}
	return row[right.length] ?? 0
}

/** Whether `word` is a near miss of one of the labels, such as `exce` or `outptu`. */
function isMisspelledLabel(word: string): boolean {
	return LABELS.some(
		(label) => word !== label && editDistance(word, label) <= 2 && !SETTING.test(word),
	)
}

/**
 * Every fence label a page gets wrong, one message per problem, prefixed with `path:line`: an
 * `output` fence that no `bash exec` fence claims, and a label that is one edit or two away from
 * `exec` or `output` without being either. Either one would silently skip an example.
 */
export function fenceLabelProblems(file: ContentFile): readonly string[] {
	const lines = file.content.split("\n")
	const blocks = fenceBlocks(lines)
	const claimed = claimedOutputStarts(lines, blocks)
	const problems: string[] = []
	for (const block of blocks) {
		const words = infoWords(block.open.info)
		const where = `${file.path}:${block.start + 1}`
		if (words.includes("output") && !claimed.has(block.start)) {
			problems.push(`${where}: an output fence is not directly after a bash exec fence`)
		}
		for (const word of words.slice(1)) {
			if (isMisspelledLabel(word)) {
				problems.push(`${where}: "${word}" looks like a misspelled "exec" or "output" label`)
			}
		}
	}
	return problems
}
