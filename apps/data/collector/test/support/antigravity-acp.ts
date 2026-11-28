import { join } from "node:path"

const HOME = "/home/synthetic"
export const ACP_PATH = join(HOME, ".gemini/antigravity-acp/acp_token.json")
export const ACP_TOKEN_URL = "https://oauth2.googleapis.com/token"
export const ACP_CLIENT_ID = "synthetic-acp-client-id"
export const ACP_CLIENT_SECRET = "synthetic-acp-client-secret"
export const ACP_REFRESH_TOKEN = "synthetic-acp-refresh-token"
export const ACP_ACCESS_TOKEN = "synthetic-acp-access-token"

/** A synthetic `acp_token.json`, with fields overridable for malformed cases. */
export function acpTokenFile(overrides: Record<string, unknown> = {}): string {
	return JSON.stringify({
		client_id: ACP_CLIENT_ID,
		client_secret: ACP_CLIENT_SECRET,
		refresh_token: ACP_REFRESH_TOKEN,
		token_uri: ACP_TOKEN_URL,
		scopes: ["https://www.googleapis.com/auth/cloud-platform"],
		project_id: "synthetic-project",
		...overrides,
	})
}
