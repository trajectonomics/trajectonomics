/**
 * A command line a hint prints, built so that a person can paste it back (cli ADR-0048): a name a
 * shell would split is quoted, and when one starts with `-` every positional name goes after `--`,
 * because `traj` reads a leading `-` as a flag anywhere before it.
 */

/** A name as a shell reads it back: bare when it is only `A-Za-z0-9._-`, else in single quotes. */
export function quotedName(name: string): string {
	return /^[A-Za-z0-9._-]+$/.test(name) ? name : `'${name.replaceAll("'", "'\\''")}'`
}

/**
 * The command `command`, then its positional `names` and its `flags`. An ordinary name stays beside
 * the command; when any name starts with `-`, every name follows `--` at the end, where the parser
 * reads it as a positional rather than a flag.
 */
export function printedCommand(
	command: string,
	names: readonly string[],
	flags: readonly string[] = [],
): string {
	const afterDash = names.some((name) => name.startsWith("-"))
	const head = afterDash ? [command, ...flags] : [command, ...names.map(quotedName), ...flags]
	const tail = afterDash ? ["--", ...names.map(quotedName)] : []
	return [...head, ...tail].join(" ")
}
