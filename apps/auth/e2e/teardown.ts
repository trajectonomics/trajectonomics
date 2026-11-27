/** Removes the scratch database a finished or failed browser run owned. */
import { removeMarker, removeScratch, scratchDir } from "./scratch"

export default function teardown(): void {
	const directory = scratchDir()
	if (directory?.includes("traj-auth-e2e-")) removeScratch(directory)
	removeMarker()
}
