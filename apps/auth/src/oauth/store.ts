import { hashToken } from "./values"

export type StoredRefreshToken = {
	clientId: string
	userId: string
	resources?: unknown
}
export type StoredConsent = {
	id: string
	clientId: string
	userId?: string | null
	scopes?: unknown
	resources?: unknown
	referenceId?: string | null
	createdAt?: unknown
}
export type StoredDeviceCode = {
	clientId?: string | null
	userId?: string | null
	status?: string | null
	scope?: string | null
	resources?: unknown
}

type Adapter = {
	findOne: (input: {
		model: string
		where: Array<{ field: string; value: unknown }>
	}) => Promise<unknown>
	findMany: (input: {
		model: string
		where: Array<{ field: string; value: unknown }>
	}) => Promise<unknown[]>
	create: (input: { model: string; data: Record<string, unknown> }) => Promise<unknown>
	update: (input: {
		model: string
		where: Array<{ field: string; value: unknown }>
		update: Record<string, unknown>
	}) => Promise<unknown>
}

export function adapterOf(ctx: { context: unknown }): Adapter {
	return (ctx.context as { adapter: Adapter }).adapter
}

export async function findRefreshToken(
	ctx: { context: unknown },
	raw: string,
): Promise<StoredRefreshToken | null> {
	const row = await adapterOf(ctx).findOne({
		model: "oauthRefreshToken",
		where: [{ field: "token", value: await hashToken(raw) }],
	})
	return row === null ? null : (row as StoredRefreshToken)
}

export async function findConsent(
	ctx: { context: unknown },
	clientId: string,
	userId: string,
): Promise<StoredConsent | null> {
	const rows = (await adapterOf(ctx).findMany({
		model: "oauthConsent",
		where: [
			{ field: "clientId", value: clientId },
			{ field: "userId", value: userId },
		],
	})) as StoredConsent[]
	return rows.find(isDefaultConsent) ?? rows[0] ?? null
}

export async function findDeviceCode(
	ctx: { context: unknown },
	userCode: string,
): Promise<StoredDeviceCode | null> {
	const row = await adapterOf(ctx).findOne({
		model: "deviceCode",
		where: [{ field: "userCode", value: userCode }],
	})
	return row === null ? null : (row as StoredDeviceCode)
}

export async function findDeviceCodeByCode(
	ctx: { context: unknown },
	deviceCode: string,
): Promise<StoredDeviceCode | null> {
	const row = await adapterOf(ctx).findOne({
		model: "deviceCode",
		where: [{ field: "deviceCode", value: deviceCode }],
	})
	return row === null ? null : (row as StoredDeviceCode)
}

function isDefaultConsent(consent: StoredConsent): boolean {
	return (
		consent.referenceId === null || consent.referenceId === undefined || consent.referenceId === ""
	)
}
