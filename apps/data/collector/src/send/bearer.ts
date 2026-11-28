import { FILE_DEPS } from "../auth/credential-fs"
import { type Credentials, readCredentials, writeCredentials } from "../auth/credentials"
import type { AuthFetch } from "../auth/http"
import { accessToken } from "../auth/session"
import { errorMessage } from "../message"
import { realSleep } from "../sleep"
import { originOf } from "./token-url"

/** Where one run reads its credentials and where the token may go. */
export type BearerRequest = {
	credentialsPath: string
	url: string
	tokenUrlAllowed: boolean
}

/** Everything bearer resolution touches; tests inject all of it. */
export type BearerDeps = {
	readCredentials: (path: string) => Credentials | null
	saveCredentials: (path: string, credentials: Credentials) => void
	fetch: AuthFetch
	nowIso: () => string
	sleep: (milliseconds: number) => Promise<void>
}

/** Refuses to put a sign-in token on a URL outside the data Worker's origins. */
function refusal(request: BearerRequest): Error {
	return new Error(
		`refusing to send a sign-in token to ${originOf(request.url)}; set TRAJ_DATA_ALLOW_TOKEN_URL=1 if it is an auth-backed Worker`,
	)
}

function saveOrExplain(path: string, credentials: Credentials, deps: BearerDeps): void {
	try {
		deps.saveCredentials(path, credentials)
	} catch (error) {
		throw new Error(`credentials file ${path} cannot be written: ${errorMessage(error)}`)
	}
}

/** Resolves the run's access token; sending requires a machine that has signed in (ADR 0015). */
export async function resolveBearer(request: BearerRequest, deps: BearerDeps): Promise<string> {
	const credentials = deps.readCredentials(request.credentialsPath)
	if (credentials === null) throw new Error("not signed in: run `bun src/cli.ts login` first")
	if (!request.tokenUrlAllowed) throw refusal(request)
	return await accessToken(credentials, {
		fetch: deps.fetch,
		nowIso: deps.nowIso,
		sleep: deps.sleep,
		save: (next) => saveOrExplain(request.credentialsPath, next, deps),
	})
}

/** Resolves the run's token on first use and memoises the promise, including a rejection. */
export function lazyBearer(resolve: () => Promise<string>): () => Promise<string> {
	let pending: Promise<string> | undefined
	return () => (pending ??= resolve())
}

/** The real filesystem, clock and wait, for one command's bearer resolution. */
export function realBearerDeps(fetch: AuthFetch): BearerDeps {
	return {
		readCredentials: (path) => readCredentials(path, FILE_DEPS),
		saveCredentials: (path, next) => writeCredentials(path, next, FILE_DEPS),
		fetch,
		nowIso: () => new Date().toISOString(),
		sleep: realSleep,
	}
}
