/** Whether a query string is an OAuth provider flow the page must carry through sign-in. */
export function isSignedOAuthSearch(search: string): boolean {
	const params = new URLSearchParams(search)
	return params.has("sig") && params.has("client_id")
}
