---
title: Software Factory ที่ผมใช้ merge 700+ PR ใน 23 วัน
description: "สรุปที่สัญญาไว้ในคลิป: Dispatcher ที่ตื่นทุก 6 ชั่วโมง, ด่านที่ทุก PR ต้องผ่าน, งานแบบไหนที่ AI merge เองได้และแบบไหนต้องรอคน และถ้าจะเริ่มเองจากศูนย์ควรเริ่มตรงไหน"
type: guide
publishedOn: 2026-11-23
cover:
  src: /posts/software-factory/cover.webp
  alt: หุ่นยนต์สีครีมสองตัวตาสีส้มนั่งคนละฝั่งของโต๊ะไม้กลางเนินทราย ตัวซ้ายต่อบล็อกไม้ ตัวขวาส่องงานด้วยแว่นขยาย
  width: 1024
  height: 1024
---

ในคลิปผมเล่าว่าใช้ Software Factory ทำงานในโปรเจกต์ Trajectonomics ไปกว่า 800 PR นี่คือสรุปที่สัญญาไว้ ว่ามันทำงานยังไง และถ้าคุณจะเริ่มทำเองควรเริ่มตรงไหน ตัว Factory เป็น open source อยู่ที่ [trajectonomics/factory](https://github.com/trajectonomics/factory) ทุกข้อด้านล่างลิงก์ไปที่เอกสารจริงใน repo นั้น

## ตัวเลขก่อน

นับถึงวันที่ 22 พ.ย. 2569 repo สาธารณะของ Trajectonomics merge PR ไปแล้ว **738 อัน ใน 19 repo** (ไม่นับ Dependabot) อันแรกถูก merge วันที่ 31 ต.ค. 2569 เฉลี่ยราววันละ 32 อัน ถ้านับ repo ที่เป็น private อีก 4 อันด้วยจะได้ 803 อัน ตามที่พูดในคลิป

ใน 738 อันนี้ **234 อันมาจาก Factory Run** (branch ที่ขึ้นต้นด้วย `factory/`) ที่เหลือเป็นงานที่ผมสั่ง agent เองใน thread ผมไม่ได้บอกว่า Factory เขียนทั้งหมด มันเป็นส่วนหนึ่งของวิธีทำงาน

นับซ้ำเองได้ด้วย [GitHub CLI](https://cli.github.com/) ตัวเลขจะมากขึ้นตามวันที่คุณรัน:

```sh
for r in $(gh repo list trajectonomics --visibility public --limit 100 --json name -q '.[].name'); do
  gh pr list -R "trajectonomics/$r" --state merged --limit 2000 \
    --json author,headRefName -q '.[] | select(.author.login != "app/dependabot") | .headRefName'
done > heads.txt
wc -l < heads.txt              # PR ที่ merge แล้วทั้งหมด
grep -c '^factory/' heads.txt  # PR ที่มาจาก Factory Run
```

## ผมคิดเรื่องงานเป็น 6 ขั้น

งานพัฒนาซอฟต์แวร์หนึ่งชิ้นเดินผ่าน Intake, Spec, Implement, Review, Deploy แล้วก็ Maintain งานของคนคือขั้นที่ต้องตัดสินใจ: จะสร้างอะไร และยอมให้อะไรผ่าน ส่วนงานที่ทำซ้ำได้ในแต่ละขั้น ให้ agent ทำ

ใน Factory งานใหญ่หนึ่งชิ้นคือ [Spec](https://github.com/trajectonomics/factory/blob/main/GLOSSARY.md) issue แม่ที่เก็บแผน แล้วแตกเป็น Ticket ย่อยที่แต่ละอันเล็กพอให้ agent ทำจบใน context window เดียว งานจะเริ่มได้ก็ต่อเมื่อติด label `ready-for-agent` ซึ่งเป็น [การอนุมัติ](https://github.com/trajectonomics/factory/blob/main/GLOSSARY.md) ที่เกิดจากคำสั่งของเจ้าของเท่านั้น

## Dispatcher: คนงานหลักที่ตื่นทุก 6 ชั่วโมง

ประโยคแรกของ [README](https://github.com/trajectonomics/factory#readme) บอกไว้ตรง ๆ: Dispatcher รันทุก 6 ชั่วโมง หางานที่พร้อมทำ แล้วเปิด Run ขึ้นมาเปลี่ยน Spec กับ Ticket ที่อนุมัติแล้วให้กลายเป็น PR ที่รีวิวแล้ว

- **งานที่พร้อมทำ** คืองานที่อนุมัติแล้ว ยังเปิดอยู่ ไม่มีอะไรบล็อก และไม่มี agent ตัวไหนจองอยู่
- **Run** คือ agent หนึ่งตัวที่รับงานหนึ่งชิ้นไปทำตั้งแต่ต้นจนจบ
- Dispatcher กับ Run **อ่านแต่ comment ของเจ้าของ** comment ของคนอื่นถือเป็นข้อมูลที่เชื่อไม่ได้ ([ADR 0011](https://github.com/trajectonomics/factory/blob/main/docs/adr/0011-read-only-the-owners-comments.md)) เพื่อกัน prompt injection

## ทุก Step มี agent อีกตัวมาตรวจ

ก่อนจะเปิด PR ให้ merge ได้ Run ต้องผ่าน [Gate](https://github.com/trajectonomics/factory/blob/main/GLOSSARY.md) สามด่าน:

1. `bun run check` ต้องผ่าน (typecheck, lint, test)
2. **Conformance Review:** โค้ดทำตรงตามที่ Ticket บอกไหม
3. **Standards Review:** โค้ดถูกตาม `CODING_STANDARDS.md` ของ repo ไหม

กฎสำคัญคือ **โมเดลที่เขียนโค้ดไม่มีสิทธิ์รีวิวงานตัวเอง** ตอนนี้ DeepSeek เป็นคนเขียน ส่วนสองรีวิวใช้ Grok 4.7 กับ Gemini 4 Hydrogen ซึ่งอยู่คนละเจ้ากัน ([ADR 0028](https://github.com/trajectonomics/factory/blob/main/docs/adr/0028-reviews-run-on-hydrogen-and-grok.md))

## Low risk ผ่านเลย, high risk รอคน

ถ้า PR ผ่านทุกด่าน Run จะ merge เอง ([ADR 0005](https://github.com/trajectonomics/factory/blob/main/docs/adr/0005-run-merges-its-own-pull-request.md)) แต่ "ผ่าน" ในที่นี้มีเงื่อนไขชัดเจน ถ้าข้อไหนไม่ผ่าน PR จะรอให้คนมาดู:

- ทุก check ผ่าน และสองรีวิวรอบล่าสุดไม่เจอปัญหา
- diff ไม่ใหญ่เกินที่กำหนด (เริ่มที่ 1,500 บรรทัดและ 40 ไฟล์)
- ไม่แตะ workflow, config ของ lint หรือ type, `AGENTS.md`, ADR, ไฟล์ secret หรือการ release
- repo ไม่อยู่ในรายชื่อที่ต้องให้คน merge เช่นตัวคำนวณภาษี เพราะตัวเลขภาษีตรวจด้วยโมเดลไม่ได้

งานที่คนต้องเห็นด้วยตาก็ต้องรอเสมอ งาน UI ต้องแนบภาพหน้าจอ และ merge ได้ก็ต่อเมื่อเจ้าของอนุมัติดีไซน์แล้ว ([ADR 0017](https://github.com/trajectonomics/factory/blob/main/docs/adr/0017-surface-design-gate.md)) และเวลา Factory ต้องการให้ผมตัดสินใจ มันจะถามเป็น [Owner call](https://github.com/trajectonomics/factory/blob/main/GLOSSARY.md) แค่เรื่องที่เปลี่ยนวิธีทำงานหรือย้อนกลับยากเท่านั้น

## ถ้าจะเริ่มจากศูนย์

ไม่ต้องสร้างทั้งระบบในวันแรก ผมเองก็ค่อย ๆ เติมทีละชิ้น ลำดับที่แนะนำคือ:

1. **agent ตัวเดียวใน repo เดียว** (Claude Code หรือ Codex) พร้อมไฟล์กฎ `AGENTS.md` หรือ `CLAUDE.md`
2. **เขียน issue ให้เหมือน spec** บอกว่าแบบไหนถือว่าเสร็จ และเล็กพอให้จบใน context window เดียว
3. **คำสั่ง check หนึ่งคำสั่ง** ที่รวม typecheck, lint และ test และต้องผ่านทุกครั้ง ถ้าไม่มีข้อนี้ ก็ทำ automation ต่อไม่ได้
4. **ให้โมเดลอื่นมารีวิว** ก่อนจะยอมให้อะไร merge เองได้
5. **ค่อยเพิ่มตัวตั้งเวลา** (ของผมรันทุก 6 ชั่วโมง) กับ label อย่าง `ready-for-agent`
6. **จดการตัดสินใจเป็น ADR** ให้ agent ทุกตัวทำตามกฎชุดเดียวกัน ของ Factory ตอนนี้มี [28 ข้อ](https://github.com/trajectonomics/factory/tree/main/docs/adr)
7. **วัดสองอย่าง:** จำนวน PR ที่ merge และจำนวนครั้งที่คุณต้องเข้าไปแก้เอง

อ่านโค้ดและเอกสารทั้งหมดได้ที่ [trajectonomics/factory](https://github.com/trajectonomics/factory) และถ้าอยากเห็นงานที่มันสร้าง ดูได้ที่ [trajectonomics/trajectonomics](https://github.com/trajectonomics/trajectonomics) ถ้ามีประโยชน์ ฝากกดดาวให้ทั้งสอง repo ด้วยนะครับ
