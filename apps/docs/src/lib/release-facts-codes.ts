import type { CliRelease } from "./cli-release"
import type { ContentFile } from "./content-pages"
import { CODE_TOKEN, problem, type ReleaseFactProblem } from "./release-fact-types"

/**
 * `UPPER_SNAKE` names a page may write that are not error codes: environment variables shared across
 * programs. `DO_NOT_TRACK` is the cross-tool opt-out that traj's usage count honours too.
 */
const NOT_ERROR_CODES = new Set(["NO_COLOR", "DO_NOT_TRACK"])

/** Words that make the code-shaped token right after them an error code. */
const ERROR_CONTEXT = /refus\w*|\bfails?\b|failure|\berror\b|exit code/i

/** How close before a lowercase token the page must name a failure for the token to be a code. */
const ERROR_CONTEXT_CHARS = 30

/** "`code` (exit code `N`)" and "exit code `N` with `code`": a code beside the class it exits with. */
const CODE_THEN_EXIT = /`([A-Za-z0-9_]+)`\s*\(exit code `(\d+)`\)/g
const EXIT_THEN_CODE = /exit code `(\d+)`,?\s+with\s+`([A-Za-z0-9_]+)`/g

/**
 * Whether a code-shaped token is an error code: every `UPPER_SNAKE` one but a `TRAJ_` variable or
 * another program's, and a `lower_snake` one only right after a failure word, since lowercase snake
 * case also names values such as a filing status (`married_joint`) or a CSV column (`external_ref`).
 */
function isErrorCode(content: string, token: string, index: number): boolean {
	if (token.startsWith("TRAJ_") || NOT_ERROR_CODES.has(token)) return false
	if (token === token.toUpperCase()) return true
	return ERROR_CONTEXT.test(content.slice(Math.max(0, index - ERROR_CONTEXT_CHARS), index))
}

/** Every error code a page names that the released registry does not hold. */
export function errorCodeProblems(
	file: ContentFile,
	release: CliRelease,
): readonly ReleaseFactProblem[] {
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

/** Every released code a page states with an exit code other than the registry's. */
export function errorExitCodeProblems(
	file: ContentFile,
	release: CliRelease,
): readonly ReleaseFactProblem[] {
	const exits = new Map(release.errors.map((error) => [error.code, error.exitCode]))
	const stated = [
		...[...file.content.matchAll(CODE_THEN_EXIT)].map((match) => [match[1], match[2]] as const),
		...[...file.content.matchAll(EXIT_THEN_CODE)].map((match) => [match[2], match[1]] as const),
	]
	return stated.flatMap(([code = "", exit = ""]) => {
		const registered = exits.get(code)
		if (registered === undefined || String(registered) === exit) return []
		const detail = `states \`${code}\` exits ${exit}; the registry says ${registered}`
		return [problem("error-exit-code", file.path, detail)]
	})
}
