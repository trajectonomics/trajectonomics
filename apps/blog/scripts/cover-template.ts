/** Inputs for rendering a 1024x1024 thumbnail-style blog cover. */
export interface CoverTemplateInput {
	readonly imageDataUri: string
	readonly markSvg: string
	readonly fontsCss: string
	readonly title: string
	readonly kicker?: string
	/** Shifts the underlying illustration downward in px to open dark sky for the title. */
	readonly shiftY?: number
	readonly titleSizePx?: number
	readonly colors: {
		readonly background: string
		readonly foreground: string
		readonly accent: string
	}
}

/** Parsed CLI flags for `scripts/render-cover.ts`. */
export interface CoverCliOptions {
	readonly input: string
	readonly output: string
	readonly title: string
	readonly kicker?: string
	readonly shiftY: number
	readonly titleSizePx: number
}

const ALLOWED_FLAGS = new Set(["in", "out", "title", "kicker", "shift", "size"])
const THAI = /[\u0E00-\u0E7F]/

function escapeHtml(text: string): string {
	return text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
}

function readFlags(argv: readonly string[]): Map<string, string> {
	const values = new Map<string, string>()
	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i]
		if (!arg?.startsWith("--")) throw new Error(`Unexpected argument: ${arg}`)
		const key = arg.slice(2)
		if (!ALLOWED_FLAGS.has(key)) throw new Error(`Unknown flag: ${arg}`)
		const next = argv[i + 1]
		if (next === undefined || next.startsWith("--")) throw new Error(`Missing value for ${arg}`)
		values.set(key, next)
		i += 1
	}
	return values
}

function readNumber(
	values: ReadonlyMap<string, string>,
	key: string,
	fallback: number,
	positive: boolean,
): number {
	const raw = values.get(key)
	if (raw === undefined) return fallback
	const value = raw.trim() === "" ? Number.NaN : Number(raw)
	if (!Number.isFinite(value) || (positive && value <= 0)) {
		throw new Error(`Invalid numeric value for --${key}: ${raw}`)
	}
	return value
}

/** Parses CLI flags (`--in`, `--out`, `--title`, optional `--kicker`, `--shift`, `--size`). */
export function parseCoverArgs(argv: readonly string[]): CoverCliOptions {
	const values = readFlags(argv)
	const input = values.get("in")
	const output = values.get("out")
	const rawTitle = values.get("title")
	if (!input || !output || !rawTitle) {
		throw new Error("Usage: bun run cover --in <file> --out <file.webp> --title <text>")
	}
	const title = rawTitle.replaceAll("\\n", "\n")
	if (title.split("\n").length > 2) throw new Error("--title accepts at most 2 lines")
	const kicker = values.get("kicker")
	return Object.freeze({
		input,
		output,
		title,
		...(kicker ? { kicker } : {}),
		shiftY: readNumber(values, "shift", 0, false),
		titleSizePx: readNumber(values, "size", 78, true),
	})
}

/** Pure HTML document for a 1024x1024 blog cover with title, optional orange kicker and brand mark. */
export function buildCoverHtml(input: CoverTemplateInput): string {
	const { colors, fontsCss, imageDataUri, markSvg, title, kicker } = input
	const shiftY = input.shiftY ?? 0
	const titleSizePx = input.titleSizePx ?? 78
	const titleLines = title.split("\n").map(escapeHtml).join("<br />")
	const titleTracking = THAI.test(title) ? "-0.01em" : "-0.03em"
	const thaiKicker = kicker !== undefined && THAI.test(kicker)
	const kickerFont = thaiKicker
		? '"Inter", "Noto Sans Thai", sans-serif'
		: '"Azeret Mono", monospace'
	const kickerWeight = thaiKicker ? 600 : 500
	const kickerTracking = thaiKicker ? "0em" : "0.06em"
	const fadeMask =
		shiftY > 0
			? `mask-image: linear-gradient(to bottom, transparent 0%, ${colors.background} 22%);`
			: ""
	const kickerHtml = kicker ? `<p class="kicker">${escapeHtml(kicker)}</p>` : ""
	return `<!doctype html><html lang="th"><head><meta charset="utf-8" /><style>
${fontsCss}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 1024px; height: 1024px; overflow: hidden; background: ${colors.background}; }
.stage { position: relative; width: 1024px; height: 1024px; background: ${colors.background}; }
.art { position: absolute; inset: 0; width: 1024px; height: 1024px; object-fit: cover;
  transform: translateY(${shiftY}px); ${fadeMask} }
.scrim { position: absolute; inset: 0; background:
  radial-gradient(ellipse 88% 48% at 28% 12%, color-mix(in srgb, ${colors.background} 90%, transparent) 0%,
    color-mix(in srgb, ${colors.background} 45%, transparent) 58%, transparent 100%); }
.mark { position: absolute; top: 52px; right: 52px; width: 72px; height: 72px; color: ${colors.foreground}; opacity: 0.92; }
.mark svg { width: 100%; height: 100%; display: block; }
.copy { position: absolute; top: 52px; left: 56px; max-width: 760px; }
h1 { font-family: "Inter", "Noto Sans Thai", sans-serif; font-size: ${titleSizePx}px;
  font-weight: 700; line-height: 1.16; letter-spacing: ${titleTracking}; color: ${colors.foreground};
  text-shadow: 0 4px 28px color-mix(in srgb, ${colors.background} 92%, transparent); }
.kicker { margin-top: 16px; font-family: ${kickerFont}; font-size: 40px; font-weight: ${kickerWeight};
  line-height: 1.25; letter-spacing: ${kickerTracking}; text-transform: uppercase; color: ${colors.accent};
  text-shadow: 0 2px 20px color-mix(in srgb, ${colors.background} 94%, transparent); }
</style></head><body><div class="stage">
<img class="art" src="${imageDataUri}" alt="" /><div class="scrim"></div>
<div class="mark">${markSvg}</div><div class="copy"><h1>${titleLines}</h1>${kickerHtml}</div>
</div></body></html>`
}
