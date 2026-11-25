// Serves the built Dashboard (dist/, what `vite build` wrote) on loopback, for the browser checks only.
// A route is `<route>/index.html` (trailingSlash "always"), so a directory path serves its index. The
// Demo snapshot is in dist/demo/snapshot.json, which `?demo=1` reads. This is not the Dashboard's server
// (scripts/serve.ts): it has no Edit path, and it never listens beyond 127.0.0.1.
import { join, normalize } from "node:path"
import { BROWSER_PORT } from "./base-url"

const DIST = join(import.meta.dir, "..", "dist")

for (const built of ["index.html", "demo/snapshot.json"]) {
	if (!(await Bun.file(join(DIST, built)).exists())) {
		console.error(
			`dist/${built} is missing. Build the Dashboard first: bunx turbo run @trajectonomics/web#build (from the repository root).`,
		)
		process.exit(1)
	}
}

Bun.serve({
	hostname: "127.0.0.1",
	port: BROWSER_PORT,
	async fetch(request) {
		const { pathname } = new URL(request.url)
		const relative = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "")
		const target = join(DIST, relative.endsWith("/") ? `${relative}index.html` : relative)
		if (!target.startsWith(DIST)) return new Response("Not found", { status: 404 })
		const file = Bun.file(target)
		if (!(await file.exists())) return new Response("Not found", { status: 404 })
		return new Response(file, { headers: { "Cache-Control": "no-store" } })
	},
})
