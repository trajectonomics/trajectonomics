import type { Assets } from "../handle-request"

/** One asset answer: the bytes, the validator, and the cache control the assets layer writes. */
interface Asset {
	readonly body: string
	readonly etag: string
}

/** The answers the assets layer gives for the two Language homes and one crawler file. */
const ASSETS: Readonly<Record<string, Asset>> = Object.freeze({
	"/": { body: '<html lang="en">English</html>', etag: '"root-en"' },
	"/th/": { body: '<html lang="th">ไทย</html>', etag: '"thai-home"' },
	"/sitemap.xml": { body: "<urlset />", etag: '"sitemap"' },
})

/** What the fake assets layer was asked for, in the order it was asked. */
export interface Asked {
	readonly path: string
	readonly method: string
	readonly ifNoneMatch: string | null
}

/** An assets binding that answers from `ASSETS` and records each request it is handed. */
export function fakeAssets(asked: Asked[] = []): Assets {
	return {
		async fetch(request: Request): Promise<Response> {
			const url = new URL(request.url)
			asked.push({
				path: url.pathname,
				method: request.method,
				ifNoneMatch: request.headers.get("if-none-match"),
			})
			const asset = ASSETS[url.pathname]
			if (asset === undefined) return new Response("not found", { status: 404 })
			const headers = {
				"Content-Type": "text/html",
				ETag: asset.etag,
				"Cache-Control": "public, max-age=0, must-revalidate",
			}
			if (request.headers.get("if-none-match") === asset.etag) {
				return new Response(null, { status: 304, headers })
			}
			return new Response(asset.body, { status: 200, headers })
		},
	}
}

/** A request for one path on the Site's origin, with the headers a test names. */
export function get(path: string, headers: Record<string, string> = {}): Request {
	return new Request(`https://trajectonomics.com${path}`, { headers })
}

/** The body of a response, as text. */
export function contentOf(response: Response): Promise<string> {
	return response.text()
}
