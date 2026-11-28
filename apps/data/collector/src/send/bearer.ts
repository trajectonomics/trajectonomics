import { FILE_DEPS } from "../auth/credential-fs"
import { type Credentials, readCredentials, writeCredentials } from "../auth/credentials"
import type { AuthFetch } from "../auth/http"
import { accessToken } from "../auth/session"
import { errorMessage } from "../message"
import { realSleep } from "../sleep"
import { readIngestKey } from "./key"
import { originOf } from "./token-url"

/** Which credential one send run uses. */
export type BearerKind = "token" | "key"

/** The bearer to send with, and where it came from. */
export type Bearer = { bearer: string; kind: BearerKind }

/** Where one run reads its credential and where the token may go. */
export type BearerRequest = {
	credentialsPath: string
	keyFile: string
	url: string
	tokenUrlAllowed: boolean
	/** An explicit `--key-file` skips the credentials file entirely. */
	forceKey: boolean
}

/** Everything bearer resolution touches; tests inject all of it. */
export type BearerDeps = {
	readCredentials: (path: string) => Credentials | null
	saveCredentials: (path: string, credentials: Credentials) => void
	readKey: (path: string) => string
	fetch: AuthFetch
	nowIso: () => string
	sleep: (milliseconds: number) => Promise<void>
	log: (line: string) => void
}

/** Refuses to put a sign-in token on a URL outside the data Worker's origins. */
function refusal(request: BearerRequest): Error {
	return new Error(
		`refusing to send a sign-in token to ${originOf(request.url)}; pass --key-file or set TRAJ_DATA_ALLOW_TOKEN_URL=1`,
	)
}

function saveOrExplain(path: string, credentials: Credentials, deps: BearerDeps): void {
	try {
		deps.saveCredentials(path, credentials)
	} catch (error) {
		throw new Error(`credentials file ${path} cannot be written: ${errorMessage(error)}`)
	}
}

/** Resolves one bearer for a whole run. The key is used only on request or with no credentials. */
export async function resolveBearer(request: BearerRequest, deps: BearerDeps): Promise<Bearer> {
	if (!request.forceKey) {
		const credentials = deps.readCredentials(request.credentialsPath)
		if (credentials !== null) {
			if (!request.tokenUrlAllowed) throw refusal(request)
			const token = await accessToken(credentials, {
				fetch: deps.fetch,
				nowIso: deps.nowIso,
				sleep: deps.sleep,
				save: (next) => saveOrExplain(request.credentialsPath, next, deps),
			})
			return { bearer: token, kind: "token" }
		}
	}
	const hint = request.forceKey
		? "send: using the ingest key from --key-file"
		: "send: using the temporary ingest key; run login to switch"
	deps.log(hint)
	return { bearer: deps.readKey(request.keyFile), kind: "key" }
}

/** Resolves the run's bearer on first use and memoises the promise, including a rejection. */
export function lazyBearer(resolve: () => Promise<Bearer>): () => Promise<Bearer> {
	let pending: Promise<Bearer> | undefined
	return () => (pending ??= resolve())
}

/** The real filesystem, clock and wait, for one command's bearer resolution. */
export function realBearerDeps(fetch: AuthFetch, log: (line: string) => void): BearerDeps {
	return {
		readCredentials: (path) => readCredentials(path, FILE_DEPS),
		saveCredentials: (path, next) => writeCredentials(path, next, FILE_DEPS),
		readKey: (path) => readIngestKey(path),
		fetch,
		nowIso: () => new Date().toISOString(),
		sleep: realSleep,
		log,
	}
}
