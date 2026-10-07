# services.py
# Business logic layer between API routes and core algorithms/database.
# Each function validates input, coordinates DB access, runs algorithms,
# and returns structured results ready for Pydantic serialisation.

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from typing import List, Optional
import time

from models import Network, Node, Edge
from algorithms import kruskal, bfs_find_components, find_recovery_edge, generate_benchmark_graph
import schemas


# ──────────────────────────────────────────────────────────────────
# NETWORK CRUD
# ──────────────────────────────────────────────────────────────────

async def create_network(db: AsyncSession, name: str) -> Network:
    network = Network(name=name)
    db.add(network)
    await db.commit()
    await db.refresh(network)
    return await get_network(db, network.id)


async def get_network(db: AsyncSession, network_id: int) -> Optional[Network]:
    result = await db.execute(
        select(Network)
        .options(selectinload(Network.nodes), selectinload(Network.edges))
        .where(Network.id == network_id)
        .execution_options(populate_existing=True)
    )
    return result.scalar_one_or_none()


async def list_networks(db: AsyncSession) -> List[Network]:
    result = await db.execute(
        select(Network)
        .options(selectinload(Network.nodes), selectinload(Network.edges))
    )
    return result.scalars().all()


# ──────────────────────────────────────────────────────────────────
# NODE OPERATIONS
# ──────────────────────────────────────────────────────────────────

async def add_node(db: AsyncSession, network_id: int, label: str) -> Node:
    """
    Add a node to the network.
    Validates: network exists, label not duplicate.
    """
    net_res = await db.execute(select(Network.id).where(Network.id == network_id))
    if not net_res.scalar_one_or_none():
        raise ValueError(f"Network {network_id} not found")

    existing_node = await db.execute(
        select(Node.id).where(Node.network_id == network_id, Node.label == label)
    )
    if existing_node.scalar_one_or_none():
        raise ValueError(f"Location '{label}' already exists in this network")

    node = Node(network_id=network_id, label=label)
    db.add(node)
    await db.commit()
    await db.refresh(node)
    return node


async def delete_node(db: AsyncSession, network_id: int, node_id: int) -> bool:
    """Delete a node and all its associated edges."""
    result = await db.execute(
        select(Node).where(Node.id == node_id, Node.network_id == network_id)
    )
    node = result.scalar_one_or_none()
    if not node:
        return False

    label = node.label
    await db.execute(
        delete(Edge).where(
            Edge.network_id == network_id,
            (Edge.source == label) | (Edge.destination == label)
        )
    )
    await db.delete(node)
    await db.commit()
    return True


# ──────────────────────────────────────────────────────────────────
# EDGE OPERATIONS
# ──────────────────────────────────────────────────────────────────

async def add_edge(
    db: AsyncSession, network_id: int,
    source: str, destination: str, cost: float
) -> Edge:
    """
    Add an edge to the network.
    Validates: both nodes exist, no duplicate, no self-loop.
    """
    net_res = await db.execute(select(Network.id).where(Network.id == network_id))
    if not net_res.scalar_one_or_none():
        raise ValueError(f"Network {network_id} not found")

    nodes_res = await db.execute(
        select(Node.label).where(Node.network_id == network_id)
    )
    node_labels = set(nodes_res.scalars().all())

    if source not in node_labels:
        raise ValueError(f"Location '{source}' does not exist. Add it first.")
    if destination not in node_labels:
        raise ValueError(f"Location '{destination}' does not exist. Add it first.")

    # Normalise edge direction to avoid A-B and B-A duplicates
    norm_src = min(source, destination)
    norm_dst = max(source, destination)

    edges_res = await db.execute(
        select(Edge).where(Edge.network_id == network_id)
    )
    existing_edges = edges_res.scalars().all()

    for e in existing_edges:
        es = min(e.source, e.destination)
        ed = max(e.source, e.destination)
        if es == norm_src and ed == norm_dst:
            raise ValueError(
                f"A connection between '{source}' and '{destination}' already exists"
            )

    edge = Edge(
        network_id=network_id,
        source=source,
        destination=destination,
        cost=cost,
        status="active"
    )
    db.add(edge)
    await db.commit()
    await db.refresh(edge)
    return edge


