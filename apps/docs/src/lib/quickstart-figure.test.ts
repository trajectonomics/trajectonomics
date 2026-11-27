import { describe, expect, test } from "bun:test"
import { CONTENT_ROOT } from "./content-pages"
import { fenceBlocks, infoWords } from "./fence-blocks"
import { QUICKSTART_AS_OF, QUICKSTART_CURRENCY, QUICKSTART_NET_WORTH } from "./quickstart-figure"

const QUICKSTART_PATH = `${CONTENT_ROOT}/cli/index.mdx`

const blocks = fenceBlocks((await Bun.file(QUICKSTART_PATH).text()).split("\n"))

/** The body of the first fence whose info string names `word`. */
function bodyOf(word: string): string {
	return blocks.find((block) => infoWords(block.open.info).includes(word))?.body ?? ""
}

/** The body of the first `exec` fence that runs `command`. */
function execBodyOf(command: string): string {
	return (
		blocks.find(
			(block) => infoWords(block.open.info).includes("exec") && block.body.includes(command),
		)?.body ?? ""
	)
}

describe("the Quickstart's own figure", () => {
	test("its output fence prints the shared net worth in the shared currency", () => {
		const printed = /netWorth:\s*\n\s*- currency: (\S+)\s*\n\s*amount: ([\d.]+)/.exec(
			bodyOf("output"),
		)

		expect(printed).not.toBeNull()
		expect(printed?.[1]).toBe(QUICKSTART_CURRENCY)
		expect(printed?.[2]).toBe(QUICKSTART_NET_WORTH)
	})

	test("its balance runs at the shared As-of date", () => {
		const command = /traj balance --as-of (\d{4}-\d{2}-\d{2})/.exec(execBodyOf("traj balance"))

		expect(command?.[1]).toBe(QUICKSTART_AS_OF)
	})

	test("its flow ends on the same net worth", () => {
		const flow = bodyOf("flow").trim()

		expect(flow.endsWith(`${QUICKSTART_NET_WORTH} ${QUICKSTART_CURRENCY}`)).toBe(true)
	})
})
