#!/usr/bin/env python3
"""Optional: index the notes/ vault into mem0 for cross-session semantic recall.

This is a developer convenience, NOT part of the app. It is a safe no-op unless
mem0 is installed and an API key is present.

Usage:
    pip install mem0ai
    export OPENAI_API_KEY=sk-...        # or MEM0_API_KEY=...
    python tools/memory/mem0_sync.py            # index notes/*.md
    python tools/memory/mem0_sync.py "question" # query the indexed memory
"""
import os
import sys
from pathlib import Path

USER_ID = "music-display"
NOTES_DIR = Path(__file__).resolve().parents[2] / "notes"


def _get_memory():
    if not (os.getenv("MEM0_API_KEY") or os.getenv("OPENAI_API_KEY")):
        print("No MEM0_API_KEY / OPENAI_API_KEY set — skipping (no-op).")
        return None
    try:
        from mem0 import Memory  # type: ignore
    except ImportError:
        print("mem0 not installed. Run: pip install mem0ai")
        return None
    return Memory()


def index(mem):
    files = sorted(NOTES_DIR.glob("*.md"))
    if not files:
        print(f"No notes found in {NOTES_DIR}")
        return
    for f in files:
        text = f.read_text(encoding="utf-8")
        mem.add(text, user_id=USER_ID, metadata={"source": f.name})
        print(f"indexed: {f.name}")
    print(f"Done — {len(files)} note(s) indexed into mem0.")


def query(mem, q):
    results = mem.search(q, user_id=USER_ID)
    items = results.get("results", results) if isinstance(results, dict) else results
    for r in items or []:
        print("-", r.get("memory", r))


def main():
    mem = _get_memory()
    if mem is None:
        return
    if len(sys.argv) > 1:
        query(mem, " ".join(sys.argv[1:]))
    else:
        index(mem)


if __name__ == "__main__":
    main()
