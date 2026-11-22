import type { CliRelease } from "./cli-release"
import type { ContentFile } from "./content-pages"
import {
	COMMANDS_PAGE,
	CONFIGURATION_PAGE,
	problem,
	type ReleaseFactProblem,
} from "./release-fact-types"
import { errorCodeProblems, errorExitCodeProblems } from "./release-facts-codes"
import { commandTableProblems, exitCodeProblems, retryableProblems } from "./release-facts-commands"
import { OPERATOR_TAB_CONTENT } from "./tabs"

export {
	COMMANDS_PAGE,
	CONFIGURATION_PAGE,
	type ReleaseFactProblem,
	type ReleaseFactRule,
} from "./release-fact-types"

/** Variables a page names that the CLI itself does not read: the install scripts' and the launcher's. */
const NOT_THE_CLIS = new Set(["TRAJ_VERSION", "TRAJ_INSTALL_DIR", "TRAJ_BINARY_PATH"])

/** The configuration page's `## NAME` sections (`TRAJ_*` and `DO_NOT_TRACK`) against the root help's environment. */
function environmentProblems(
	file: ContentFile,
	release: CliRelease,
): readonly ReleaseFactProblem[] {
	const headed = new Set(
		[...file.content.matchAll(/^## ([A-Z][A-Z0-9_]+)\s*$/gm)].map((match) => match[1] ?? ""),
	)
	return release.environment
		.filter((entry) => !headed.has(entry.name))
		.map((entry) => problem("env-var-missing", file.path, `no \`## ${entry.name}\` section`))
}

/** Every `TRAJ_*` variable a page names that neither traj help nor an install channel reads. */
function unknownVariableProblems(
	file: ContentFile,
	release: CliRelease,
): readonly ReleaseFactProblem[] {
	const known = new Set([...release.environment.map((entry) => entry.name), ...NOT_THE_CLIS])
	const named = new Set([...file.content.matchAll(/\bTRAJ_[A-Z_]+\b/g)].map((match) => match[0]))
	return [...named]
		.filter((name) => !known.has(name))
		.map((name) => problem("env-var-unknown", file.path, `traj help does not list \`${name}\``))
}

/** Every fact an Operator page states that the release snapshot contradicts; empty when they agree. */
export function checkReleaseFacts(
	files: readonly ContentFile[],
	release: CliRelease,
): readonly ReleaseFactProblem[] {
	return files.flatMap((file) => {
		if (!file.path.startsWith(`${OPERATOR_TAB_CONTENT}/`)) return []
		const codes = [
			...errorCodeProblems(file, release),
			...errorExitCodeProblems(file, release),
			...unknownVariableProblems(file, release),
		]
		if (file.path === COMMANDS_PAGE) {
			return [
				...commandTableProblems(file, release),
				...exitCodeProblems(file, release),
				...retryableProblems(file, release),
				...codes,
			]
		}
		if (file.path === CONFIGURATION_PAGE) return [...environmentProblems(file, release), ...codes]
		return codes
	})
}
