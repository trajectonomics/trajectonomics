const BARE = /^[A-Za-z0-9_@%+=:,./-]+$/

/**
 * The command line a person could paste to produce a Read: "traj" and the argv, with any argument
 * that needs it single-quoted for a POSIX shell.
 */
export function formatArgv(argv: readonly string[]): string {
	return ["traj", ...argv].map(quoteArgument).join(" ")
}

function quoteArgument(argument: string): string {
	if (argument.length > 0 && BARE.test(argument)) return argument
	return `'${argument.replaceAll("'", `'\\''`)}'`
}
