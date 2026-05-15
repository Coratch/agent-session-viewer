# Tech Stack Migration And Long Session Loading

Date: 2026-05-15
Status: design approved for planning

## Context

RunWhy currently ships as a zero-dependency Node.js CLI with a browser UI served from `public/`.
It reads Claude Code and Codex JSONL sessions, normalizes turns, displays session timelines, supports
single-session time diagnosis, and can jump to evidence turns by loading a server-side turn window.

Recent UI work removed the coarse `Load older 500`, `Load latest 1000`, and `Find in loaded turns`
controls. The next step should avoid reintroducing browser-only search or manual pagination. Long
sessions need a model that can search and navigate across all turns without putting every turn into
the DOM or into browser memory.

The product direction also includes a richer Web UI, relationship graph rendering, and Python-based
RAG or analysis services. That makes the current single-file frontend and Node-only backend a short
term constraint rather than the ideal long term architecture.

## Goals

- Prefer a technology stack that can support a richer Web UI, high-volume session navigation, RAG,
  and graph rendering.
- Replace explicit turn pagination controls with automatic on-demand loading.
- Make session search cover the full session, not only the currently loaded turns.
- Keep the browser rendering bounded for sessions with hundreds or thousands of turns.
- Preserve evidence jump behavior through a stable `turnId` or ordinal-based window API.
- Keep local-first behavior and avoid requiring hosted infrastructure.
- Introduce the migration in phases so existing CLI and publishing flow remain usable.

## Non-Goals

- Rendering all turns in the browser at once.
- Building a full RAG product in the first migration step.
- Replacing all current providers before the loading/search model is proven.
- Rendering full relationship graphs for the entire project by default.
- Reintroducing manual paging buttons as the primary navigation model.

## Recommended Stack

### Frontend

Use `React + Vite + TypeScript` for the next Web UI generation.

Reasons:

- Strong ecosystem for complex stateful tools.
- Better fit for graph rendering libraries such as `@xyflow/react`, Sigma.js wrappers, and data
  fetching libraries.
- Easier to scale from current static UI into a real application shell with routes, command palette,
  tabs, search panels, and inspector panels.

Use `TanStack Query` for server data and `Zustand` or colocated React state for UI state.

Use `React Virtuoso Message List` for the first long-message implementation if license and package
fit are acceptable. It has built-in semantics for message-like lists, including prepending older
items while preserving scroll position and scrolling to a specific item. If a fully headless
implementation is preferred, use `TanStack Virtual`; it gives more control but requires more custom
scroll anchoring work.

### Backend

Move the session API and index layer toward `Python FastAPI`.

Reasons:

- Python is the natural runtime for later RAG, embeddings, clustering, and graph analysis.
- FastAPI provides explicit request/response schemas that match the planned window API.
- The current Node CLI can remain as a compatibility entrypoint while the Web UI talks to a local
  FastAPI service.

### Local Index

Use `SQLite + FTS5` as the first local index.

Session JSONL files should be parsed into structured tables rather than scanned on every Web UI
request:

```text
sessions(id, provider, project, title, started_at, ended_at, turns_total, cwd, git_branch, ...)
turns(session_id, ordinal, turn_id, kind, timestamp, title, text_preview, text_body_ref, usage_json, ...)
turn_fts(session_id, ordinal, turn_id, kind, title, text)
tool_events(session_id, ordinal, tool_name, status, duration_ms, input_ref, output_ref, ...)
segments(session_id, segment_id, start_ordinal, end_ordinal, title, summary, ...)
```

Large turn bodies may remain in compressed blobs or file-backed storage later. The first version can
store sanitized text directly as long as API responses only return bounded windows.

### Graph Rendering

Use two graph modes:

- `@xyflow/react` for small, editable or explainable diagrams such as task flows, evidence chains,
  and segment-level relationship maps.
- Sigma.js for larger read-only relationship graphs where WebGL matters.

Do not use a single full-project graph as the default view. Graph APIs should return bounded
subgraphs around a selected session, segment, entity, search result, or diagnosis.

## Long Session Loading Model

The browser should hold a sparse window cache, not the full session.

```text
itemsByOrdinal: Map<number, Turn>
loadedRanges: [{ start: 580, end: 741 }]
activeAnchor: latest | search-hit | evidence | segment
pendingRequests: Set<string>
```

Initial session open:

```text
GET /api/sessions/:id
  -> metadata, turnsTotal, metrics, availableProviders

GET /api/sessions/:id/turns?anchor=latest&limit=120
  -> newest visible window
```

Scroll near top:

```text
GET /api/sessions/:id/turns?beforeOrdinal=<firstLoadedOrdinal>&limit=120
  -> prepend older turns and preserve scroll anchor
```

Search or evidence jump:

```text
GET /api/sessions/:id/turns?centerTurnId=<turnId>&before=40&after=80
  -> replace or merge a centered context window, then scroll and highlight target
```

Segment open:

```text
GET /api/sessions/:id/turns?segmentId=<segmentId>&limit=160
  -> load the segment window
```

The frontend should trim distant loaded windows when memory grows. For example, keep the active
window plus one neighboring window above and below, and drop old ranges with a scroll-preserving
modifier where the list library supports it.

## API Contract

The canonical future API uses resource paths such as `/api/sessions/:id/turns`. During Phase 1, the
current Node server may expose compatibility routes with `provider` and `id` query parameters, but
the request and response shape should match this contract so the frontend can migrate without another
protocol change.

### Session Metadata

```text
GET /api/sessions/:id
```

Returns:

```json
{
  "session": {},
  "turnsTotal": 741,
  "turnsIndexed": 741,
  "segmentsTotal": 18
}
```

### Turn Window

```text
GET /api/sessions/:id/turns
```

