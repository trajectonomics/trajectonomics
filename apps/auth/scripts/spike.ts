import { decodeJwt, type JSONWebKeySet } from "jose"
import { BASE_URL } from "./spike/config"
import {
	approveDevice,
	createClient,
	pollWhilePending,
	redeemDeviceCode,
	refresh,
	requestDeviceCode,
	signUp,
} from "./spike/flow"
import { Session } from "./spike/http"
import { buildReport } from "./spike/report"
import {
	applyMigrations,
	type LocalServer,
	makeScratch,
	removeScratch,
	startServer,
} from "./spike/server"

const scratch = makeScratch()
let server: LocalServer | undefined

try {
	applyMigrations(scratch)
	server = await startServer(scratch)
	const session = new Session()
	await signUp(session)
	const client = await createClient(session)
	const device = await requestDeviceCode(session, client.client_id)
	const pending = await pollWhilePending(session, client.client_id, device.device_code)
	await approveDevice(session, device.user_code)
	await Bun.sleep(device.interval * 1_000 + 100)
	const token = await redeemDeviceCode(session, client.client_id, device.device_code)
	const refreshed = await refresh(session, client.client_id, token.refresh_token ?? "")
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
