import { startDashboard } from "@trajectonomics/web/serve"
import pkg from "../../package.json"
import type { Leaf } from "../command"
import { dashboardLeaf } from "../dashboard/leaf"
import { untilStopped } from "../dashboard/run"

/** `traj dashboard`: the Dashboard of this ledger on 127.0.0.1 (ADR-0041). */
export const dashboard: Leaf = dashboardLeaf({
	start: (options) => startDashboard({ ...options, cliVersion: pkg.version }),
	untilStopped,
})
