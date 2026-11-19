import { checkRelease } from "./release-status"

const check = await checkRelease()
if (check.status === "drift") {
	console.error(`release:check: ${check.message}`)
	process.exit(1)
}
console.log(`release:check: ${check.message}`)
