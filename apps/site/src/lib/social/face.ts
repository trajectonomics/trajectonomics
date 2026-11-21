/** The start of Thai script, which is the one script the brand faces do not carry a glyph for. */
const THAI_SCRIPT = /[\u0E00-\u0E7F]/

/** The face Thai is set in: the family the Theme's own sans stack names, and the file the baselines pin. */
export const THAI_FACE = "Noto Sans Thai"

/** The face the statement is set in when it carries no Thai: the Brand Typeface's display cut. */
export const STATEMENT_FACE = "Aleo"

/** The face the meta layer is set in when it carries no Thai: the Brand Typeface's mono cut. */
export const META_FACE = "Azeret Mono"

/**
 * The face one run of text is set in: the Thai face when it carries Thai script, its own brand face
 * otherwise. A run is set in one face because the rasterizer resolves a face per text node, so a Thai
 * sentence that carries a Latin word is set in the Thai face — which covers both.
 */
export function faceFor(text: string, brand: string): string {
	return THAI_SCRIPT.test(text) ? THAI_FACE : brand
}
