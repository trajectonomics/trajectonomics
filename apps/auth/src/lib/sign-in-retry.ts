/**
 * Where a cancelled or failed social sign-in comes back to: the sign-in page the person was on,
 * still carrying the provider's signed query or `?next=`, so a retry continues the same flow.
 *
 * The answer is always a path on this origin, built from `location.pathname` and
 * `location.search`. Better Auth appends its own `error` and `error_description` to it; those are
 * outside the signature, and an earlier attempt's are dropped so they never pile up. A name the
 * provider signed (`ba_param`) is left as it is, because changing it would break the signature.
 */
export function signInRetryPath(pathname: string, search: string): string {
	const path = `/${pathname.replace(/^[/\\]+/, "")}`
	const params = new URLSearchParams(search)
	const signed = new Set(params.getAll("ba_param"))
	for (const name of ["error", "error_description"]) {
		if (!signed.has(name)) params.delete(name)
	}
	if (!params.has("error")) params.append("error", "1")
	return `${path}?${params.toString()}`
}
