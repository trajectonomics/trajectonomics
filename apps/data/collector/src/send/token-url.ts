/** The origins a collector's sign-in token may travel to. */
const TOKEN_HOSTS = new Set(["trajectonomics.com", "data.trajectonomics.com"])

/** The origin named in a refusal, or the raw value when it does not parse. */
export function originOf(url: string): string {
	try {
		return new URL(url).origin
	} catch {
		return url
	}
}

/** Whether a sign-in token may be sent to this URL; `TRAJ_DATA_ALLOW_TOKEN_URL=1` opts out. */
export function tokenAllowedFor(url: string, env: Record<string, string | undefined>): boolean {
	if (env["TRAJ_DATA_ALLOW_TOKEN_URL"] === "1") return true
	try {
		const parsed = new URL(url)
		return parsed.protocol === "https:" && TOKEN_HOSTS.has(parsed.hostname)
	} catch {
		return false
	}
}
