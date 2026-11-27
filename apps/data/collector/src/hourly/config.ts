/** One machine the hourly runner collects from. */
export type HostConfig = {
	name: string
	ssh: string | null
	bun: string
	collectorDir: string
	quota: boolean
	skipOpenCodeBefore: string | null
}

/** The validated hosts file. */
export type HourlyConfig = { hosts: readonly HostConfig[] }

type JsonObject = Record<string, unknown>

const NAME = /^[a-z0-9][a-z0-9._-]{0,63}$/

function asObject(value: unknown, label: string): JsonObject {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new Error(`${label} must be an object`)
	}
	return value as JsonObject
}

function requiredString(record: JsonObject, key: string, label: string): string {
	const value = record[key]
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new Error(`${label}.${key} must be a non-empty string`)
	}
	return value
}

function parseHost(value: unknown, index: number, names: Set<string>): HostConfig {
	const label = `hosts[${index}]`
	const record = asObject(value, label)
	const name = requiredString(record, "name", label)
	if (!NAME.test(name)) throw new Error(`${label}.name must be a lowercase label`)
	if (names.has(name)) throw new Error(`${label}.name is duplicated: ${name}`)
	names.add(name)
	const ssh = record["ssh"]
	if (ssh !== null && (typeof ssh !== "string" || ssh.length === 0)) {
		throw new Error(`${label}.ssh must be a host string or null`)
	}
	const quota = record["quota"]
	if (typeof quota !== "boolean") throw new Error(`${label}.quota must be a boolean`)
	const skip = record["skipOpenCodeBefore"]
	let skipOpenCodeBefore: string | null = null
	if (skip !== null) {
		if (typeof skip !== "string" || Number.isNaN(Date.parse(skip))) {
			throw new Error(`${label}.skipOpenCodeBefore must be an ISO timestamp or null`)
		}
		skipOpenCodeBefore = new Date(Date.parse(skip)).toISOString()
	}
	return {
		name,
		ssh,
		bun: requiredString(record, "bun", label),
		collectorDir: requiredString(record, "collectorDir", label),
		quota,
		skipOpenCodeBefore,
	}
}

/** Validates a hosts file; unknown fields are ignored. */
export function parseHostsConfig(input: unknown): HourlyConfig {
	const root = asObject(input, "config")
	const hosts = root["hosts"]
	if (!Array.isArray(hosts) || hosts.length === 0) {
		throw new Error("config.hosts must be a non-empty array")
	}
	const names = new Set<string>()
	return { hosts: hosts.map((host, index) => parseHost(host, index, names)) }
}
