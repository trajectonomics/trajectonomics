/** The message of an unknown thrown value, for one stderr line. */
export function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error)
}

/** The filesystem error code of a thrown error, or undefined when it carries none. */
export function errorCode(error: unknown): string | undefined {
	if (typeof error !== "object" || error === null || !("code" in error)) return undefined
	const code = (error as { code?: unknown }).code
	return typeof code === "string" ? code : undefined
}
