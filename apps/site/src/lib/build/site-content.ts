import type { Dictionary } from "../language/dictionary"
import { INSTALL_COMMAND } from "../site"
import type { BuiltFile } from "./built-files"
import { copyFailures } from "./copy-control"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { elementsByTag, scanHtml, textOf } from "./html"
import { builtHomes } from "./language-home"

/** A script element of a built page; with JavaScript off, none of it runs. */
const SCRIPT = /<script\b[^>]*>[\s\S]*?<\/script>/gi

/** The npm package that is not Trajectonomics', and must appear nowhere. */
const FORBIDDEN_COMMAND = "npx traj"

/** The command is visible text in a `<code>` element, and stays there once the scripts are removed. */
function commandFailures(file: BuiltFile, dictionary: Dictionary): readonly BuildFailure[] {
	const page = scanHtml(file.content)
	const command = elementsByTag(page, "code").find(
		(element) => textOf(page, element) === INSTALL_COMMAND,
	)
	const failures: BuildFailure[] =
		command === undefined
			? [
					buildFailure(
						"INSTALL_COMMAND_MISSING",
						file.path,
						`no <code> shows the install command "${INSTALL_COMMAND}".`,
					),
				]
			: [...copyFailures(file.path, page, dictionary, command)]
	if (
		file.content.includes(INSTALL_COMMAND) &&
		!file.content.replace(SCRIPT, "").includes(INSTALL_COMMAND)
	) {
		failures.push(
			buildFailure(
				"INSTALL_COMMAND_SCRIPT_ONLY",
				file.path,
				`"${INSTALL_COMMAND}" is not in the HTML once its scripts are removed.`,
			),
		)
	}
	return failures
}

/** The fixture command is on every Language home, and the unscoped package is nowhere. */
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
		...builtHomes(files).flatMap(({ entry, file }) => commandFailures(file, entry.dictionary)),
	]
}
