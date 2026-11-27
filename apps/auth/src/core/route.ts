/**
 * `/jwks` is the public key set the ADR promises at the host root, while Better Auth serves its
 * endpoints under `/api/auth`. The Worker rewrites the one path; everything else passes through.
 */
export const AUTH_BASE_PATH = "/api/auth"
export const JWKS_PATH = "/jwks"

/** The path Better Auth should serve for this request: `/jwks` becomes its handler path. */
export function authHandlerPath(pathname: string): string {
	if (pathname === JWKS_PATH) return `${AUTH_BASE_PATH}/jwks`
	return pathname
}
