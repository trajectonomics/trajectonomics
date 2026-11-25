// Serves the hosted Demo (dist-hosted/, what `bun run build:hosted` wrote) on loopback under /demo/, as the Site will
// serve it, for the browser checks only. Anything outside /demo/ is a 404, so a request that leaves the base path fails
// instead of being answered by the loopback build's pages.
import { join, normalize } from "node:path"
import { HOSTED_PORT, HOSTED_PREFIX } from "./base-url"

const DIST = join(import.meta.dir, "..", "dist-hosted")

for (const built of ["index.html", "demo/snapshot.json"]) {
	if (!(await Bun.file(join(DIST, built)).exists())) {
		console.error(
			`dist-hosted/${built} is missing. Build the hosted Demo first: bunx turbo run @trajectonomics/web#build:hosted (from the repository root).`,
		)
		process.exit(1)
	}
}

Bun.serve({
	hostname: "127.0.0.1",
	port: HOSTED_PORT,
	async fetch(request) {
		const { pathname } = new URL(request.url)
		if (!pathname.startsWith(`${HOSTED_PREFIX}/`)) return new Response("Not found", { status: 404 })
		const relative = normalize(decodeURIComponent(pathname.slice(HOSTED_PREFIX.length))).replace(
			/^(\.\.[/\\])+/,
			"",
		)
		const target = join(DIST, relative.endsWith("/") ? `${relative}index.html` : relative)
		if (!target.startsWith(DIST)) return new Response("Not found", { status: 404 })
		const file = Bun.file(target)
		if (!(await file.exists())) return new Response("Not found", { status: 404 })
		return new Response(file, { headers: { "Cache-Control": "no-store" } })
	},
})
