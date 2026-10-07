# algorithms.py
# Core DSA implementations:
#   - Disjoint Set Union (Union-Find) with path compression + union by rank
#   - Kruskal's Minimum Spanning Tree algorithm
#   - BFS-based connectivity analysis (used after failures)
#
# These are kept deliberately readable so that a student can trace
# every operation against the algorithm specification.

from typing import List, Tuple, Dict, Optional
import time
from collections import deque


# ══════════════════════════════════════════════════════════════════
# DISJOINT SET UNION (UNION-FIND)
# ══════════════════════════════════════════════════════════════════
#
# Why DSU?
#   Kruskal needs a fast way to answer: "Are two nodes already in
#   the same connected component?"  If yes → adding their edge
#   would create a cycle → REJECT.
#   DSU answers this in near-O(1) amortised time.

class DSU:
    """
    Disjoint Set Union with:
      - Path compression in find()
      - Union by rank in union()
    """

    def __init__(self, nodes: List[str]):
        # Each node is its own parent at the start — V separate components.
        self.parent: Dict[str, str] = {node: node for node in nodes}
        # Rank is used to keep the tree shallow (union by rank).
        self.rank: Dict[str, int] = {node: 0 for node in nodes}
        # Counters for the technical details panel.
        self.find_calls = 0
        self.union_calls = 0

    def find(self, node: str) -> str:
        """
        Return the representative (root) of the component containing `node`.
        Path compression: every node along the path points directly to root
        so future finds are O(1).
        """
        self.find_calls += 1
        if self.parent[node] != node:
            # Recursively find root, then compress path.
            self.parent[node] = self.find(self.parent[node])
        return self.parent[node]

    def union(self, a: str, b: str) -> bool:
        """
        Merge the components containing a and b.
        Returns True if they were in different components (merge happened),
        False if they were already in the same component (cycle detected).
        """
        self.union_calls += 1
        root_a = self.find(a)
        root_b = self.find(b)

        if root_a == root_b:
            # Same representative → same component → adding edge = cycle.
            return False

        # Union by rank: attach smaller tree under larger to minimise depth.
        if self.rank[root_a] < self.rank[root_b]:
            self.parent[root_a] = root_b
        elif self.rank[root_a] > self.rank[root_b]:
            self.parent[root_b] = root_a
        else:
            # Equal rank: arbitrarily pick root_a as new root, increase its rank.
            self.parent[root_b] = root_a
            self.rank[root_a] += 1

        return True

    def get_components(self) -> List[List[str]]:
        """
        Return a list of components, where each component is a sorted list
        of node labels sharing the same representative.
        """
        groups: Dict[str, List[str]] = {}
        for node in self.parent:
            root = self.find(node)
            groups.setdefault(root, []).append(node)
        return [sorted(members) for members in groups.values()]

    def snapshot(self) -> Tuple[Dict[str, str], Dict[str, int]]:
        """Return a copy of the current parent and rank arrays."""
        return dict(self.parent), dict(self.rank)


# ══════════════════════════════════════════════════════════════════
# KRUSKAL'S ALGORITHM
# ══════════════════════════════════════════════════════════════════
#
# Time complexity: O(E log E) — dominated by sorting the edge list.
# Space complexity: O(V + E) — DSU arrays + edge storage.
#
# The algorithm stops when V-1 edges have been selected, because a
# spanning tree on V nodes has exactly V-1 edges.

