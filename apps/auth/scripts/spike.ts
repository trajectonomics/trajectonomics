import { decodeJwt, type JSONWebKeySet } from "jose"
import { DATA_AUDIENCE } from "../src/auth"
import { BASE_URL, COLLECTOR_CLIENT_ID, SCOPES } from "./spike/config"
import {
	approveDevice,
	pollWhilePending,
	redeemDeviceCode,
	refresh,
	requestDeviceCode,
	signUp,
} from "./spike/flow"
import { runGateChecks } from "./spike/gates"
import { Session } from "./spike/http"
import { buildReport } from "./spike/report"
import {
	applyMigrations,
	type LocalServer,
	makeScratch,
	removeScratch,
	startServer,
} from "./spike/server"
import type { TokenResponse } from "./spike/types"

const scratch = makeScratch()
let server: LocalServer | undefined

try {
	applyMigrations(scratch)
	server = await startServer(scratch)
	const session = new Session()
	await signUp(session)

	// The seeded collector completes the full device flow for the data audience. No client is
	// created over HTTP, so `clientPrivileges` is closed and per-client resource enforcement is on.
	const device = await requestDeviceCode(session, COLLECTOR_CLIENT_ID, {
		scope: SCOPES,
		resources: [DATA_AUDIENCE],
	})
	const pending = await pollWhilePending(session, COLLECTOR_CLIENT_ID, device.device_code)
	await approveDevice(session, device.user_code)
	await Bun.sleep(device.interval * 1_000 + 100)
	const token = await redeemDeviceCode(session, COLLECTOR_CLIENT_ID, device.device_code)
	const refreshed = await refresh(session, COLLECTOR_CLIENT_ID, token.refresh_token ?? "")
	const noResourceToken = await runNoResourceGrant(session)
	const gates = await runGateChecks(session, refreshed.refresh_token ?? "", noResourceToken)

	const jwksResponse = await fetch(`${BASE_URL}/jwks`)
	if (!jwksResponse.ok) throw new Error(`/jwks -> ${jwksResponse.status}`)
	const jwks = (await jwksResponse.json()) as JSONWebKeySet
	const result = await buildReport({
		device,
		pending,
		token,
		refreshed,
		jwks,
		claims: decodeJwt(token.access_token),
		gates,
	})
	console.log(JSON.stringify(result.report, null, 2))
	if (!result.ok) process.exitCode = 1
} catch (error) {
	console.error(error)
	process.exitCode = 1
} finally {
	await server?.stop()
	removeScratch(scratch)
}

/** The no-resource grant is approved separately so its refresh can prove the widening rule. */
async function runNoResourceGrant(session: Session): Promise<TokenResponse> {
	const device = await requestDeviceCode(session, COLLECTOR_CLIENT_ID, {
		scope: "openid offline_access",
	})
	await approveDevice(session, device.user_code)
	await Bun.sleep(device.interval * 1_000 + 100)
	return redeemDeviceCode(session, COLLECTOR_CLIENT_ID, device.device_code)
}