async def delete_edge(db: AsyncSession, network_id: int, edge_id: int) -> bool:
    result = await db.execute(
        select(Edge).where(Edge.id == edge_id, Edge.network_id == network_id)
    )
    edge = result.scalar_one_or_none()
    if not edge:
        return False
    await db.delete(edge)
    await db.commit()
    return True


# ──────────────────────────────────────────────────────────────────
# KRUSKAL OPTIMIZATION
# ──────────────────────────────────────────────────────────────────

async def run_optimization(db: AsyncSession, network_id: int) -> dict:
    """
    Execute Kruskal's algorithm on the stored network.
    Persists MST/rejected status back to the DB.
    """
    network = await get_network(db, network_id)
    if not network:
        raise ValueError(f"Network {network_id} not found")

    nodes = [n.label for n in network.nodes]
    if len(nodes) < 2:
        raise ValueError("A network needs at least 2 locations to optimize")

    # Only include active edges (not failed, not previously classified)
    active_edges = [
        (e.source, e.destination, e.cost, e.id)
        for e in network.edges
        if e.status in ("active", "mst", "rejected")
    ]

    if len(active_edges) < len(nodes) - 1:
        raise ValueError(
            f"Not enough connections ({len(active_edges)}) to form a spanning tree "
            f"for {len(nodes)} locations (need at least {len(nodes) - 1})"
        )

    # Reset all edge statuses before re-running
    for e in network.edges:
        if e.status in ("mst", "rejected"):
            e.status = "active"
    await db.commit()

    result = kruskal(nodes, active_edges)

    if not result["is_connected"]:
        raise ValueError(
            "No Minimum Spanning Tree exists because the network is disconnected. "
            "All locations must be reachable from each other."
        )

    # Persist MST/rejected status to DB
    mst_ids = {e["id"] for e in result["mst_edges"]}
    rejected_ids = {e["id"] for e in result["rejected_edges"]}

    for edge in network.edges:
        if edge.id in mst_ids:
            edge.status = "mst"
        elif edge.id in rejected_ids:
            edge.status = "rejected"

    await db.commit()
    return result


# ──────────────────────────────────────────────────────────────────
# FAILURE SIMULATION
# ──────────────────────────────────────────────────────────────────

async def simulate_failure(db: AsyncSession, network_id: int, edge_id: int) -> dict:
    """
    Mark an MST edge as failed, then use BFS to find resulting components.
    """
    network = await get_network(db, network_id)
    if not network:
        raise ValueError(f"Network {network_id} not found")

    # Validate: only MST edges can be failed (non-MST edges don't affect the optimized net)
    target_edge = None
    for e in network.edges:
        if e.id == edge_id:
            target_edge = e
            break

    if not target_edge:
        raise ValueError(f"Edge {edge_id} not found in network {network_id}")

    if target_edge.status != "mst":
        raise ValueError(
            f"Only MST connections can be simulated as failures. "
            f"Edge '{target_edge.source}—{target_edge.destination}' "
            f"is not part of the current MST (status: {target_edge.status})."
        )

    # Mark as failed
    target_edge.status = "failed"
    await db.commit()

    # BFS over remaining MST edges to find components
    nodes = [n.label for n in network.nodes]
    mst_active_edges = [
        (e.source, e.destination)
        for e in network.edges
        if e.status == "mst"
    ]

    components = bfs_find_components(nodes, mst_active_edges)

    return {
        "failed_edge": target_edge,
        "components": components,
        "network_status": "DISCONNECTED" if len(components) > 1 else "CONNECTED",
        "num_components": len(components),
    }


# ──────────────────────────────────────────────────────────────────
# RECOVERY
# ──────────────────────────────────────────────────────────────────

