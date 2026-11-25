import { OPENJOT_PATH } from "../site"

/** The OpenJot page on the Site: one address, in every Language the Site speaks (ADR 0032). */
export { OPENJOT_PATH }

/** That address on the Site's own origin: every canonical, `og:url` and Sitemap entry names it. */
export const ABSOLUTE_OPENJOT_URL = `https://trajectonomics.com${OPENJOT_PATH}`

/**
 * Where a download starts: the OpenJot Worker's short link, which finds the newest `openjot-v*` APK and
 * counts the download. The Site's build never learns a release URL (ADR 0032).
 */
export const OPENJOT_DOWNLOAD_URL = "https://openjot.trajectonomics.com/download"

/** The same lookup's checksum file: the release's `SHA256SUMS`. */
export const OPENJOT_CHECKSUMS_URL = "https://openjot.trajectonomics.com/download/checksums"

/** Every `openjot-v*` release, with its notes and its checksums. */
export const OPENJOT_RELEASES_URL =
	"https://github.com/trajectonomics/trajectonomics/releases?q=openjot-v"

/** The app's source folder in the monorepo. */
export const OPENJOT_SOURCE_URL =
	"https://github.com/trajectonomics/trajectonomics/tree/main/apps/openjot"

/** The app's MIT licence. */
export const OPENJOT_LICENCE_URL =
	"https://github.com/trajectonomics/trajectonomics/blob/main/apps/openjot/LICENSE"

/**
 * The signing certificate's SHA-256 fingerprint, verbatim from the app's release docs: every released APK
 * is signed with the same key, and a file whose fingerprint differs must not be installed.
 */
export const OPENJOT_SIGNING_FINGERPRINT =
	"be15a0f5b17358990cecde23d3c49dc02a1741ee544006ac5b0114755041a3a1"
