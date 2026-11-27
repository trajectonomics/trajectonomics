import type { GrantList, Passkey } from "../lib/api-types"
import { request } from "./auth"

export async function listGrants(): Promise<GrantList> {
	return request<GrantList>("/oauth2/grants")
}

export async function revokeGrant(id: string): Promise<void> {
	await request("/oauth2/grants/revoke", { method: "POST", body: { id } })
}

export async function listPasskeys(): Promise<Passkey[]> {
	return request<Passkey[]>("/passkey/list-user-passkeys")
}

export async function removePasskey(id: string): Promise<void> {
	await request("/passkey/delete-passkey", { method: "POST", body: { id } })
}