async def run_recovery(db: AsyncSession, network_id: int) -> dict:
    """
    After a failure, find the cheapest original edge that reconnects
    the disconnected components.

    Recovery steps:
      1. Identify failed edge(s)
      2. BFS to find current components using remaining MST edges
      3. Examine all original 'active' + 'rejected' edges as candidates
      4. Select cheapest edge that bridges two different components
      5. Mark it as 'recovery' and persist
    """
    network = await get_network(db, network_id)
    if not network:
        raise ValueError(f"Network {network_id} not found")

    # Find failed edges
    failed_edges = [e for e in network.edges if e.status == "failed"]
    if not failed_edges:
        raise ValueError("No failed connection found. Simulate a failure first.")

    # Current MST edges (not failed, not rejected)
    nodes = [n.label for n in network.nodes]
    mst_active = [
        (e.source, e.destination)
        for e in network.edges
        if e.status == "mst"
    ]

    components = bfs_find_components(nodes, mst_active)

    if len(components) == 1:
        raise ValueError("The network is already connected. No recovery needed.")

    # Candidate edges: anything that isn't in the MST or already failed
    # This includes rejected edges and still-active non-MST edges
    candidate_edges = [
        (e.source, e.destination, e.cost, e.id)
        for e in network.edges
        if e.status in ("rejected", "active")
    ]

    # Also consider failed edges from the original candidate list
    # (the non-failed original edges)
    failed_ids = {e.id for e in failed_edges}

    result = find_recovery_edge(components, candidate_edges, failed_ids.pop() if failed_ids else -1)

    if not result:
        raise ValueError(
            "Recovery is not possible with the currently available connections. "
            "No remaining connection bridges the disconnected components."
        )

    # Persist recovery edge status
    recovery_edge_obj = None
    for edge in network.edges:
        if edge.id == result["edge_id"]:
            edge.status = "recovery"
            recovery_edge_obj = edge
            break

    await db.commit()

    # Calculate final cost = MST cost + recovery cost
    mst_cost = sum(e.cost for e in network.edges if e.status == "mst")
    recovery_cost = result["cost"]
    final_cost = mst_cost + recovery_cost

    return {
        "recovery_edge": recovery_edge_obj,
        "recovery_cost": recovery_cost,
        "final_total_cost": final_cost,
        "network_status": "CONNECTED",
        "candidates_examined": result.get("all_candidates", []),
        "explanation": (
            f"The failed MST connection was replaced using '{result['source']}—{result['destination']}' "
            f"(cost: {result['cost']}), the lowest-cost remaining connection "
            f"that reconnects the separated components."
        ),
    }


# ──────────────────────────────────────────────────────────────────
# ANALYSIS
# ──────────────────────────────────────────────────────────────────

async def get_analysis(db: AsyncSession, network_id: int) -> dict:
    """Aggregate analysis data for Stage 5."""
    network = await get_network(db, network_id)
    if not network:
        raise ValueError(f"Network {network_id} not found")

    nodes = [n.label for n in network.nodes]
    all_edges = network.edges

    mst_edges = [e for e in all_edges if e.status in ("mst", "recovery")]
    recovery_edges = [e for e in all_edges if e.status == "recovery"]

    total_candidate_cost = sum(e.cost for e in all_edges if e.status not in ("failed",))
    mst_cost = sum(e.cost for e in all_edges if e.status == "mst")
    recovery_cost = sum(e.cost for e in recovery_edges) if recovery_edges else None
    final_cost = mst_cost + (recovery_cost or 0)

    # Re-run Kruskal just to get a fresh execution_time measurement
    active_for_timing = [
        (e.source, e.destination, e.cost, e.id)
        for e in all_edges
        if e.status in ("active", "mst", "rejected")
    ]
    timing_result = kruskal(nodes, active_for_timing)

    return {
        "network_id": network_id,
        "num_nodes": len(nodes),
        "num_candidate_edges": len(all_edges),
        "num_mst_edges": len([e for e in all_edges if e.status == "mst"]),
        "total_candidate_cost": total_candidate_cost,
        "mst_cost": mst_cost,
        "recovery_cost": recovery_cost,
        "final_cost": final_cost,
        "algorithm": "Kruskal's MST",
        "cycle_detection": "Disjoint Set Union (Union-Find)",
        "time_complexity": "O(E log E)",
        "space_complexity": "O(V + E)",
        "execution_time_ms": timing_result["execution_time_ms"],
    }


# ──────────────────────────────────────────────────────────────────
# BENCHMARK
# ──────────────────────────────────────────────────────────────────

def run_benchmark(sizes: List[str]) -> List[dict]:
    """
    Run Kruskal on deterministic test graphs and record execution times.
    All values are genuinely measured — nothing is fabricated.
    """
    results = []
    for size_label in sizes:
        nodes, edges = generate_benchmark_graph(size_label)
        result = kruskal(nodes, edges)
        results.append({
            "size_label": size_label,
            "num_nodes": len(nodes),
            "num_edges": len(edges),
            "mst_cost": result["total_cost"],
            "execution_time_ms": result["execution_time_ms"],
        })
    return results
