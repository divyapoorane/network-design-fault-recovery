import asyncio
import os
import sys

# Ensure clean DB for testing
if os.path.exists("test_network.db"):
    try:
        os.remove("test_network.db")
    except Exception:
        pass

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from database import Base
import services

test_engine = create_async_engine("sqlite+aiosqlite:///./test_network.db", echo=False)
TestSession = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

async def run_all_tests():
    print("[1/6] Initializing database...")
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestSession() as session:
        print("[2/6] Creating network and nodes...")
        net = await services.create_network(session, "Campus Fiber Backbone")
        assert net.id is not None
        print(f"      Network created: ID {net.id}")

        for label in ["A", "B", "C", "D", "E"]:
            await services.add_node(session, net.id, label)
        print("      Added nodes: A, B, C, D, E")

        print("[3/6] Adding weighted connections...")
        # A-B=10, A-C=15, B-C=5, B-D=12, C-D=8, C-E=9, D-E=6
        example_edges = [
            ("A", "B", 10.0),
            ("A", "C", 15.0),
            ("B", "C", 5.0),
            ("B", "D", 12.0),
            ("C", "D", 8.0),
            ("C", "E", 9.0),
            ("D", "E", 6.0),
        ]
        edge_objs = []
        for src, dst, cost in example_edges:
            e = await services.add_edge(session, net.id, src, dst, cost)
            edge_objs.append(e)
        print(f"      Added {len(edge_objs)} connections")

        print("[4/6] Running Kruskal's algorithm...")
        opt = await services.run_optimization(session, net.id)
        mst_edges = opt["mst_edges"]
        mst_cost = opt["total_cost"]
        print(f"      MST completed: {len(mst_edges)} edges selected, total cost: Rs.{mst_cost}")
        assert len(mst_edges) == 4, f"Expected 4 MST edges, got {len(mst_edges)}"
        assert opt["is_connected"] is True

        # Let's verify steps generated
        print(f"      Kruskal trace steps generated: {len(opt['steps'])}")
        assert len(opt["steps"]) > 0

        print("[5/6] Simulating connection failure...")
        # Find C-D or D-E in MST edges
        target_edge_id = mst_edges[0]["id"]
        fail_res = await services.simulate_failure(session, net.id, target_edge_id)
        print(f"      Failed edge ID: {target_edge_id}, Network Status: {fail_res['network_status']}, Components: {fail_res['num_components']}")
        assert fail_res["network_status"] == "DISCONNECTED"
        assert fail_res["num_components"] == 2

        print("[6/6] Executing fault recovery by recalculation...")
        rec_res = await services.run_recovery(session, net.id)
        assert rec_res["recovery_edge"] is not None
        print(f"      Recovered using: {rec_res['recovery_edge'].source}-{rec_res['recovery_edge'].destination} (cost: Rs.{rec_res['recovery_cost']})")
        print(f"      Final Network Cost: Rs.{rec_res['final_total_cost']}, Status: {rec_res['network_status']}")
        assert rec_res["network_status"] == "CONNECTED"

        print("\n[BENCHMARK] Testing benchmark generator...")
        bench_res = services.run_benchmark(["small", "medium", "large"])
        for b in bench_res:
            print(f"      {b['size_label'].upper()}: V={b['num_nodes']}, E={b['num_edges']}, MST Cost=Rs.{b['mst_cost']}, Time={b['execution_time_ms']:.4f} ms")

    await test_engine.dispose()
    print("\n[SUCCESS] ALL BACKEND ARCHITECTURE & ALGORITHM TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(run_all_tests())
