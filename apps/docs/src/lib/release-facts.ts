import type { CliRelease } from "./cli-release"
import type { ContentFile } from "./content-pages"
import {
	CODE_TOKEN,
	COMMANDS_PAGE,
	CONFIGURATION_PAGE,
	problem,
	type ReleaseFactProblem,
} from "./release-fact-types"
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

/** Words that make the code-shaped token after them an error code, within `ERROR_CONTEXT_CHARS`. */
const ERROR_CONTEXT = /refus|fail|error|\bexits?\b|\bcode\b/i

/** How far before a lowercase token the page must name a failure for the token to be a code. */
const ERROR_CONTEXT_CHARS = 80

/**
 * Whether a code-shaped token is an error code: every `UPPER_SNAKE` one but a `TRAJ_` variable, and a
 * `lower_snake` one only after a failure word, since lowercase snake case also names values such as
 * a filing status (`married_joint`) or a CSV column (`external_ref`).
 */
function isErrorCode(content: string, token: string, index: number): boolean {
	if (token.startsWith("TRAJ_")) return false
	if (token === token.toUpperCase()) return true
	return ERROR_CONTEXT.test(content.slice(Math.max(0, index - ERROR_CONTEXT_CHARS), index))
}

/** Every error code a page names that the released registry does not hold. */
function errorCodeProblems(file: ContentFile, release: CliRelease): readonly ReleaseFactProblem[] {
	const codes = new Set(release.errors.map((error) => error.code))
	const unknown = new Set(
		[...file.content.matchAll(CODE_TOKEN)]
			.filter((match) => isErrorCode(file.content, match[1] ?? "", match.index))
			.map((match) => match[1] ?? "")
			.filter((token) => !codes.has(token)),
	)
	return [...unknown].map((code) =>
		problem("error-code-unknown", file.path, `\`${code}\` is not in the released error registry`),
	)
}

/** The configuration page's `## TRAJ_*` sections against the root help's environment. */
function environmentProblems(
	file: ContentFile,
	release: CliRelease,
): readonly ReleaseFactProblem[] {
	const headed = new Set(
		[...file.content.matchAll(/^## (TRAJ_[A-Z_]+)\s*$/gm)].map((match) => match[1] ?? ""),
	)
	const released = new Set(release.environment.map((entry) => entry.name))
	const missing = [...released]
		.filter((name) => !headed.has(name))
		.map((name) => problem("env-var-missing", file.path, `no \`## ${name}\` section`))
	const unknown = [...headed]
		.filter((name) => !released.has(name) && !NOT_THE_CLIS.has(name))
		.map((name) => problem("env-var-unknown", file.path, `traj help does not list \`${name}\``))
	return [...missing, ...unknown]
}

/** Every fact an Operator page states that the release snapshot contradicts; empty when they agree. */
export function checkReleaseFacts(
	files: readonly ContentFile[],
	release: CliRelease,
): readonly ReleaseFactProblem[] {
	return files.flatMap((file) => {
		if (!file.path.startsWith(`${OPERATOR_TAB_CONTENT}/`)) return []
		const codes = errorCodeProblems(file, release)
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
