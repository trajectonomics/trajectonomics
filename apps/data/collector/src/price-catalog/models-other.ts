import { type ModelPrice, model } from "./types"

const DEEPSEEK = "https://api-docs.deepseek.com/quick_start/pricing"
const GEMINI = "https://aistudio.google.com/docs/pricing"
const GROK = "https://docs.x.ai/docs/models"
const ZAI = "https://docs.z.ai/guides/overview/pricing"
const MINIMAX = "https://platform.minimax.io/docs/guides/pricing-paygo"

/**
 * The other vendors' list prices per million tokens. DeepSeek's figures are its off-peak prices;
 * peak prices are double, which the notes behind a chart say.
 */
export const otherModels: Readonly<Record<string, ModelPrice>> = {
	"deepseek-v4.1-flash": model(
		0.15,
		0.6,
		0.003,
		null,
		DEEPSEEK,
		"deepseek-flash (DeepSeek-V4.1-Flash-1017): cache hit $0.003, cache miss $0.15, output $0.6 (off-peak)",
	),
	"deepseek-v4-pro": model(
		0.66,
		1.98,
		0.022,
		null,
		DEEPSEEK,
		"deepseek-pro: cache hit $0.022, cache miss $0.66, output $1.98 (off-peak)",
	),
	"gemini-4-hydrogen": model(
		1.5,
		7.5,
		0.075,
		null,
		GEMINI,
		"Gemini 4 Hydrogen: input $1.50, cached input $0.075, output $7.50 per 1M tokens",
	),
	"gemini-4-argon": model(
		2,
		10,
		0.1,
		null,
		GEMINI,
		"Gemini 4 Argon: input $2, cached input $0.10, output $10 per 1M tokens",
	),
	"grok-4.7": model(
		2,
		6,
		0.5,
		null,
		GROK,
		"Grok 4.7 (under 200k prompt): input $2, cached input $0.50, output $6 per 1M tokens",
	),
	"glm-5.3-flash": model(
		0.15,
		0.5,
		0.03,
		null,
		ZAI,
		"GLM-5.3-Flash: input $0.15, cached input $0.03, output $0.50 per 1M tokens",
	),
	"minimax-m3": model(
		0.3,
		1.2,
		0.06,
		null,
		MINIMAX,
		"MiniMax M3: input $0.30, cached input $0.06, output $1.20 per 1M tokens",
	),
}
