# main.py
# FastAPI application entry point.
# Defines all API routes and wires them to the service layer.

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import traceback

from database import get_db, init_db
import schemas
import services

app = FastAPI(
    title="Network Design & Fault Recovery API",
    description="Backend for DSA-based network optimization using Kruskal's MST algorithm",
    version="1.0.0",
)

# Allow React dev server to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await init_db()


# ──────────────────────────────────────────────────────────────────
# HEALTH
# ──────────────────────────────────────────────────────────────────

@app.get("/api/health", response_model=schemas.HealthResponse)
async def health_check():
    return {"status": "ok", "message": "Network Design & Fault Recovery API is running"}


# ──────────────────────────────────────────────────────────────────
# NETWORKS
# ──────────────────────────────────────────────────────────────────

@app.post("/api/networks", response_model=schemas.NetworkOut, status_code=status.HTTP_201_CREATED)
async def create_network(payload: schemas.NetworkCreate, db: AsyncSession = Depends(get_db)):
    """Create a new named network."""
    try:
        network = await services.create_network(db, payload.name)
        return network
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/networks", response_model=List[schemas.NetworkOut])
async def list_networks(db: AsyncSession = Depends(get_db)):
    networks = await services.list_networks(db)
    return networks


@app.get("/api/networks/{network_id}", response_model=schemas.NetworkOut)
async def get_network(network_id: int, db: AsyncSession = Depends(get_db)):
    network = await services.get_network(db, network_id)
    if not network:
        raise HTTPException(status_code=404, detail=f"Network {network_id} not found")
    return network


@app.delete("/api/networks/{network_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_network(network_id: int, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import delete as sql_delete
    from models import Network
    result = await db.execute(sql_delete(Network).where(Network.id == network_id))
    await db.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail=f"Network {network_id} not found")


# ──────────────────────────────────────────────────────────────────
# NODES
# ──────────────────────────────────────────────────────────────────

