import { startDashboard } from "@trajectonomics/web/serve"
import pkg from "../../package.json"
import { type DashboardDeps, untilStopped } from "./run"

/** What `traj dashboard` starts and waits on; a test swaps only the wait, so it never blocks. */
export const dashboardDeps: DashboardDeps = {
	start: (options) => startDashboard({ ...options, cliVersion: pkg.version }),
	untilStopped,
}
