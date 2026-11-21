import { describe, expect, test } from "bun:test"
import { checkAdrLinks } from "./adr-links"
import type { ContentFile } from "./content-pages"

const CONTENT_ROOT = "src/content/docs"

async function readContentTree(): Promise<ContentFile[]> {
	const files: ContentFile[] = []
	const glob = new Bun.Glob("**/*.{md,mdx}")
	for await (const path of glob.scan({ cwd: CONTENT_ROOT })) {
		files.push({ path, content: await Bun.file(`${CONTENT_ROOT}/${path}`).text() })
	}
	return files.sort((left, right) => left.path.localeCompare(right.path))
}

const tree = await readContentTree()

function detailsOf(path: string, content: string): readonly string[] {
	return checkAdrLinks([{ path, content }]).map((problem) => problem.detail)
}

const ADR_URL =
	"https://github.com/trajectonomics/trajectonomics/blob/main/apps/cli/docs/adr/0010-output-contract.md"

describe("design-record links in the Docs Portal content", () => {
	test("no Operator-tab page links a design record", () => {
		expect(checkAdrLinks(tree)).toEqual([])
	})
})

describe("an Operator-tab page", () => {
	test("is reported when it cites a design record, and the detail names the link", () => {
		expect(
			detailsOf("cli/commands/tx.mdx", `Commands never prompt ([ADR 0010](${ADR_URL})).`),
		).toEqual([`links a design record: [ADR 0010](${ADR_URL})`])
	})

	test("is reported for every link, including one whose text spans a line break", () => {
		const content = `See [ADR\n0010](${ADR_URL}) and [the record](${ADR_URL}).`
		expect(detailsOf("cli/agent.mdx", content)).toHaveLength(2)
	})

	test("is accepted when it links another page or the source code", () => {
		const content =
			"[Commands](/cli/commands/) and [the source](https://github.com/trajectonomics/trajectonomics/tree/main/apps/cli)."
		expect(detailsOf("cli/index.mdx", content)).toEqual([])
	})
})

describe("a Contribute-tab page", () => {
	test("is accepted when it cites a design record, because its readers are contributors", () => {
		expect(detailsOf("contribute/tax.mdx", `See [ADR 0002](${ADR_URL}).`)).toEqual([])
	})
})
