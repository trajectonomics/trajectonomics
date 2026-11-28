import { describe, expect, test } from "bun:test"
import { acpRefreshCredential } from "../src/quota/antigravity-acp"
import type { CommandRunner } from "../src/quota/sample"
import { sampleQuota } from "../src/quota/sample"
import {
	ACP_ACCESS_TOKEN,
	ACP_CLIENT_ID,
	ACP_CLIENT_SECRET,
	ACP_PATH,
	ACP_REFRESH_TOKEN,
	ACP_TOKEN_URL,
	acpTokenFile,
} from "./support/antigravity-acp"
import {
	AGY,
	ANTIGRAVITY_BODY,
	ANTIGRAVITY_PATH,
	ANTIGRAVITY_URL,
	antigravityTokenFile,
	fakeFetch,
	MUSE_STDOUT,
	makeDeps,
	NOW,
} from "./support/quota-sample"

const ACCESS_BODY = { access_token: ACP_ACCESS_TOKEN, expires_in: 3599, token_type: "Bearer" }

function acpFiles(): Record<string, string> {
	return { [ACP_PATH]: acpTokenFile() }
}

const noCommands: CommandRunner = async () => ({ exitCode: 0, stdout: MUSE_STDOUT })

describe("acpRefreshCredential", () => {
	test("parses a valid ACP token file", () => {
		expect(acpRefreshCredential(acpTokenFile())).toEqual({
			ok: true,
			clientId: ACP_CLIENT_ID,
			clientSecret: ACP_CLIENT_SECRET,
			refreshToken: ACP_REFRESH_TOKEN,
			tokenUri: ACP_TOKEN_URL,
		})
	})

	test("rejects a missing key", () => {
		expect(acpRefreshCredential(acpTokenFile({ refresh_token: undefined }))).toEqual({
			ok: false,
			reason: "malformed",
		})
	})

	test("rejects a token endpoint other than Google's", () => {
		expect(acpRefreshCredential(acpTokenFile({ token_uri: "https://example.com/token" }))).toEqual({
			ok: false,
			reason: "malformed",
		})
	})

	test("rejects non-JSON and missing contents", () => {
		expect(acpRefreshCredential("not json")).toEqual({ ok: false, reason: "malformed" })
		expect(acpRefreshCredential(null)).toEqual({ ok: false, reason: "missing" })
	})
})

describe("Antigravity ACP refresh", () => {
	test("exchanges the ACP refresh token in memory, then samples without agy", async () => {
		const commands: string[][] = []
		const runCommand: CommandRunner = async (argv) => {
			commands.push([...argv])
			return { exitCode: 0, stdout: MUSE_STDOUT }
		}
		const { calls, fetch } = fakeFetch({
			[ACP_TOKEN_URL]: { body: ACCESS_BODY },
			[ANTIGRAVITY_URL]: { body: ANTIGRAVITY_BODY },
		})
		const { deps, logs } = makeDeps(fetch, acpFiles(), runCommand, () => AGY)
		deps.acpTokenPaths = () => [ACP_PATH]
		const rows = await sampleQuota(deps)
		expect(calls.map((call) => call.url)).toEqual([ACP_TOKEN_URL, ANTIGRAVITY_URL])
		const tokenCall = calls[0]
		expect(tokenCall?.init.method).toBe("POST")
		expect(tokenCall?.init.headers["Content-Type"]).toBe("application/x-www-form-urlencoded")
		expect(tokenCall?.init.signal).toBeDefined()
		const form = new URLSearchParams(tokenCall?.init.body)
		expect(form.get("grant_type")).toBe("refresh_token")
		expect(form.get("client_id")).toBe(ACP_CLIENT_ID)
		expect(form.get("client_secret")).toBe(ACP_CLIENT_SECRET)
		expect(form.get("refresh_token")).toBe(ACP_REFRESH_TOKEN)
		expect(calls[1]?.init.headers["Authorization"]).toBe(`Bearer ${ACP_ACCESS_TOKEN}`)
		expect(rows.filter((row) => row.plan === "antigravity")).toHaveLength(2)
		expect(commands.filter((argv) => argv[0] === AGY)).toEqual([])
		expect(logs).toContain("quota: antigravity token refreshed from acp_token.json")
		expect(logs).toContain("quota: antigravity sampled 2 rows")
		const joined = logs.join("\n")
		expect(joined).not.toContain(ACP_REFRESH_TOKEN)
		expect(joined).not.toContain(ACP_CLIENT_SECRET)
		expect(joined).not.toContain(ACP_ACCESS_TOKEN)
	})

	test("falls through to agy models when the token endpoint refuses the refresh", async () => {
		const files = acpFiles()
		const commands: string[][] = []
		const runCommand: CommandRunner = async (argv) => {
			commands.push([...argv])
			if (argv[0] === AGY) {
				files[ANTIGRAVITY_PATH] = antigravityTokenFile("synthetic-agy-fresh", NOW + 60_000)
				return { exitCode: 0, stdout: "synthetic model list" }
			}
			return { exitCode: 0, stdout: MUSE_STDOUT }
		}
		const { calls, fetch } = fakeFetch({
			[ACP_TOKEN_URL]: { status: 400, body: {} },
			[ANTIGRAVITY_URL]: { body: ANTIGRAVITY_BODY },
		})
		const { deps, logs } = makeDeps(fetch, files, runCommand, () => AGY)
		deps.acpTokenPaths = () => [ACP_PATH]
		const rows = await sampleQuota(deps)
		expect(commands.filter((argv) => argv[0] === AGY)).toEqual([[AGY, "models"]])
		expect(calls.map((call) => call.url)).toEqual([ACP_TOKEN_URL, ANTIGRAVITY_URL])
		expect(calls[1]?.init.headers["Authorization"]).toBe("Bearer synthetic-agy-fresh")
		expect(rows.filter((row) => row.plan === "antigravity")).toHaveLength(2)
		expect(logs).not.toContain("quota: antigravity token refreshed from acp_token.json")
	})

	test("never calls the token endpoint when a fresh token file exists", async () => {
		const files = {
			...acpFiles(),
			[ANTIGRAVITY_PATH]: antigravityTokenFile("synthetic-fresh", NOW + 60_000),
		}
		const { calls, fetch } = fakeFetch({ [ANTIGRAVITY_URL]: { body: ANTIGRAVITY_BODY } })
		const { deps } = makeDeps(fetch, files, noCommands, () => AGY)
		deps.acpTokenPaths = () => [ACP_PATH]
		const rows = await sampleQuota(deps)
		expect(calls.map((call) => call.url)).toEqual([ANTIGRAVITY_URL])
		expect(calls[0]?.init.headers["Authorization"]).toBe("Bearer synthetic-fresh")
		expect(rows.filter((row) => row.plan === "antigravity")).toHaveLength(2)
	})
})