def kruskal(
    nodes: List[str],
    edges: List[Tuple[str, str, float, int]]   # (source, dest, cost, edge_id)
) -> Dict:
    """
    Run Kruskal's MST algorithm on the given graph.

    Returns a dict containing:
      - mst_edges       : list of (src, dst, cost, edge_id) in selection order
      - rejected_edges  : list of (src, dst, cost, edge_id) with reason
      - total_cost      : sum of MST edge costs
      - steps           : one entry per examined edge (for step-by-step UI)
      - execution_time_ms
      - dsu_final       : final DSU state
      - is_connected    : True if a full spanning tree was found
    """
    start_time = time.perf_counter()

    dsu = DSU(nodes)
    num_nodes = len(nodes)
    target_edges = num_nodes - 1   # MST has exactly V-1 edges

    # ── Step 1: Sort edges by cost (ascending) ──────────────────
    sorted_edges = sorted(edges, key=lambda e: e[2])

    mst_edges = []
    rejected_edges = []
    steps = []
    step_num = 0

    # ── Step 2: Examine each edge in sorted order ────────────────
    for src, dst, cost, eid in sorted_edges:
        step_num += 1

        find_src = dsu.find(src)
        find_dst = dsu.find(dst)

        if find_src != find_dst:
            # Different components → selecting this edge is safe.
            decision = "SELECT"
            reason = (
                f"'{src}' and '{dst}' belong to different components "
                f"(representatives: '{find_src}' and '{find_dst}'). "
                f"Adding this connection does not create a cycle."
            )
            dsu.union(src, dst)
            mst_edges.append({"source": src, "destination": dst, "cost": cost, "id": eid})
        else:
            # Same component → adding this edge would close a cycle.
            decision = "REJECT"
            reason = (
                f"'{src}' and '{dst}' are already in the same component "
                f"(both have representative '{find_src}'). "
                f"Adding this connection would create a cycle."
            )
            rejected_edges.append({
                "source": src, "destination": dst, "cost": cost, "id": eid,
                "reason": "Cycle"
            })

        # Capture DSU component state for the UI after this operation.
        components_now = dsu.get_components()
        parent_snap, rank_snap = dsu.snapshot()

        steps.append({
            "step_number": step_num,
            "total_steps": len(sorted_edges),
            "edge_source": src,
            "edge_destination": dst,
            "cost": cost,
            "edge_id": eid,
            "find_source": find_src,
            "find_destination": find_dst,
            "decision": decision,
            "reason": reason,
            "dsu_state": components_now,
            "mst_edges_so_far": list(mst_edges),
            "rejected_edges_so_far": list(rejected_edges),
            "parent_array": parent_snap,
            "rank_array": rank_snap,
        })

        # ── Step 3: Stop early once V-1 edges are in the MST ────
        # A spanning tree needs exactly V-1 edges. No need to examine more.
        if len(mst_edges) == target_edges:
            break

    elapsed_ms = (time.perf_counter() - start_time) * 1000
    total_cost = sum(e["cost"] for e in mst_edges)
    is_connected = len(mst_edges) == target_edges

    return {
        "mst_edges": mst_edges,
        "rejected_edges": rejected_edges,
        "total_cost": total_cost,
        "steps": steps,
        "execution_time_ms": elapsed_ms,
        "is_connected": is_connected,
        "num_nodes": num_nodes,
        "dsu_final": dsu,
        "sorted_edges": [{"source": s, "destination": d, "cost": c, "id": i}
                         for s, d, c, i in sorted_edges],
    }


# ══════════════════════════════════════════════════════════════════
# BFS CONNECTIVITY ANALYSIS
# ══════════════════════════════════════════════════════════════════
#
# Why BFS (not DSU) here?
#   After a failure we need to find connected components in an
#   arbitrary subgraph (the remaining active edges).  BFS naturally
#   discovers all reachable nodes from each unvisited start node.
#   DSU is best for incremental union operations, not for scanning
#   an existing edge set.

def bfs_find_components(
    nodes: List[str],
    active_edges: List[Tuple[str, str]]
) -> List[List[str]]:
    """
    Find connected components using BFS over the given edge set.

    Parameters
    ----------
    nodes        : all node labels in the network
    active_edges : edges that are currently operational (not failed)

    Returns
    -------
    List of components, each component is a sorted list of node labels.
    """
    # Build adjacency list for undirected graph.
    adjacency: Dict[str, List[str]] = {node: [] for node in nodes}
    for src, dst in active_edges:
        if src in adjacency and dst in adjacency:
            adjacency[src].append(dst)
            adjacency[dst].append(src)

    visited = set()
    components = []

    for start_node in sorted(nodes):
        if start_node in visited:
            continue

        # BFS from start_node to discover its component.
        component = []
        queue = deque([start_node])
        visited.add(start_node)

        while queue:
            current = queue.popleft()
            component.append(current)
            for neighbour in adjacency[current]:
                if neighbour not in visited:
                    visited.add(neighbour)
                    queue.append(neighbour)

        components.append(sorted(component))

    return components


