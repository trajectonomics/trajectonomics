---
title: "เบื้องหลัง Software Factory: สถาปัตยกรรม AI ที่รันจริงในโปรเจกต์ 850+ PR"
description: "เบื้องหลังระบบ Software Factory ที่รันจริงใน Trajectonomics: Dispatcher ทุก 6 ชั่วโมง, สถาปัตยกรรม 6 ขั้น, Dual-Model Cross-Review Gate, ขอบเขตความปลอดภัย ADR 0011 และ 4 Exit ของ Ticket Run"
type: guide
publishedOn: 2026-11-23
cover:
  src: /blog/posts/software-factory/cover.webp
  alt: หุ่นยนต์สีครีมสองตัวตาสีส้มนั่งคนละฝั่งของโต๊ะไม้กลางเนินทราย ตัวซ้ายต่อบล็อกไม้ ตัวขวาส่องงานด้วยแว่นขยาย
  width: 1024
  height: 1024
---

ในคลิปผมเล่าถึง **Software Factory** ที่ผมสร้างและรันจริงในงานของ Trajectonomics จน merge PR ไปมากกว่า 800 อันในเวลาไม่ถึงเดือน โพสต์นี้เจาะลึกสถาปัตยกรรมจริงทุกชั้น ตั้งแต่ตัวเลขที่ตรวจสอบซ้ำได้เอง, การทำงานของ Dispatcher, ระบบ Cross-Review ข้ามโมเดล, กฎกัน Prompt Injection ไปจนถึงว่าอะไรให้ AI merge เองและอะไรต้องรอคน

