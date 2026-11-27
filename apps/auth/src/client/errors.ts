/** A failed auth request, with the code the API gave it. */
export class AuthRequestError extends Error {
	readonly code: string
	readonly status: number

	constructor(error: {
		readonly code?: string | undefined
		readonly message?: string | undefined
		readonly status?: number | undefined
		readonly statusText?: string | undefined
	}) {
		super(error.message ?? error.statusText ?? "request failed")
		this.name = "AuthRequestError"
		this.code = error.code ?? ""
		this.status = error.status ?? 0
	}
}
