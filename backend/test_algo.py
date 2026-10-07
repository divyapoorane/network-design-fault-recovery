from algorithms import kruskal, bfs_find_components, find_recovery_edge, generate_benchmark_graph

nodes = ['A', 'B', 'C', 'D', 'E']
edges = [
    ('A', 'B', 10.0, 1),
    ('A', 'C', 15.0, 2),
    ('B', 'C', 5.0, 3),
    ('B', 'D', 12.0, 4),
    ('C', 'D', 8.0, 5),
    ('C', 'E', 9.0, 6),
    ('D', 'E', 6.0, 7),
]

res = kruskal(nodes, edges)
print('Kruskal MST edges count:', len(res['mst_edges']))
print('MST total cost:', res['total_cost'])
print('Steps count:', len(res['steps']))
for s in res['steps']:
    print(f"  Step {s['step_number']}: {s['edge_source']}-{s['edge_destination']} -> {s['decision']}")

# Test BFS after removing edge (C-D, cost 8)
mst_remaining = [(e['source'], e['destination']) for e in res['mst_edges'] if not (e['source']=='C' and e['destination']=='D')]
comps = bfs_find_components(nodes, mst_remaining)
print('Components after removing C-D:', comps)

# Test recovery
rec = find_recovery_edge(comps, edges, 5) # 5 was C-D
print(f"Best recovery: {rec['source']}-{rec['destination']}, cost: {rec['cost']}")

# Test benchmarks
bench = generate_benchmark_graph('small')
print('Small graph nodes:', len(bench[0]), 'edges:', len(bench[1]))
print('SUCCESS!')
