import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { builtHomes } from "./language-home"

/**
 * The npm package that is not Trajectonomics', and must appear nowhere: not on a page, not in a
 * script, not in a file the build copies.
 */
const FORBIDDEN_COMMAND = "npx traj"

/**
 * The command the install window retired (site#54): a fixture the Site no longer prints and whose
 * proof it never had. It is a tripwire, not a proof: it catches the reversal in the cheapest place,
 * but a home that printed some *other* command outside the window would pass, because the page prints
 * product copy and run labels on purpose.
 */
const RETIRED_COMMAND = "npx skills add"

/** A Language home prints no `npx skills add` line: the window shows a prompt, never a command. */
function retiredCommandFailures(file: BuiltFile): readonly BuildFailure[] {
	if (!file.content.includes(RETIRED_COMMAND)) return []
	return [
		buildFailure(
			"INSTALL_COMMAND_RETURNED",
			file.path,
			`prints "${RETIRED_COMMAND}"; the install window shows a prompt and names no command.`,
		),
	]
}

/**
 * The unscoped package is nowhere, and no Language home prints the command the window retired.
 *
 * The second rule judges built Language homes and never the repository: `AGENTS.md` legitimately
 * carries such lines, and judging the repository would fail a file this rule does not own.
 */
export function checkSiteContent(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return [
		...files.flatMap((file) =>
			file.content.includes(FORBIDDEN_COMMAND)
				? [
						buildFailure(
							"FORBIDDEN_NPX_TRAJ",
							file.path,
							'shows "npx traj"; that package belongs to someone else.',
						),
					]
				: [],
		),
		...builtHomes(files).flatMap(({ file }) => retiredCommandFailures(file)),
	]
}
