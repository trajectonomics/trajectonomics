import { spawn } from "node:child_process"
import { selfCommand } from "../dashboard/run"

/**
 * The environment variable that tells a re-run of this same binary to post one event and exit.
 * It is set only on the detached child `spawnSender` starts, never by a person.
 */
export const EVENT_VARIABLE = "TRAJ_TELEMETRY_EVENT"

/**
 * Starts a detached copy of this binary that posts `body` and exits, so the command the person ran
 * never waits on the network (ADR-0045). The child's stdio is ignored and it is unreferenced, so the
 * parent may exit at once. A spawn that fails is not an error the command can act on, and the
 * `error` listener keeps it from crashing the parent.
 */
export function spawnSender(body: string): void {
	const self = selfCommand()
	const child = spawn(self.binary, self.prefix, {
		detached: true,
		stdio: "ignore",
		windowsHide: true,
		env: { ...process.env, [EVENT_VARIABLE]: body },
	})
	child.on("error", () => {})
	child.unref()
}
