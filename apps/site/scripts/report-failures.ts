/** A failed check, as the built-file checks and the Worker probe report it. */
export interface FailedCheck {
	readonly code: string
	readonly path: string
	readonly message: string
}

/** Print every failed check and return the process exit code: 0 when the list is empty. */
export function reportFailures(label: string, failures: readonly FailedCheck[]): number {
	for (const failure of failures) {
		console.error(`${failure.code} ${failure.path}: ${failure.message}`)
	}
	if (failures.length === 0) {
		console.log(`${label}: ok`)
		return 0
	}
	console.error(`${label}: ${failures.length} failed check(s)`)
	return 1
}
