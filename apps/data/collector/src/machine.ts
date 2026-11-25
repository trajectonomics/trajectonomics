import { createHash } from "node:crypto"

/**
 * The machine label sent with every row: `m-` plus the first 8 hex chars of
 * SHA-256(hostname). Raw hostnames never appear in output.
 */
export function machineAlias(hostname: string): string {
	return `m-${createHash("sha256").update(hostname).digest("hex").slice(0, 8)}`
}
