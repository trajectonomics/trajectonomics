import { SITE_HOME_LOAD, SITE_HOME_PATH } from "../../lib/site-home"

/** The Source link's destination: this repository. */
const SOURCE_URL = "https://github.com/trajectonomics/docs"

/** The License link's destination: the MIT license this repository ships. */
const LICENSE_URL = `${SOURCE_URL}/blob/main/LICENSE`

/**
 * The Landing Page's own ending: a hairline above Site Home, Source and License, at the bottom of
 * the page body. It is a block of links, not a `<footer>`, because the home layout puts the page
 * body inside `<main>`, where a footer exposes no `contentinfo` landmark.
 */
export function LandingEnding() {
	return (
		<div className="mt-auto border-t pt-6">
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
