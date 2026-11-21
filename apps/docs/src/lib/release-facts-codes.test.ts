import { describe, expect, test } from "bun:test"
import type { CliRelease } from "./cli-release"
import { COMMANDS_PAGE, CONFIGURATION_PAGE, checkReleaseFacts } from "./release-facts"

/** A release small enough to read in a test. */
const RELEASE: CliRelease = {
	version: "9.9.9",
	leaves: [],
	globalFlags: [],
	commands: [],
	exitCodes: [
		{ name: "0", summary: "ok" },
		{ name: "1", summary: "unexpected" },
		{ name: "4", summary: "not found" },
	],
	environment: [{ name: "TRAJ_HOME", summary: "Data directory" }],
	errors: [
		{ code: "ledger_missing", exitCode: 4, retryable: false },
		{ code: "NEGATIVE_AMOUNT", exitCode: 3, retryable: false },
		{ code: "database_busy", exitCode: 5, retryable: true },
	],
}

function rulesOf(path: string, content: string): readonly string[] {
	return checkReleaseFacts([{ path, content }], RELEASE).map((problem) => problem.rule)
}

describe("an error code beside its exit code", () => {
	test("is accepted when the page states the registry's exit code", () => {
		expect(
			rulesOf("cli/commands/init.mdx", "fails with `ledger_missing` (exit code `4`)."),
		).toEqual([])
	})

	test("is reported when the page states another exit code, in either order", () => {
		const content =
			"fails with `ledger_missing` (exit code `5`), and is refused at exit code `2` with `NEGATIVE_AMOUNT`."
		expect(rulesOf("cli/commands/init.mdx", content)).toEqual([
			"error-exit-code",
			"error-exit-code",
		])
	})
})

describe("a code-shaped token that is not an error code", () => {
	test("is accepted for another program's variable", () => {
		expect(rulesOf("cli/configuration.mdx", "Set `NO_COLOR` to turn colour off.")).toEqual([
			"env-var-missing",
		])
	})

	test("is accepted for a column a failure word is not right before", () => {
		const content =
			"An import fails when the header differs. Each row holds `amount` and `external_ref`."
		expect(rulesOf("cli/commands/tx.mdx", content)).toEqual([])
	})
})

describe("the exit codes and the variables", () => {
	test("accept an exit-code sentence wrapped over two lines", () => {
		const content = [
			"| [init](/cli/commands/init/) | x |",
			"",
			"## Exit codes",
			"",
			"`0` ok, `1` unexpected,",
			"`4` not found.",
			"",
			"These codes are worth retrying as they are: `database_busy`.",
		].join("\n")
		expect(rulesOf(COMMANDS_PAGE, content)).toEqual(["command-unknown"])
	})

	test("report a TRAJ_ variable named anywhere that traj help does not list", () => {
		expect(rulesOf("cli/data.mdx", "Run with `TRAJ_BOGUS=1` or `$TRAJ_HOME`.")).toEqual([
			"env-var-unknown",
		])
	})

	test("report a released variable with no section on the configuration page", () => {
		expect(rulesOf(CONFIGURATION_PAGE, "## TRAJ_VERSION\n")).toEqual(["env-var-missing"])
	})
})
