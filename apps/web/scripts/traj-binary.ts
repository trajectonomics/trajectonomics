import { spawnCapture } from "./spawn"

/** Where the `traj` binary comes from: the flag, then the environment, then the PATH. */
export function binaryCandidate(
	flag: string | null,
	env: Record<string, string | undefined>,
): string | null {
	return flag ?? env["TRAJ_BINARY_PATH"] ?? Bun.which("traj")
}

/** The result of asking whether the binary runs: its version, or why it does not. */
export type BinaryCheck =
	| { ok: true; binary: string; version: string }
	| { ok: false; message: string }

/** Runs `traj --version` once. The Snapshot records the version it printed. */
export async function checkBinary(
	flag: string | null,
	env: Record<string, string | undefined>,
): Promise<BinaryCheck> {
	const binary = binaryCandidate(flag, env)
	if (binary === null) {
		return {
			ok: false,
			message: "traj was not found: pass --traj PATH, set TRAJ_BINARY_PATH, or put traj on PATH.",
		}
	}
	try {
		const captured = await spawnCapture([binary, "--version"], { env })
		if (captured.code !== 0) {
			return { ok: false, message: `traj at ${binary} did not run: ${captured.stderr.trim()}` }
		}
		return { ok: true, binary, version: captured.stdout.trim() }
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error)
		return { ok: false, message: `traj at ${binary} did not start: ${reason}` }
	}
}
