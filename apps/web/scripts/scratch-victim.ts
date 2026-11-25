import { makeScratch } from "./scratch"

// Run by `scratch.test.ts`: makes one scratch directory, prints it, and waits to be killed.
console.log(await makeScratch("traj-web-victim-"))
await Bun.sleep(60_000)