Supported query modes:

- `anchor=latest&limit=120`
- `beforeOrdinal=620&limit=120`
- `afterOrdinal=620&limit=120`
- `centerTurnId=abc&before=40&after=80`
- `centerOrdinal=620&before=40&after=80`
- `segmentId=seg-1&limit=160`

Returns:

```json
{
  "turns": [],
  "loadedRange": { "start": 580, "end": 700 },
  "turnsTotal": 741,
  "hasOlder": true,
  "hasNewer": true,
  "target": { "turnId": "abc", "ordinal": 642, "found": true }
}
```

`start` is inclusive and `end` is exclusive. Ordinals are zero-based and stable within an indexed
session version.

### Session Search

```text
GET /api/sessions/:id/search?q=<query>&limit=50&cursor=<cursor>
```

Returns:

```json
{
  "hits": [
    {
      "turnId": "abc",
      "ordinal": 642,
      "kind": "tool_result",
      "timestamp": "2026-05-15T10:00:00.000Z",
      "title": "Tool result",
      "snippet": "..."
    }
  ],
  "nextCursor": "..."
}
```

Search must run against the full indexed session. It must not be limited to the current browser
window.

### Segments

```text
GET /api/sessions/:id/segments
```

Returns task or conversation segments:

```json
{
  "segments": [
    {
      "segmentId": "seg-1",
      "startOrdinal": 120,
      "endOrdinal": 188,
      "title": "Fix Codex duplicate turns",
      "summary": "...",
      "turnsCount": 69
    }
  ]
}
```

Segments become the default reading model for long sessions. The raw `ALL` stream remains available
for troubleshooting.

## Frontend Behavior

- Opening a session loads metadata, segments, and the latest turn window.
- The main timeline renders through a virtual list. The DOM should normally contain only visible
  turns and overscan.
- Scrolling near the top automatically loads an older window. No manual `Load older` button is
  required.
- Searching shows a result list. Selecting a result loads a centered turn window by `turnId`, scrolls
  to the target, and highlights it.
- Evidence jump uses the same centered window API as search.
- Turn type filters should be server-aware in the long term. In the first phase, they may filter the
  loaded window only if the UI clearly labels that limitation. The preferred final behavior is
  server-side filtering plus search/segment navigation.
- Tool calls, tool results, and hooks remain collapsed by default. Very large turn bodies should
  render previews first and fetch full body content only on expansion.

## Error Handling

- If a session is not indexed, return metadata with `indexStatus: pending` and let the UI show a
  lightweight indexing state.
- If a `turnId` cannot be found, return `target.found: false` with no silent fallback to latest.
- If search index is unavailable, fall back to provider parsing only for small sessions. For large
  sessions, surface a clear indexing-required state.
- If a window request overlaps an existing range, merge ranges by ordinal and de-duplicate turns.
- If the underlying session file changed, increment an index version and invalidate old browser
  windows.

## Testing

Backend:

- Unit test turn window selection for latest, before, after, center turn, center ordinal, and segment.
- Unit test search returns hits outside the currently loaded browser window.
- Unit test stable ordinal assignment for Claude Code and Codex fixtures.
- Unit test index invalidation when file metadata changes.

Frontend:

- Component test search result selection calls centered window loading and highlights the target.
- Component test prepending older turns preserves scroll position.
- Component test large tool results remain collapsed until expanded.
- Playwright test a long fixture: open session, search a middle turn, click result, verify target is
  visible without rendering all turns.

Performance:

- Long fixture with at least 5,000 turns.
- Assert rendered turn DOM nodes stay under a bounded threshold during normal scrolling.
- Assert search latency is bounded by indexed lookup rather than frontend scanning.

## Migration Plan

### Phase 1: Protocol First

Keep the current Node server and implement the final API shape over the existing parsed session
model:

- `/api/sessions/:id/search` or a temporary `/api/session/search?provider=&id=` compatibility route
- `/api/sessions/:id/turns` or a temporary `/api/session/turns?provider=&id=` compatibility route
- centered turn windows by `turnId`
- frontend result list and click-to-load behavior

This proves the product model before the stack migration.

### Phase 2: Frontend Shell Migration

Introduce a Vite React app while keeping the current CLI entrypoint:

- React layout shell
- session list
- session detail
- virtualized turn list
- search result panel
- evidence jump reuse

The old static UI can remain until parity is reached.

### Phase 3: Local Index Service

Introduce SQLite + FTS5 indexing:

- parse provider sessions into structured tables
- search through FTS5
- read turn windows by ordinal from SQLite
- expose index status in metadata

This phase can still run in Node if needed, but Python FastAPI should be evaluated here because it
sets up the later RAG path.

### Phase 4: Python Analysis/RAG Backend

Move or duplicate the session API into FastAPI:

- typed schemas for sessions, turns, search hits, segments, and graph subgraphs
- embedding jobs for selected sessions or segments
- optional Qdrant or LanceDB for semantic search
- graph extraction jobs

### Phase 5: Relationship Graph Views

Add graph views only after indexed segments and entities exist:

- segment graph
- evidence graph
- tool/file interaction graph
- entity graph around a search result

Use bounded subgraph APIs instead of full-project graph rendering.

## Open Decisions

- Whether Phase 1 should be implemented on current Node only or start with FastAPI immediately.
- Whether to choose React Virtuoso for faster message-list behavior or TanStack Virtual for maximum
  control.
- Whether SQLite index lives inside the current package directory or under a user cache directory.

Recommended defaults:

- Implement Phase 1 on current Node to de-risk the UX quickly.
- Choose React Virtuoso for the first React long-list implementation.
- Store generated indexes outside the project by default, under a RunWhy cache directory, while
  documenting how to reset or rebuild them.