def find_recovery_edge(
    components: List[List[str]],
    candidate_edges: List[Tuple[str, str, float, int]],
    failed_edge_id: int
) -> Optional[Dict]:
    """
    From the candidate edges (original graph minus MST-only edges,
    excluding the failed edge), find the lowest-cost edge that
    bridges two different components.

    This is the recovery selection step after a fault.

    Returns a dict with recovery edge info, or None if no recovery exists.
    """
    # Build a quick lookup: node → component index
    node_to_component: Dict[str, int] = {}
    for idx, component in enumerate(components):
        for node in component:
            node_to_component[node] = idx

    valid_candidates = []

    for src, dst, cost, eid in sorted(candidate_edges, key=lambda e: e[2]):
        if eid == failed_edge_id:
            continue   # Skip the edge that failed

        comp_src = node_to_component.get(src)
        comp_dst = node_to_component.get(dst)

        if comp_src is None or comp_dst is None:
            continue   # Unknown node

        if comp_src != comp_dst:
            # This edge bridges two different components — it's a candidate.
            valid_candidates.append({
                "edge_id": eid,
                "source": src,
                "destination": dst,
                "cost": cost,
                "connects_components": sorted([comp_src, comp_dst]),
            })

    if not valid_candidates:
        return None

    # Select the cheapest bridging edge.
    cheapest = min(valid_candidates, key=lambda e: e["cost"])
    best = dict(cheapest)
    best["all_candidates"] = [dict(c) for c in valid_candidates]
    return best


# ══════════════════════════════════════════════════════════════════
# BENCHMARK HELPER
# ══════════════════════════════════════════════════════════════════

def generate_benchmark_graph(size_label: str) -> Tuple[List[str], List[Tuple[str, str, float, int]]]:
    """
    Generate a deterministic test graph for benchmarking.
    Uses a fixed seed approach so results are reproducible.

    Sizes:
      small  : 6 nodes,  10 edges
      medium : 12 nodes, 25 edges
      large  : 20 nodes, 50 edges
    """
    import math

    SIZE_CONFIG = {
        "small":  (6,  10),
        "medium": (12, 25),
        "large":  (20, 50),
    }

    if size_label not in SIZE_CONFIG:
        raise ValueError(f"Unknown size label: {size_label}. Choose from {list(SIZE_CONFIG.keys())}")

    num_nodes, num_edges = SIZE_CONFIG[size_label]
    nodes = [chr(65 + i) for i in range(num_nodes)]   # A, B, C, ...

    # Generate edges deterministically (no random, reproducible).
    # Use a pattern based on node indices to create a connected-ish graph.
    seen = set()
    edges = []
    edge_id = 1

    # First ensure connectivity with a spanning chain.
    for i in range(num_nodes - 1):
        src = nodes[i]
        dst = nodes[i + 1]
        cost = round(5 + (i * 3 + 7) % 20, 1)
        edges.append((src, dst, cost, edge_id))
    # Add extra edges until we reach target count.
    # Pairwise candidate generation ensuring all possible unique pairs can be visited
    for u in range(num_nodes):
        for v in range(u + 1, num_nodes):
            if len(edges) >= num_edges:
                break
            key = (min(nodes[u], nodes[v]), max(nodes[u], nodes[v]))
            if key not in seen:
                cost = round(5.0 + ((u * 7 + v * 11 + 3) % 35), 1)
                edges.append((nodes[u], nodes[v], cost, edge_id))
                seen.add(key)
                edge_id += 1
        if len(edges) >= num_edges:
            break

    return nodes, edges
