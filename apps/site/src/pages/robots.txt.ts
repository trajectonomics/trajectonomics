import { ROBOTS } from "../lib/crawl/robots"

/** The Robots file: the build writes it to the assets root as `robots.txt`, which the Worker serves. */
export function GET(): Response {
	return new Response(ROBOTS, { headers: { "content-type": "text/plain" } })
}