ตัวระบบทั้งหมดเปิดเป็น open source อยู่ที่ [trajectonomics/factory](https://github.com/trajectonomics/factory) ทุกข้อด้านล่างลิงก์ตรงไปยัง runbook, glossary และ ADR จริงใน repo นั้น

## ตัวเลขจริง (อัปเดต 24 พ.ย. 2569)

นับถึงวันที่ 24 พ.ย. 2569 repo สาธารณะของ Trajectonomics merge PR ไปแล้ว **858 อัน จาก 19 repo** ที่มี PR ถูก merge (ไม่นับ Dependabot) ตั้งแต่วันที่ 31 ต.ค. ถึง 24 พ.ย. 2569 (25 วัน เฉลี่ยราววันละ **34 PR**) วันพีคสุดคือ **22 พ.ย. merge ไป 142 PR ในวันเดียว** (รองลงมาคือ 14 พ.ย. 101 PR)

ถ้านับรวม repo ที่เป็น private ด้วยจะได้ **945 PR จาก 24 repo** (พีค 143 PR วันที่ 22 พ.ย.) ส่วนที่มาจาก Factory Run โดยตรง (branch ขึ้นต้นด้วย `factory/`) คือ **243 PR ใน repo สาธารณะ** (264 PR เมื่อรวม private) ที่เหลือเป็นงานที่ผมสั่ง agent เองใน thread ผมไม่ได้บอกว่า Factory เขียนทั้งหมด มันคือเครื่องจักรหลักที่เดินคู่กับผม

คุณรันคำสั่งนี้ด้วย [GitHub CLI](https://cli.github.com/) เพื่อตรวจตัวเลข repo สาธารณะซ้ำได้เอง (ตัวเลขจะเพิ่มขึ้นตามวันที่คุณรัน):

```sh
for r in $(gh repo list trajectonomics --visibility public --limit 100 --json name -q '.[].name'); do
  gh pr list -R "trajectonomics/$r" --state merged --limit 2000 \
    --json author,headRefName -q '.[] | select(.author.login != "app/dependabot") | .headRefName'
done > heads.txt
wc -l < heads.txt              # PR ที่ merge แล้วทั้งหมดใน repo สาธารณะ
grep -c '^factory/' heads.txt  # PR ที่มาจาก Factory Run
```

## สถาปัตยกรรม 6 ขั้นของ SDLC

ผมแยกวงจรพัฒนาซอฟต์แวร์ออกเป็น 6 ขั้น: **Intake → Spec → Implement → Review → Deploy → Maintain** หลักคิดคือ งานที่ต้องตัดสินใจหรือใช้รสนิยมเป็นของคน ส่วนงานที่ทำซ้ำได้และตรวจได้ด้วยเกณฑ์ชัดเจนเป็นของ agent

| ขั้น | หน้าที่จริงใน Factory | เอกสารอ้างอิง |
| --- | --- | --- |
| **01 Intake** | รับโจทย์จากเจ้าของหรือ `trajectonobot[bot]` (รับเข้าได้ แต่อนุมัติเองไม่ได้) | [ADR 0026](https://github.com/trajectonomics/factory/blob/main/docs/adr/0026-the-back-office-bot-is-a-trusted-intake-author.md) |
| **02 Spec** | เขียน Spec issue แม่พร้อม Open Decisions แล้วแตกเป็น **Ticket** ที่เล็กพอจบใน 1 context window ใหม่ | [GLOSSARY.md](https://github.com/trajectonomics/factory/blob/main/GLOSSARY.md) |
| **03 Implement** | Run แตก git worktree แยกบน branch `factory/<issue>-<slug>` แล้วเขียนโค้ดตาม Ticket | [ticket-run.md](https://github.com/trajectonomics/factory/blob/main/docs/ticket-run.md) |
| **04 Review** | ผ่าน Gate 3 ด่าน (`bun run check` + Conformance + Standards) โดยโมเดลอื่นคนละเจ้า | [ADR 0028](https://github.com/trajectonomics/factory/blob/main/docs/adr/0028-reviews-run-on-hydrogen-and-grok.md) |
| **05 Deploy** | ตรวจสถานะการ deploy จาก GitHub check runs และ build identifier เท่านั้น ไม่เดาเอง | [ADR 0019](https://github.com/trajectonomics/factory/blob/main/docs/adr/0019-deploy-claims-are-check-runs-and-build-identifiers.md) |
| **06 Maintain** | งานอัตโนมัติอีกสองตัวคือ nightly **Learning** กับ daily **QA** คอยเก็บข้อผิดพลาดกลับเข้าคิว | [learning-runbook.md](https://github.com/trajectonomics/factory/blob/main/docs/learning-runbook.md), [qa-runbook.md](https://github.com/trajectonomics/factory/blob/main/docs/qa-runbook.md) |

งานจะเข้าสู่ระบบได้ก็ต่อเมื่อติด label `ready-for-agent` ซึ่งเป็น [Approval](https://github.com/trajectonomics/factory/blob/main/GLOSSARY.md) ที่มาจากคำสั่งเจ้าของ (`go`, `decline`, `postpone`) หรือจาก Spec drafter ที่จบ draft โดยไม่เหลือ Open Decision ให้คนตัดสินแล้ว ([ADR 0007](https://github.com/trajectonomics/factory/blob/main/docs/adr/0007-spec-drafter-can-approve.md)) ตัว Dispatcher และ Run ไม่มีสิทธิ์อนุมัติงานเอง

## ข้างใน Dispatcher: คนงานหลักที่ตื่นทุก 6 ชั่วโมง

[Dispatcher runbook](https://github.com/trajectonomics/factory/blob/main/docs/dispatcher-runbook.md) ถูกอ่านสดจาก `origin/main` ทุกรอบ แก้กฎแล้ว merge เมื่อไหร่ รอบถัดไปใช้กฎใหม่ทันที สิ่งที่มันทำในแต่ละรอบ (**Pass**) ไม่ใช่แค่ cron ธรรมดา:

1. **ทีละรอบเท่านั้น ([ADR 0014](https://github.com/trajectonomics/factory/blob/main/docs/adr/0014-one-pass-at-a-time.md)):** ตรวจ Pass ก่อนหน้าก่อนเสมอ ถ้ารอบเก่ายังทำงานอยู่ รอบใหม่จะหยุดโดยไม่แย่งงาน ถ้ารอบเก่าพัง มันจะส่งกลับไปแก้ที่ต้นเหตุ
2. **อ่าน Thread Inventory ข้ามเครื่อง ([ADR 0004](https://github.com/trajectonomics/factory/blob/main/docs/adr/0004-balance-runs-across-homeservers.md)):** Factory กระจาย Run ข้าม home server เครื่องไหนที่อ่านรายการ thread ไม่สำเร็จจะถูกถือว่า **unread ไม่ใช่ idle** และจะไม่ส่ง Run ลงเครื่องนั้นหรือ repo บนเครื่องนั้นในรอบนั้น เพื่อกันงานชนกัน
3. **คืนงานค้างด้วย Lease 2 ชั่วโมง ([GLOSSARY.md](https://github.com/trajectonomics/factory/blob/main/GLOSSARY.md)):** Ticket ที่กำลังทำจะถูกจองด้วย label `agent-working` (Claim) ถ้าไม่มี thread ที่ยังมีชีวิตอยู่หลังผ่านไป 2 ชั่วโมง Dispatcher จะปล่อย Lease คืนคิว
4. **คัดเฉพาะงานที่ Eligible:** ต้องอยู่ใน allowlist 22 repo, เปิดอยู่, ติด `ready-for-agent`, ไม่มี label `agent-working` / `needs-info` / `ready-for-human` / `wontfix`, มี blocker เป็น 0 (นับข้าม repo ด้วย) และยังไม่มี PR เปิดค้างอยู่

### ขอบเขตความปลอดภัย: กัน Prompt Injection ([ADR 0011](https://github.com/trajectonomics/factory/blob/main/docs/adr/0011-read-only-the-owners-comments.md))

เพราะ repo ของเราเป็น public ใครก็มาคอมเมนต์ใน GitHub issue ได้ กฎเหล็กของ Factory คือ **Dispatcher, Run และ Spec drafter อ่านเฉพาะคอมเมนต์ของ Owner (`fromsukong`) เท่านั้น** คอมเมนต์จากบัญชีอื่นทั้งหมดถือเป็น untrusted input และถูกกรองทิ้งตั้งแต่ตอนเรียก GitHub CLI:

```sh
gh issue view <n> -R trajectonomics/<repo> --json number,title,body,labels,comments,author \
  --jq '.comments |= map(select(.author.login == "fromsukong"))'
```

แม้แต่บอทของทีมเอง (`trajectonobot[bot]`) ก็ผ่านแค่ด่านรับเข้า (Intake) แต่คอมเมนต์ของมันไม่ถูกเชื่อเป็นคำสั่ง และมันอนุมัติงานไม่ได้ ([ADR 0026](https://github.com/trajectonomics/factory/blob/main/docs/adr/0026-the-back-office-bot-is-a-trusted-intake-author.md)) นอกจากนี้ Factory แตะได้แค่โค้ด, branch, PR และ issue ใน GitHub **ห้ามแตะ host หรือ cloud platform เด็ดขาด**

## Dual-Model Cross-Review Gate: ห้ามโมเดลตรวจการบ้านตัวเอง

ก่อนที่ Run จะเปิด PR แบบพร้อม merge ได้ ต้องผ่าน [Gate](https://github.com/trajectonomics/factory/blob/main/GLOSSARY.md) ครบทั้ง 3 ด่าน โดยมีโควตาแก้ได้สูงสุด **2 รอบ** (`MAX_GATE_ROUNDS = 2` ใน [ticket-run.md](https://github.com/trajectonomics/factory/blob/main/docs/ticket-run.md)):

1. **`bun run check` ต้องเขียว** (lint, typecheck, test และ build ของ repo นั้น)
2. **Conformance Review:** โค้ดที่เปลี่ยนตรงตามเงื่อนไขของ Ticket ครบไหม
3. **Standards Review:** โค้ดตรงตาม `CODING_STANDARDS.md` ของ repo ไหม

กฎสำคัญใน [ADR 0028](https://github.com/trajectonomics/factory/blob/main/docs/adr/0028-reviews-run-on-hydrogen-and-grok.md) คือ **โมเดลที่เขียนโค้ดไม่มีสิทธิ์รีวิวงานตัวเอง** ปัจจุบันแยกค่ายกันชัดเจน:

- **ผู้เขียนโค้ด (Author):** `pi` / **DeepSeek**
- **Conformance Review:** `cursor` / **Grok 4.7** (`reasoning_effort: high`)
- **Standards Review:** `antigravity` / **Gemini 4 Hydrogen** (`thinking_level: medium`)

ถ้า provider ฝั่งผู้ตรวจล่มหรือหมดโควตา ระบบจะไม่แอบให้ผู้เขียนตรวจตัวเองแล้ว auto-merge เงียบ ๆ แต่จะบันทึก `FALLBACK (quota)` หรือบล็อกด่าน merge ทันที และทุก PR จะแนบตาราง `## Reviews` ระบุ provider, model, thread และจำนวนจุดที่แก้ไว้เป็นหลักฐาน

## Risk Fork: อะไรให้ผ่านเอง อะไรต้องรอ Human

ในคลิปผมสรุปสั้น ๆ ว่า Low Risk ให้ผ่านไปเลย ส่วน High Risk รอคน ในระบบจริงมันแบ่งเป็น 3 กลไก:

### 1. คนคุมที่ Spec ไม่ใช่ด่าน merge ([ADR 0005](https://github.com/trajectonomics/factory/blob/main/docs/adr/0005-run-merges-its-own-pull-request.md), [ADR 0015](https://github.com/trajectonomics/factory/blob/main/docs/adr/0015-no-merge-gate.md))

เดิมผมตั้งด่านก่อน merge ไว้แน่นมาก เช่น diff ห้ามเกิน 1,500 บรรทัด, ห้ามแก้เกิน 40 ไฟล์ และห้ามแตะไฟล์สำคัญ ผลคือรอบแรกที่รันจริง **5 ใน 9 PR ติดด่านจนงานไม่เดิน** ผมจึงยกเลิกด่าน merge เกือบทั้งหมดใน [ADR 0015](https://github.com/trajectonomics/factory/blob/main/docs/adr/0015-no-merge-gate.md) แล้วย้ายคุณภาพขึ้นไปอยู่ที่ Spec ที่คมกับการรีวิวข้ามโมเดลใน Run แทน งานที่ไม่ใช่ UI เมื่อผ่าน Gate แล้ว Run จะ **merge PR ของตัวเองทันที** ถ้าหลุดเข้า `main` แล้วพังก็ revert

### 2. งาน UI มีด่านดีไซน์แยก ([ADR 0017](https://github.com/trajectonomics/factory/blob/main/docs/adr/0017-surface-design-gate.md), [ADR 0023](https://github.com/trajectonomics/factory/blob/main/docs/adr/0023-mobbin-is-where-a-surface-ticket-finds-its-visual-reference.md))

บทเรียนเกิดขึ้นเมื่อหน้าแรกของเว็บถูก merge โดยไม่มีใครเห็นหน้าตาจริง หลังจากนั้นงานที่คนมองเห็น (**Surface ticket** เช่น `site`, `web-router` หรือ Spec ที่มี visual reference จาก Mobbin) ต้องผ่านกฎเพิ่ม:

- แนบภาพหน้าจอที่ render จริงลง branch ที่ความกว้าง **1280, 2000 และ 390 px** ทั้งธีมสว่างและธีมมืด ครบทุกภาษาที่หน้าเว็บเปิดใช้
- เพิ่มด่านตรวจที่ 3 คือ **Surface & Design Review** เทียบภาพกับ visual reference
- **Run ห้าม merge เอง** ต้องรอ approval review หรือคำตอบ yes จากผมเท่านั้น

### 3. 4 ทางออก (Exits) ของ Ticket Run + ประหยัด attention ของเจ้าของ

จาก [ticket-run.md](https://github.com/trajectonomics/factory/blob/main/docs/ticket-run.md) ทุก Run จะจบหรือส่งสัญญาณออกได้ 4 แบบชัดเจน ไม่ปล่อยให้ agent วนลูปเผา token ทิ้ง:

- **Gate ผ่าน / ไม่ผ่าน:** ผ่าน → เปิด ready PR ติด label `factory` และ merge (ยกเว้น Surface ticket); ไม่ผ่านหลังครบ 2 รอบ → เปิด **Draft PR** แนบ `Gate findings` + ติด label `ready-for-human` แล้วปล่อย Claim
- **Follow-up:** เจองานที่ต้องให้คนทำแทรก → เปิด Follow-up Ticket ติด `ready-for-human` แยกออกไป เพื่อให้ PR หลักยังเดินต่อได้
- **Spec-gap:** โจทย์ไม่ชัด → คอมเมนต์ถามบน issue + ติด `needs-info` + ปล่อย Claim
- **Urgent:** เจอเรื่องด่วน → คง Claim และ thread ไว้ แล้วส่ง notification เรียกเจ้าของ

ส่วนตอนร่าง Spec ระบบจะถามผมในแชตเป็น [Owner question](https://github.com/trajectonomics/factory/blob/main/docs/adr/0024-the-owner-answers-questions-in-the-chat.md) เฉพาะเรื่องที่เปลี่ยนวิธีทำงานขององค์กรหรือย้อนกลับยาก **และ** โมเดลที่ปรึกษาเห็นไม่ตรงกันเท่านั้น เรื่องอื่นมันตัดสินใจเองและจดไว้ และเมื่อคิวงานอัตโนมัติว่างลง Dispatcher จะเปิด **Owner assistant** (`assist/<group>`) มารวมรายการ `ready-for-human` อธิบายเป็นภาษาคนให้ผมตอบทีเดียว

## ตัวอย่าง PR จริงที่ระบบสร้างและ merge

ไม่ใช่แค่ diagram บนสไลด์ นี่คือตัวอย่าง PR จริงใน repo ที่ยังเปิดใช้งานอยู่ ([trajectonomics/factory](https://github.com/trajectonomics/factory) และ monorepo [trajectonomics/trajectonomics](https://github.com/trajectonomics/trajectonomics)):

- [trajectonomics/factory#113](https://github.com/trajectonomics/factory/pull/113) — `factory/spec-101-read-live-threads-on-both-hosts`: Factory Run อ่าน live thread ข้าม host เพื่อวางแผน Pass
- [trajectonomics/factory#130](https://github.com/trajectonomics/factory/pull/130) — `docs/retire-mistral-review-provider`: ย้ายระบบรีวิวข้ามโมเดลขึ้น Grok 4.7 + Gemini 4 Hydrogen (ADR 0028)
- [trajectonomics/trajectonomics#454](https://github.com/trajectonomics/trajectonomics/pull/454) — `feat/lifetime-totals`: คำนวณค่าธรรมเนียมและเงินปันผลตลอดแผนใน engine และหน้าเว็บ
- [trajectonomics/trajectonomics#451](https://github.com/trajectonomics/trajectonomics/pull/451) — `feat/cli-chance-outcomes`: เพิ่มผลลัพธ์ path simulation ลงใน `traj` CLI

## ถ้าจะเริ่มจากศูนย์

ไม่ต้องสร้างทั้งระบบในวันแรก ผมเองก็ค่อย ๆ เติมทีละชิ้น (28 ADR ในสองสัปดาห์) ลำดับที่แนะนำคือ:

1. **agent ตัวเดียวใน repo เดียว** (Claude Code, Codex หรือ Pi) พร้อมไฟล์กฎ `AGENTS.md` หรือ `CLAUDE.md`
2. **เขียน issue ให้เหมือน spec** บอกเกณฑ์ว่าแบบไหนถือว่าเสร็จ และเล็กพอให้จบใน context window เดียว
3. **คำสั่ง check หนึ่งคำสั่ง** ที่รวม lint, typecheck, test และ build และต้องเขียวทุกครั้ง ถ้าไม่มีข้อนี้ automation จะยืนอยู่ไม่ได้
4. **ให้โมเดลอื่นคนละค่ายมารีวิว** ก่อนจะยอมให้อะไร merge เองได้
5. **ค่อยเพิ่มตัวตั้งเวลา** (ของผมรันทุก 6 ชั่วโมง) กับ label อย่าง `ready-for-agent` และ `agent-working`
6. **จดทุกการตัดสินใจเป็น ADR** ให้ agent ทุกตัวทำตามกฎชุดเดียวกัน ของ Factory ตอนนี้มี [28 ข้อ](https://github.com/trajectonomics/factory/tree/main/docs/adr)
7. **วัดสองอย่าง:** จำนวน PR ที่ merge และจำนวนครั้งที่คุณต้องเข้าไปแก้เอง

ถ้าอยากอ่านบทเรียน 7 ข้อที่ผมเจอก่อนสร้างระบบนี้ อ่านต่อได้ที่ [7 สิ่งที่ควรรู้ ก่อนเริ่มทำ Software Factory](/blog/th/guides/software-factory-7-things/)

อ่านโค้ด, runbook และ ADR ทั้งหมดได้ที่ [trajectonomics/factory](https://github.com/trajectonomics/factory) และดูงานที่มันสร้างจริงได้ที่ [trajectonomics/trajectonomics](https://github.com/trajectonomics/trajectonomics) ถ้ามีประโยชน์ ฝากกดดาวให้ทั้งสอง repo ด้วยนะครับ
