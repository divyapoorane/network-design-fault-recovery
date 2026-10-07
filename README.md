# Network Design & Fault Recovery

A full-stack DSA-based application demonstrating minimum-cost network design using Kruskal's algorithm, Disjoint Set Union (DSU), BFS connectivity analysis, and fault recovery simulation.

---

## Problem Statement

Given a set of locations and potential connections with installation costs, find:
1. The **minimum-cost spanning network** (Minimum Spanning Tree)
2. The **resilience** of that network to connection failures
3. The **optimal recovery strategy** when a connection fails

---

## Objective

Demonstrate the following DSA concepts in a real, working application:
- Weighted undirected graphs
- Kruskal's MST algorithm
- Disjoint Set Union / Union-Find with path compression
- Cycle detection via DSU
- BFS-based connectivity analysis
- Cost-based failure recovery

---

## System Architecture

```
React Frontend (Port 3000)
        ↓
    REST API (JSON)
        ↓
FastAPI Backend (Port 8000)
        ↓
    Service Layer
        ↓
  Algorithm Layer
  ├── Kruskal's MST
  ├── DSU (Union-Find)
  └── BFS Connectivity
        ↓
  SQLite Database
```

---

## Directory Structure

```
network-design-fault-recovery/
├── backend/
│   ├── main.py          ← FastAPI routes
│   ├── services.py      ← Business logic
│   ├── algorithms.py    ← Core DSA (Kruskal, DSU, BFS)
│   ├── models.py        ← SQLAlchemy ORM
│   ├── schemas.py       ← Pydantic models
│   ├── database.py      ← SQLite connection
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                ← Main shell + stage nav
│   │   ├── api.js                 ← API client (axios)
│   │   └── components/
│   │       ├── NetworkGraph.jsx        ← React Flow visualisation
│   │       ├── StageBuildPanel.jsx     ← Stage 1: Build
│   │       ├── StageOptimizePanel.jsx  ← Stage 2: Optimize
│   │       ├── StageTestPanel.jsx      ← Stage 3: Test
│   │       ├── StageRecoverPanel.jsx   ← Stage 4: Recover
│   │       ├── StageAnalyzePanel.jsx   ← Stage 5: Analyze
│   │       ├── RightPanel.jsx          ← Context panel
│   │       └── BottomBar.jsx           ← Status + primary action
│   └── package.json
│
└── README.md
```

---

## How to Run

### Prerequisites
- Python 3.9+
- Node.js 18+

### Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open: http://localhost:3000

---

## Guided Workflow

### Stage 1 — BUILD
Create locations and connections. Each connection has an installation cost.
Load the example network (A-B=10, A-C=15, B-C=5, B-D=12, C-D=8, C-E=9, D-E=6) to get started.

### Stage 2 — OPTIMIZE
Run Kruskal's algorithm. Step through each edge examination.
Watch the DSU components merge as edges are selected.

### Stage 3 — TEST
Click an MST edge to simulate its failure.
BFS analysis finds the resulting disconnected components.

### Stage 4 — RECOVER
The system examines all remaining candidate edges and selects
the lowest-cost connection that bridges the separated components.

### Stage 5 — ANALYZE
View network statistics, algorithm complexity, measured execution time,
and run a benchmark on test graphs of increasing size.

---

## Data Structures

### Graph Representation
- **Node collection**: `List[str]` of location labels
- **Edge list**: `List[(source, destination, cost, id)]`
- Stored in SQLite, loaded into Python structures for algorithm execution

### Edge Status Values
| Status    | Meaning                                    |
|-----------|--------------------------------------------|
| `active`  | Available connection (default)             |
| `mst`     | Selected by Kruskal as part of MST         |
| `rejected`| Examined by Kruskal, rejected (cycle)      |
| `failed`  | Simulated network failure                  |
| `recovery`| Added during fault recovery                |

---

## Algorithms

### Kruskal's MST
**Time complexity:** O(E log E) — dominated by sorting  
**Space complexity:** O(V + E)

```
1. Sort all edges by cost (ascending)
2. For each edge (u, v):
   a. Find representative of u: root_u = find(u)
   b. Find representative of v: root_v = find(v)
   c. If root_u == root_v: REJECT (cycle)
   d. Else: SELECT, union(u, v)
3. Stop when V-1 edges selected
```

### Disjoint Set Union (DSU / Union-Find)
Used by Kruskal for O(α(V)) amortised cycle detection.

**Optimisations:**
- **Path compression** in `find()`: flattens tree by pointing nodes directly to root
- **Union by rank**: attaches smaller tree under larger to keep depth minimal