@app.post("/api/networks/{network_id}/nodes", response_model=schemas.NodeOut, status_code=status.HTTP_201_CREATED)
async def add_node(network_id: int, payload: schemas.NodeCreate, db: AsyncSession = Depends(get_db)):
    try:
        node = await services.add_node(db, network_id, payload.label.strip())
        return node
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/api/networks/{network_id}/nodes/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_node(network_id: int, node_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await services.delete_node(db, network_id, node_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found")


# ──────────────────────────────────────────────────────────────────
# EDGES
# ──────────────────────────────────────────────────────────────────

@app.post("/api/networks/{network_id}/edges", response_model=schemas.EdgeOut, status_code=status.HTTP_201_CREATED)
async def add_edge(network_id: int, payload: schemas.EdgeCreate, db: AsyncSession = Depends(get_db)):
    try:
        edge = await services.add_edge(
            db, network_id,
            payload.source.strip(), payload.destination.strip(), payload.cost
        )
        return edge
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/api/networks/{network_id}/edges/{edge_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_edge(network_id: int, edge_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await services.delete_edge(db, network_id, edge_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Edge {edge_id} not found")


# ──────────────────────────────────────────────────────────────────
# LOAD EXAMPLE NETWORK
# ──────────────────────────────────────────────────────────────────

@app.post("/api/networks/{network_id}/load-example", response_model=schemas.NetworkOut)
async def load_example(network_id: int, db: AsyncSession = Depends(get_db)):
    """
    Load the canonical example network:
      A-B=10, A-C=15, B-C=5, B-D=12, C-D=8, C-E=9, D-E=6
    Clears all existing nodes/edges first.
    """
    network = await services.get_network(db, network_id)
    if not network:
        raise HTTPException(status_code=404, detail=f"Network {network_id} not found")

    # Clear existing data
    from sqlalchemy import delete as sql_delete
    from models import Node, Edge
    await db.execute(sql_delete(Edge).where(Edge.network_id == network_id))
    await db.execute(sql_delete(Node).where(Node.network_id == network_id))
    await db.commit()

    # Add example nodes
    for label in ["A", "B", "C", "D", "E"]:
        node = __import__("models").Node(network_id=network_id, label=label)
        db.add(node)
    await db.commit()

    # Add example edges
    example_edges = [
        ("A", "B", 10),
        ("A", "C", 15),
        ("B", "C", 5),
        ("B", "D", 12),
        ("C", "D", 8),
        ("C", "E", 9),
        ("D", "E", 6),
    ]
    for src, dst, cost in example_edges:
        edge = __import__("models").Edge(
            network_id=network_id, source=src, destination=dst, cost=cost, status="active"
        )
        db.add(edge)
    await db.commit()

    return await services.get_network(db, network_id)


@app.post("/api/networks/{network_id}/clear", response_model=schemas.NetworkOut)
async def clear_network(network_id: int, db: AsyncSession = Depends(get_db)):
    """Remove all nodes and edges from a network."""
    from sqlalchemy import delete as sql_delete
    from models import Node, Edge

    network = await services.get_network(db, network_id)
    if not network:
        raise HTTPException(status_code=404, detail=f"Network {network_id} not found")

    await db.execute(sql_delete(Edge).where(Edge.network_id == network_id))
    await db.execute(sql_delete(Node).where(Node.network_id == network_id))
    await db.commit()

    return await services.get_network(db, network_id)


# ──────────────────────────────────────────────────────────────────
# OPTIMIZATION
# ──────────────────────────────────────────────────────────────────

@app.post("/api/networks/{network_id}/optimize")
async def run_kruskal(network_id: int, db: AsyncSession = Depends(get_db)):
    """
    Execute Kruskal's MST algorithm.
    Returns full result including step-by-step trace for the UI.
    """
    try:
        result = await services.run_optimization(db, network_id)
        # Fetch updated network to include status changes
        network = await services.get_network(db, network_id)

        return {
            "network_id": network_id,
            "mst_edges": result["mst_edges"],
            "rejected_edges": result["rejected_edges"],
            "total_mst_cost": result["total_cost"],
            "num_nodes": result["num_nodes"],
            "num_mst_edges": len(result["mst_edges"]),
            "is_connected": result["is_connected"],
            "execution_time_ms": result["execution_time_ms"],
            "steps": result["steps"],
            "sorted_edges": result["sorted_edges"],
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal error during optimization")


@app.get("/api/networks/{network_id}/optimization/trace")
async def get_trace(network_id: int, db: AsyncSession = Depends(get_db)):
    """
    Re-run Kruskal and return the step trace (for refresh without re-POSTing).
    """
    try:
        result = await services.run_optimization(db, network_id)
        return {"steps": result["steps"]}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ──────────────────────────────────────────────────────────────────
# FAILURE SIMULATION
# ──────────────────────────────────────────────────────────────────

@app.post("/api/networks/{network_id}/fail")
async def simulate_failure(
    network_id: int,
    payload: schemas.FailureRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Mark an MST edge as failed and return the resulting components.
    Uses BFS to find connected components after removal.
    """
    try:
        result = await services.simulate_failure(db, network_id, payload.edge_id)
        failed = result["failed_edge"]
        components_raw = result["components"]

        components_out = [
            {"component_id": i, "nodes": comp}
            for i, comp in enumerate(components_raw)
        ]

        return {
            "failed_edge": {
                "id": failed.id,
                "source": failed.source,
                "destination": failed.destination,
                "cost": failed.cost,
                "status": failed.status,
            },
            "components": components_out,
            "network_status": result["network_status"],
            "num_components": result["num_components"],
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ──────────────────────────────────────────────────────────────────
# RECOVERY
# ──────────────────────────────────────────────────────────────────

@app.post("/api/networks/{network_id}/recover")
async def recover_network(network_id: int, db: AsyncSession = Depends(get_db)):
    """
    Find and apply the cheapest recovery edge after a failure.
    """
    try:
        result = await services.run_recovery(db, network_id)
        rec_edge = result["recovery_edge"]

        return {
            "recovery_edge": {
                "id": rec_edge.id,
                "source": rec_edge.source,
                "destination": rec_edge.destination,
                "cost": rec_edge.cost,
                "status": rec_edge.status,
            } if rec_edge else None,
            "recovery_cost": result["recovery_cost"],
            "final_total_cost": result["final_total_cost"],
            "network_status": result["network_status"],
            "candidates_examined": result["candidates_examined"],
            "explanation": result["explanation"],
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ──────────────────────────────────────────────────────────────────
# ANALYSIS
# ──────────────────────────────────────────────────────────────────

@app.get("/api/networks/{network_id}/analysis")
async def get_analysis(network_id: int, db: AsyncSession = Depends(get_db)):
    try:
        return await services.get_analysis(db, network_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ──────────────────────────────────────────────────────────────────
# BENCHMARK
# ──────────────────────────────────────────────────────────────────

@app.post("/api/benchmark")
async def run_benchmark(payload: schemas.BenchmarkRequest):
    """
    Generate deterministic test graphs and measure Kruskal execution time.
    All values are genuinely measured — nothing is fabricated.
    """
    try:
        valid_sizes = {"small", "medium", "large"}
        for s in payload.sizes:
            if s not in valid_sizes:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid size '{s}'. Choose from: small, medium, large"
                )
        results = services.run_benchmark(payload.sizes)
        return {"entries": results}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
