#!/usr/bin/env python3
"""Build the question bank and embed it in index.html.

Source files: data/part1.json ... data/part4.json (one per testable part of Our Common Bond).

Authoring format for each question:
  id  bank ID shown in the app (keep it when you edit a question; use a new number for a new one)
  tp  topic label
  q   question text
  a   correct answer
  w   wrong answers: two, like the real test (3 options per question)
  k   1 if it is a key question (optional)
  v   1 if it is an Australian values question (optional)
  e   explanation (optional)

Outputs:
  questions.json            full bank with shuffled options and answer indexes
  index.html                the bank is written between the QUESTIONS markers

Usage: python3 scripts/build.py          build
       python3 scripts/build.py --check  fail if outputs are out of date
"""
import json
import random
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT_JSON = ROOT / "questions.json"
INDEX = ROOT / "index.html"
MARKER = re.compile(r"(/\*QUESTIONS_START\*/).*?(/\*QUESTIONS_END\*/)", re.S)


def fail(msg):
    sys.exit(f"error: {msg}")


def build_question(part, src):
    where = f"part {part}, question {src.get('id')} ({src.get('q', '')[:50]!r})"
    if not isinstance(src.get("id"), int):
        fail(f"{where}: missing 'id'")
    for field in ("tp", "q", "a"):
        if not str(src.get(field, "")).strip():
            fail(f"{where}: missing '{field}'")
    wrong = src.get("w", [])
    if len(wrong) != 2:
        fail(f"{where}: needs one correct answer and two wrong answers")
    options = [src["a"]] + wrong
    if len(set(o.strip().lower() for o in options)) != 3:
        fail(f"{where}: duplicate options")
    random.Random(f"{part}:{src['q']}:{src['a']}").shuffle(options)

    return {
        "id": src["id"],
        "part": part,
        "topic": src["tp"],
        "q": src["q"],
        "options": options,
        "answer": options.index(src["a"]),
        "values": bool(src.get("v")),
        "key": bool(src.get("k")),
        "explanation": src.get("e", ""),
    }


def build():
    parts, questions, ids, seen = [], [], set(), set()
    for path in sorted(DATA.glob("part*.json")):
        doc = json.loads(path.read_text(encoding="utf-8"))
        parts.append({"part": doc["part"], "title": doc["title"]})
        for src in doc["questions"]:
            q = build_question(doc["part"], src)
            if q["id"] in ids:
                fail(f"duplicate id: {q['id']}")
            norm = src["q"].strip().lower()
            if norm in seen:
                fail(f"duplicate question: {src['q']!r}")
            ids.add(q["id"])
            seen.add(norm)
            questions.append(q)
    questions.sort(key=lambda q: q["id"])
    return {"parts": parts, "questions": questions}


def main():
    bank = build()
    json_text = json.dumps(bank, ensure_ascii=False, indent=1) + "\n"
    inline = json.dumps(bank, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    html = INDEX.read_text(encoding="utf-8")
    if not MARKER.search(html):
        fail("QUESTIONS markers not found in index.html")
    new_html = MARKER.sub(lambda m: f"{m.group(1)}{inline}{m.group(2)}", html, count=1)

    if "--check" in sys.argv:
        stale = [p.name for p, new in ((OUT_JSON, json_text), (INDEX, new_html))
                 if not p.exists() or p.read_text(encoding="utf-8") != new]
        if stale:
            fail(f"out of date: {', '.join(stale)} (run python3 scripts/build.py)")
    else:
        OUT_JSON.write_text(json_text, encoding="utf-8")
        INDEX.write_text(new_html, encoding="utf-8")

    qs = bank["questions"]
    print(f"{len(qs)} questions, {sum(q['values'] for q in qs)} values, {sum(q['key'] for q in qs)} key")


if __name__ == "__main__":
    main()
