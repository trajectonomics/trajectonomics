import { json, type Session } from "./http"
import type { Grant } from "./types"

export async function listGrants(session: Session): Promise<{ grants: Grant[] }> {
	return session.json("/api/auth/oauth2/grants")
}

export async function revokeGrant(session: Session, id: string): Promise<{ revoked: boolean }> {
	return session.json("/api/auth/oauth2/grants/revoke", json({ id }))
}

/** One user-code guess; the caller only needs the status. */
export async function guessUserCode(session: Session, code: string): Promise<number> {
	const response = await session.request(`/api/auth/device?user_code=${encodeURIComponent(code)}`)
	return response.status
}
