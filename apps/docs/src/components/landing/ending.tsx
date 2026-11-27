import { SITE_HOME_LOAD, SITE_HOME_PATH } from "../../lib/site-home"
import { Mascot } from "../mascot"

/** The Source link's destination: the Docs Portal's package in the monorepo. */
const SOURCE_URL = "https://github.com/trajectonomics/trajectonomics/tree/main/apps/docs"

/** The License link's destination: the AGPL-3.0-only license the Docs Portal ships. */
const LICENSE_URL = "https://github.com/trajectonomics/trajectonomics/blob/main/apps/docs/LICENSE"

/**
 * The Landing Page's own ending: a hairline above Site Home, Source and License, at the bottom of
 * the page body. It is a block of links, not a `<footer>`, because the home layout puts the page
 * body inside `<main>`, where a footer exposes no `contentinfo` landmark.
 */
export function LandingEnding() {
	return (
		<div className="relative mt-auto border-t pt-6">
			{/* The Mascot stands on the ending's hairline at the far end, at rest and out of the
			    links' way (docs ADR 0018). It is below the first view, so it loads lazily. */}
			<Mascot pose="wave" className="absolute right-0 bottom-full mb-px w-12 lg:w-[52px]" />
			<ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-fd-muted-foreground">
				<li>
					<a
						href={SITE_HOME_PATH}
						{...SITE_HOME_LOAD}
						className="transition-colors hover:text-fd-accent-foreground"
					>
						Site Home
					</a>
				</li>
				<li>
					<a href={SOURCE_URL} className="transition-colors hover:text-fd-accent-foreground">
						Source
					</a>
				</li>
				<li>
					<a href={LICENSE_URL} className="transition-colors hover:text-fd-accent-foreground">
						License
					</a>
				</li>
			</ul>
		</div>
	)
}
