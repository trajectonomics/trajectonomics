/** The message of an unknown thrown value, for one stderr line. */
export function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error)
}
