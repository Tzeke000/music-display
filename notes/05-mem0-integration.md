# Optional Semantic Memory — mem0

The durable project memory is this `notes/` vault (committed to the repo). For
*semantic* recall across sessions (search by meaning, not file), [mem0](https://github.com/mem0ai/mem0)
can be layered on top. It is **optional** and intentionally not a hard
dependency, because it needs:
- a mem0 install (`pip install mem0ai`), and
- an LLM/embeddings provider (e.g. an `OPENAI_API_KEY`) or a self-hosted setup,
  plus a vector store.

## Why it's not wired into the app
The visualizer is a static front-end; bundling an AI memory service into it adds
keys, a backend, and cost for no end-user benefit. mem0 is useful for the
*development* workflow (helping Claude recall prior context), so it lives as an
optional tool, not app code.

## Suggested usage (dev workflow)
A helper script `tools/memory/mem0_sync.py` can push the contents of this vault
into mem0 so future sessions can query it. It is a no-op unless `MEM0_API_KEY`
(or `OPENAI_API_KEY` for the OSS path) is set.

```bash
pip install mem0ai
export OPENAI_API_KEY=sk-...        # or MEM0_API_KEY=...
python tools/memory/mem0_sync.py     # indexes notes/*.md into mem0
python tools/memory/mem0_sync.py "how does the offline renderer work?"
```

## Decision
Markdown vault is the source of truth; mem0 is an optional accelerator. Revisit
if/when cross-session semantic recall becomes valuable enough to maintain keys.
