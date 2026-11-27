# Third-party notices

This repository vendors third-party agent skills. Each is MIT-licensed, and the MIT licence requires its copyright and permission notice to travel with every copy, so they are reproduced here in full.

The copies live under `.agents/skills/` and are pinned by content hash in [`skills-lock.json`](skills-lock.json) (`computedHash`; entries added from 2026-11-27 on also record the upstream `commit`). They are the only third-party skill content copied into this repository. `bun run check` fails when a source in `skills-lock.json` has no section below, or when a locked skill is missing from its source's `Copies:` list: add a new skill's `` `.agents/skills/<name>/` `` to that list, and give a new source its own `## owner/repo` section with its copyright line and licence text.

Other third-party files carry their notice beside them: the Lucide icons in `apps/web/src/components/shell/nav-icons.ts` and `nav-icons-plan.ts` (ISC, inline), the brand fonts in `packages/brand/brands/trajectonomics/assets/fonts/` (SIL OFL 1.1, with their licence files), and `apps/site/e2e/fonts/NotoSansThai.ttf` (SIL OFL 1.1, in the font's own name table).

The first-party skills in `skills/customer/` and `skills/internal/` are not copies of upstream content, and the published `@trajectonomics/skills` package ships none of the vendored skills. `skills/internal/profiles/factory.json` names `cloudflare/skills` (Apache-2.0) as an install source for other repositories, but no file of it is copied here.

## mattpocock/skills

- Source: https://github.com/mattpocock/skills
- Licence: MIT
- Copies: `.agents/skills/ask-matt/`, `.agents/skills/chief-of-staff/`, `.agents/skills/claude-handoff/`, `.agents/skills/code-review/`, `.agents/skills/codebase-design/`, `.agents/skills/diagnosing-bugs/`, `.agents/skills/domain-modeling/`, `.agents/skills/git-guardrails-claude-code/`, `.agents/skills/grill-me/`, `.agents/skills/grill-with-docs/`, `.agents/skills/grilling/`, `.agents/skills/handoff/`, `.agents/skills/implement/`, `.agents/skills/implement-spec/`, `.agents/skills/improve-codebase-architecture/`, `.agents/skills/loop-me/`, `.agents/skills/migrate-to-shoehorn/`, `.agents/skills/pr/`, `.agents/skills/prototype/`, `.agents/skills/research/`, `.agents/skills/retro/`, `.agents/skills/scaffold-exercises/`, `.agents/skills/setup-matt-pocock-skills/`, `.agents/skills/setup-pre-commit/`, `.agents/skills/setup-ts-deep-modules/`, `.agents/skills/tdd/`, `.agents/skills/teach/`, `.agents/skills/to-questionnaire/`, `.agents/skills/to-spec/`, `.agents/skills/to-tickets/`, `.agents/skills/triage/`, `.agents/skills/wait-what/`, `.agents/skills/wayfinder/`, `.agents/skills/wizard/`, `.agents/skills/writing-beats/`, `.agents/skills/writing-for-agents/`, `.agents/skills/writing-fragments/`, `.agents/skills/writing-shape/`

```text
MIT License

Copyright (c) 2026 Matt Pocock

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## RefoundAI/lenny-skills

- Source: https://github.com/RefoundAI/lenny-skills
- Licence: MIT
- Copies: `.agents/skills/goal-setting-okrs/`

```text
MIT License

Copyright (c) 2025 Refound AI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## aref-vc/tufte-claude-skill

- Source: https://github.com/aref-vc/tufte-claude-skill
- Licence: MIT
- Copies: `.agents/skills/tufte/`

```text
MIT License

Copyright (c) 2026 tufte-claude-skill contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## ibelick/ui-skills

- Source: https://github.com/ibelick/ui-skills
- Licence: MIT
- Copies: `.agents/skills/fixing-accessibility/`

```text
MIT License

Copyright (c) 2026 Julien Thibeaut

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## simple-icons/simple-icons

- Source: https://github.com/simple-icons/simple-icons
- Version: 16.38.1
- Licence: CC0-1.0
- Copies: `apps/data/src/lib/plan-logos.ts` (each plan mark's path data only)

Simple Icons dedicates its marks to the public domain under CC0 1.0. The marks belong to their owners and are shown only to identify each plan.
