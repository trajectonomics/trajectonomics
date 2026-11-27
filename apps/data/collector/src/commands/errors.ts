/** Prints one error line with the command's usage and exits non-zero. */
export function fail(message: string, usage: string): never {
	console.error(`${message}\n${usage}`)
	process.exit(1)
}
