---
title: One answer, every time
description: Ask an agent the same money question twice and you can get two different numbers. Ask traj, and you get the same one every time. Here is why, and how to check it yourself.
type: guide
publishedOn: 2026-11-22
cover:
  src: /posts/one-answer-every-time/cover.webp
  alt: Three cream robots with orange eyes wave from sand dunes under an orange sun, beside the words "One answer, every time. Deterministic by design."
  width: 1024
  height: 1024
---

An AI agent is good at the parts of a financial plan that need judgement. It asks what you earn, notices what you forgot, and explains a result in your own words. It is less good at being the calculator. A language model writes its answer by sampling, so the same agent, asked the same money question twice, can give you two different numbers.

<figure>
  <img src="/posts/one-answer-every-time/alone.webp" alt="Three identical robots on sand dunes each hold up a card with a different bar chart, and glance at each other's cards." width="1600" height="900" loading="lazy" />
  <figcaption>The same agent, the same question, three answers.</figcaption>
</figure>

That is fine for a paragraph of advice. It is not fine for a retirement plan you mean to come back to next year. If the number moves, you need to know whether your life changed or the model did.

## The agent judges, traj computes

traj splits the work in two. Your agent supplies the judgement: it asks you for the facts, decides what to run, and reads the result back to you. The arithmetic happens in `traj`, a command line that [never calls a model](https://github.com/trajectonomics/trajectonomics/blob/main/apps/cli/docs/adr/0001-agent-first-no-llm.md). So every number your agent quotes is one `traj` returned, and `traj` returns the same one each time you ask.

<figure>
  <img src="/posts/one-answer-every-time/with-traj.webp" alt="Three identical robots stand in a row on sand dunes, each holding the same bar chart, joined by a thin orange line." width="1600" height="900" loading="lazy" />
  <figcaption>The same agents with traj: one question, one answer.</figcaption>
</figure>

## What keeps the answer the same

Not calling a model is the start. A program can still drift in quieter ways, so `traj` closes each of them:

- **No floating point for money.** Amounts are whole numbers of the smallest unit, satang for baht. `1.005` baht becomes 101 satang, not the 100 that floating-point rounding gives. As the [money package](https://github.com/trajectonomics/trajectonomics/blob/main/packages/core/money/README.md) puts it, float noise never decides.
- **Exact integer growth.** Interest compounds in whole-number arithmetic. When we compared two JavaScript engines, their built-in `Math.pow`, `exp` and `log` disagreed on 228 of 10,296 results, so the projection engine [uses none of them](https://github.com/trajectonomics/trajectonomics/blob/main/packages/core/sim/docs/adr/0001-exact-integer-compounding.md).
- **No clock.** Every date a command acts on is one you pass. "Today" is a date you give, so a command you run tomorrow answers the same question it answered today ([ADR 0018](https://github.com/trajectonomics/trajectonomics/blob/main/apps/cli/docs/adr/0018-no-clock-in-ledger-commands.md), [ADR 0029](https://github.com/trajectonomics/trajectonomics/blob/main/apps/cli/docs/adr/0029-reads-take-their-date-from-the-caller.md)).
- **One output format.** Your agent asks for JSON on every call, and the format is never guessed from the terminal, so a pipe and a screen cannot disagree ([ADR 0010](https://github.com/trajectonomics/trajectonomics/blob/main/apps/cli/docs/adr/0010-output-contract.md)).

## Check it yourself

Here is a 30-year projection. A salary of 40,000 THB a month grows with 3% inflation, and all of it is saved into one cash account earning 4.5% a year, from 31 March 2026. No tax is applied, so the figures are before tax.

Save this as `base.json`. Amounts are in satang, and rates are in basis points:

```json
{
  "schemaVersion": 4,
  "currency": "THB",
  "economy": { "inflation": 300 },
  "accounts": [{ "id": "cash", "kind": "asset", "rate": 450 }],
  "flows": [
    {
      "id": "salary",
      "kind": "income",
      "earned": true,
      "amount": 4000000,
      "frequency": "monthly",
      "start": "2026-01-01",
      "growth": "inflation"
    }
  ],
  "cashflow": {
    "surplus": [{ "account": "cash" }],
    "contribute": [],
    "withdraw": []
  }
}
```

Then run it in a throwaway ledger, so your own data is not touched. This needs `traj` 0.4.0 and `jq`. On macOS, use `shasum -a 256` in place of `sha256sum`:

```sh
export TRAJ_HOME="$(mktemp -d)"
traj init
traj scenario apply base --file base.json
traj projection run --scenario base \
  --as-of 2026-03-31 --horizon 2056-03-30 --json \
  | jq -c .tables | sha256sum
```

We ran it five times with `traj` 0.4.0, and again in a second fresh ledger. Every run printed the same hash:

```text
dd9bc2f0dd33caed788ad28b92742748ed95c3f683e332af577a6f466fb807ad
```

Every run also gave the same closing net worth on 30 March 2056: 43,504,723.86 THB, or 17,924,821.75 THB in real terms after the plan's 3% inflation. Run it on your machine and you should see the same hash, down to the last satang. If you don't, that is a bug, and we want to hear about it.

<figure>
  <img src="/posts/one-answer-every-time/same-output.webp" alt="A robot drops blocks into a small cream machine, which hands out a card with a bar chart; a neat stack of identical cards lies behind it." width="1600" height="900" loading="lazy" />
  <figcaption>Same inputs in, the same card out, every time.</figcaption>
</figure>

## What deterministic does not mean

Deterministic is not the same as right. `traj` computes exactly what your plan says. If an assumption is wrong, such as a 4.5% return you will not get, the answer will be wrong in exactly the same way every time. That is the reason to keep the judgement with you and your agent, and the arithmetic in a tool whose work you can check.

`traj` works in Thai baht today. It is free and open source, and it keeps your ledger on your own machine.

## Try it

Install `traj` and give your agent the setup skill. The commands are on the [installation page](https://docs.trajectonomics.com/cli/installation/). Then ask your agent a question about your money twice, and compare the answers.
