import { homedir } from "node:os"
import {
	type Credentials,
	credentialsPath,
	FILE_DEPS,
	readCredentials,
	writeCredentials,
} from "../auth/credentials"
import type { AuthFetch } from "../auth/http"
import { accessToken } from "../auth/session"
import { readIngestKey } from "./key"

/** Which credential one send run uses. */
export type BearerKind = "token" | "key"

/** The bearer to send with, and where it came from. */
export type Bearer = { bearer: string; kind: BearerKind }

/** Everything the bearer resolution touches; tests inject all of it. */
export type BearerDeps = {
	readCredentials: (path: string) => Credentials | null
	saveCredentials: (path: string, credentials: Credentials) => void
	readKey: (path: string) => string
	fetch: AuthFetch
	nowIso: () => string
	log: (line: string) => void
}

/** Resolves one bearer for a whole run: a refreshed token, else the temporary key. */
export async function resolveBearer(options: {
	credentialsPath: string
	keyFile: string
	deps: BearerDeps
}): Promise<Bearer> {
	const { credentialsPath, keyFile, deps } = options
	const credentials = deps.readCredentials(credentialsPath)
	if (credentials !== null) {
		const token = await accessToken(credentials, {
			fetch: deps.fetch,
			nowIso: deps.nowIso,
			save: (next) => deps.saveCredentials(credentialsPath, next),
		})
		return { bearer: token, kind: "token" }
	}
	deps.log("send: using the temporary ingest key; run login to switch")
	return { bearer: deps.readKey(keyFile), kind: "key" }
}

/** The real filesystem, clock and key reader, for a command's one resolution. */
export function realBearerOptions(
	keyFile: string,
	fetch: AuthFetch,
	log: (line: string) => void,
): { credentialsPath: string; keyFile: string; deps: BearerDeps } {
	return {
		credentialsPath: credentialsPath(homedir()),
		keyFile,
		deps: {
			readCredentials: (path) => readCredentials(path, FILE_DEPS),
			saveCredentials: (path, credentials) => writeCredentials(path, credentials, FILE_DEPS),
			readKey: (path) => readIngestKey(path),
			fetch,
			nowIso: () => new Date().toISOString(),
			log,
		},
	}
}
