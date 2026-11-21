import { describe, expect, test } from "bun:test"
import { CLI_RELEASE_PATH, type CliRelease, parseCliRelease } from "./cli-release"
import { checkCommandReference } from "./command-reference"
import type { ContentFile } from "./content-pages"
import { COMMANDS_PAGE, CONFIGURATION_PAGE, checkReleaseFacts } from "./release-facts"

const CONTENT_ROOT = "src/content/docs"

async function readContentTree(): Promise<ContentFile[]> {
	const files: ContentFile[] = []
	for await (const path of new Bun.Glob("**/*.{md,mdx}").scan({ cwd: CONTENT_ROOT })) {
		files.push({ path, content: await Bun.file(`${CONTENT_ROOT}/${path}`).text() })
	}
	return files.sort((left, right) => left.path.localeCompare(right.path))
}

const tree = await readContentTree()
const snapshot = parseCliRelease(await Bun.file(CLI_RELEASE_PATH).json())

/** A release small enough to read in a test. */
const RELEASE: CliRelease = {
	version: "9.9.9",
	leaves: [],
	globalFlags: [],
	commands: [
		{ name: "init", summary: "Create an empty ledger" },
		{ name: "tx", summary: "Manage ledger transactions" },
	],
	exitCodes: [
		{ name: "0", summary: "ok" },
		{ name: "4", summary: "not found" },
	],
	environment: [{ name: "TRAJ_HOME", summary: "Data directory" }],
	errors: [
		{ code: "ledger_missing", exitCode: 4, retryable: false },
		{ code: "database_busy", exitCode: 5, retryable: true },
	],
}

const COMMANDS = [
	"| Command | What it does |",
	"| --- | --- |",
	"| [init](/cli/commands/init/) | Create an empty ledger |",
	"| [tx](/cli/commands/tx/) | Manage ledger transactions |",
	"",
	"## Exit codes",
	"",
	"`0` ok, `4` not found.",
	"",
	"These codes are worth retrying as they are: `database_busy`.",
].join("\n")

function rulesOf(path: string, content: string): readonly string[] {
	return checkReleaseFacts([{ path, content }], RELEASE).map((problem) => problem.rule)
}

describe("the Operator tab against the committed release snapshot", () => {
	test("states only what the snapshot's release states", () => {
		expect(checkReleaseFacts(tree, snapshot)).toEqual([])
	})

	test("documents every released leaf and flag, and no other", () => {
		const pages = tree.map((file) => ({ ...file, path: `${CONTENT_ROOT}/${file.path}` }))
		expect(checkCommandReference(snapshot, pages)).toEqual([])
	})
})

describe("the commands page", () => {
	test("is accepted when its table, exit codes and retryable codes match the release", () => {
		expect(rulesOf(COMMANDS_PAGE, COMMANDS)).toEqual([])
	})

	test("is reported when a released command has no row, or a row names another", () => {
		const content = COMMANDS.replace("| [tx](/cli/commands/tx/)", "| [txn](/cli/commands/txn/)")
		expect(rulesOf(COMMANDS_PAGE, content)).toEqual(["command-missing", "command-unknown"])
	})

	test("is reported when a summary differs from traj help", () => {
		const content = COMMANDS.replace("Create an empty ledger |", "Create the data directory |")
		expect(rulesOf(COMMANDS_PAGE, content)).toEqual(["command-summary"])
	})

	test("is reported when the exit codes or the retryable codes differ", () => {
		const content = COMMANDS.replace("`4` not found", "`4` missing").replace(
			"`database_busy`.",
			"`database_busy` and `ledger_missing`.",
		)
		expect(rulesOf(COMMANDS_PAGE, content)).toEqual(["exit-codes", "retryable-codes"])
	})
})

describe("any Operator page", () => {
	test("is reported when it names an error code the registry does not hold", () => {
		expect(
			rulesOf("cli/commands/init.mdx", "Fails with `ledger_gone`, not `ledger_missing`."),
		).toEqual(["error-code-unknown"])
	})

	test("is accepted when a lowercase value is not named as a failure", () => {
		expect(
			rulesOf("cli/commands/scenario.mdx", "The filing statuses are `married_joint`."),
		).toEqual([])
	})

	test("is accepted when it names an environment variable or a known code", () => {
		expect(rulesOf("cli/data.mdx", "Set `TRAJ_HOME`; reads fail with `ledger_missing`.")).toEqual(
			[],
		)
	})

	test("outside the Operator tab is not checked", () => {
		expect(rulesOf("contribute/tax.mdx", "`TH_2026_PARAMETERS` and `ledger_gone`.")).toEqual([])
	})
})

describe("the configuration page", () => {
	test("is reported when a variable traj help lists has no section, or a section names another", () => {
		expect(rulesOf(CONFIGURATION_PAGE, "## TRAJ_COLOR\n\nText.\n")).toEqual([
			"env-var-missing",
			"env-var-unknown",
		])
	})

	test("is accepted for the install scripts' and the launcher's variables", () => {
		expect(rulesOf(CONFIGURATION_PAGE, "## TRAJ_HOME\n\n## TRAJ_BINARY_PATH\n")).toEqual([])
	})
})
