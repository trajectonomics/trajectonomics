/**
 * Prepares one scratch D1 database for the browser checks. `test:e2e` runs this before Playwright,
 * because the Worker needs the migrated database the moment its web server starts.
 */
import { applyMigrations, createScratch, removeScratch, scratchDir, writeScratch } from "./scratch"

const previous = scratchDir()
if (previous?.includes("traj-auth-e2e-")) removeScratch(previous)

const directory = createScratch()
applyMigrations(directory)
writeScratch(directory)
console.log(`e2e scratch: ${directory}`)
