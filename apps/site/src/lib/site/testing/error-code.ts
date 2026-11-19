/** The code of the error `run` throws, or what it did instead, so a test asserts the code and not a message. */
export function codeOf(run: () => unknown): string {
	try {
		run()
	} catch (error) {
		return (error as { readonly code?: string }).code ?? "no code"
	}
	return "no error"
}
