import type { Leaf } from "../command"
import { dashboardDeps } from "../dashboard/deps"
import { dashboardLeaf } from "../dashboard/leaf"

/** `traj dashboard`: the Dashboard of this ledger on 127.0.0.1 (ADR-0041). */
export const dashboard: Leaf = dashboardLeaf(dashboardDeps)