```python
def find(node):
    if parent[node] != node:
        parent[node] = find(parent[node])   # path compression
    return parent[node]

def union(a, b):
    root_a, root_b = find(a), find(b)
    if root_a == root_b: return False       # same component = cycle
    # union by rank
    if rank[root_a] < rank[root_b]:
        parent[root_a] = root_b
    elif rank[root_a] > rank[root_b]:
        parent[root_b] = root_a
    else:
        parent[root_b] = root_a
        rank[root_a] += 1
    return True
```

### BFS Connectivity Analysis
Used **after failures** to find connected components.

Why BFS instead of DSU here?
> BFS naturally discovers all reachable nodes from a starting point in an existing edge set.
> DSU is designed for incremental union operations, not for scanning a fixed graph structure.

```
For each unvisited node as start:
  BFS to discover all reachable nodes
  → one connected component
```

### Failure Recovery
```
1. Identify failed MST edge
2. BFS to find current components using remaining MST edges
3. Collect candidate edges (rejected + active original edges)
4. For each candidate, check if it bridges different components
5. Select lowest-cost bridging edge
6. Add it as 'recovery' edge
7. Verify final connectivity
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/api/health` | Health check |
| POST   | `/api/networks` | Create network |
| GET    | `/api/networks/{id}` | Get network with nodes/edges |
| POST   | `/api/networks/{id}/nodes` | Add node |
| DELETE | `/api/networks/{id}/nodes/{nid}` | Delete node |
| POST   | `/api/networks/{id}/edges` | Add edge |
| DELETE | `/api/networks/{id}/edges/{eid}` | Delete edge |
| POST   | `/api/networks/{id}/load-example` | Load example network |
| POST   | `/api/networks/{id}/clear` | Clear all nodes/edges |
| POST   | `/api/networks/{id}/optimize` | Run Kruskal (returns full trace) |
| GET    | `/api/networks/{id}/optimization/trace` | Get step trace |
| POST   | `/api/networks/{id}/fail` | Simulate edge failure |
| POST   | `/api/networks/{id}/recover` | Run fault recovery |
| GET    | `/api/networks/{id}/analysis` | Get analysis data |
| POST   | `/api/benchmark` | Run benchmark on test graphs |

---

## Database Schema

```sql
CREATE TABLE networks (
    id         INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    created_at DATETIME
);

CREATE TABLE nodes (
    id         INTEGER PRIMARY KEY,
    network_id INTEGER REFERENCES networks(id),
    label      TEXT NOT NULL
);

CREATE TABLE edges (
    id          INTEGER PRIMARY KEY,
    network_id  INTEGER REFERENCES networks(id),
    source      TEXT NOT NULL,
    destination TEXT NOT NULL,
    cost        REAL NOT NULL,
    status      TEXT DEFAULT 'active'
);
```

---

## Error Handling

The application handles:
- Duplicate locations
- Duplicate connections
- Self-loops
- Invalid (negative or zero) costs
- Disconnected graphs (no MST possible)
- Failing a non-MST edge
- Recovery when no candidate exists

---

## Implemented Features

- [x] Interactive graph visualisation (React Flow)
- [x] Dynamic node and edge management
- [x] Example network loader
- [x] Kruskal's algorithm with full step-by-step trace
- [x] DSU visualisation (components, parent array, rank)
- [x] Failure simulation with BFS component analysis
- [x] Cost-based recovery by recalculation
- [x] Network analysis with measured execution time
- [x] Performance benchmark (Small / Medium / Large)
- [x] Guided / Technical mode toggle
- [x] Full REST API with Pydantic validation
- [x] SQLite persistence

## Not Implemented (Future Work)

- [ ] Dynamic MST update algorithms (Frederickson 1985, Eppstein et al.)
- [ ] Multiple simultaneous failures
- [ ] User accounts / network sharing
- [ ] Export to GraphML / JSON
- [ ] Dijkstra shortest path visualisation
- [ ] Mobile-responsive layout

---

## Technical Notes

**Recovery labelling**: The recovery step is labelled "Failure Recovery by Recalculation" — it re-examines the remaining edges and selects the cheapest one that bridges the disconnected components. It does **not** claim to implement a fully dynamic MST algorithm (which would require complex data structures like ET-trees).

**Benchmark values**: All benchmark execution times are genuinely measured. They reflect actual Python function call overhead and timer resolution on the host machine, not theoretical complexity values.

**DSU vs BFS**: DSU is used exclusively for Kruskal's cycle detection. BFS is used for post-failure component analysis. These are the correct tools for their respective tasks.
