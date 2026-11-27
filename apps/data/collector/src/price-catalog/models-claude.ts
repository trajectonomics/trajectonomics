import { type ModelPrice, model } from "./types"

const URL = "https://platform.claude.com/docs/en/about-claude/pricing"

/** Anthropic's list prices per million tokens, as its pricing page states them. */
export const claudeModels: Readonly<Record<string, ModelPrice>> = {
	"claude-opus-5-5": model(
		4,
		20,
		0.2,
		5,
		URL,
		"| Claude Opus 5.5 | $4 / MTok | $5 / MTok | $8 / MTok | $0.20 / MTok | $20 / MTok |",
	),
	"claude-sonnet-5-5": model(
		2,
		10,
		0.1,
		2.5,
		URL,
		"| Claude Sonnet 5.5 | $2 / MTok | $2.50 / MTok | $4 / MTok | $0.10 / MTok | $10 / MTok |",
	),
	"claude-haiku-5-5": model(
		0.1,
		0.5,
		0.01,
		0.125,
		URL,
		"| Claude Haiku 5.5 (for prompts up to 100,000 tokens) | $0.10 / MTok | $0.125 / MTok | $0.20 / MTok | $0.01 / MTok | $0.50 / MTok |",
	),
	"claude-fable-5-2": model(
		8,
		40,
		0.2,
		10,
		URL,
		"| Claude Fable 5.2 | $8 / MTok | $10 / MTok | $16 / MTok | $0.20 / MTok | $40 / MTok |",
	),
}
