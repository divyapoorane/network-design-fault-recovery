import urllib.request, json

def post(url, data=None):
    payload = json.dumps(data).encode('utf-8') if data is not None else b"{}"
    req = urllib.request.Request(
        url,
        data=payload,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    res = urllib.request.urlopen(req)
    return json.loads(res.read().decode('utf-8'))

def get(url):
    res = urllib.request.urlopen(url)
    return json.loads(res.read().decode('utf-8'))

print('1. Creating network...')
net = post('http://127.0.0.1:8001/api/networks', {'name': 'E2E Demo Network'})
net_id = net['id']
print('   Network ID:', net_id)

print('2. Loading canonical example...')
net_loaded = post(f'http://127.0.0.1:8001/api/networks/{net_id}/load-example')
print(f'   Loaded: {len(net_loaded["nodes"])} nodes, {len(net_loaded["edges"])} edges')

print('3. Running Kruskal Optimization...')
opt = post(f'http://127.0.0.1:8001/api/networks/{net_id}/optimize')
print(f'   MST Cost: Rs.{opt["total_mst_cost"]}, Edges: {len(opt["mst_edges"])}, Trace Steps: {len(opt["steps"])}')

print('4. Simulating failure on an MST edge...')
target_edge_id = opt['mst_edges'][0]['id']
fail = post(f'http://127.0.0.1:8001/api/networks/{net_id}/fail', {'edge_id': target_edge_id})
print(f'   Status: {fail["network_status"]}, Components: {fail["num_components"]}')

print('5. Running recovery...')
rec = post(f'http://127.0.0.1:8001/api/networks/{net_id}/recover')
print(f'   Recovery connection: {rec["recovery_edge"]["source"]}-{rec["recovery_edge"]["destination"]}, Cost: Rs.{rec["recovery_cost"]}, Final status: {rec["network_status"]}')

print('6. Fetching analysis...')
analysis = get(f'http://127.0.0.1:8001/api/networks/{net_id}/analysis')
print(f'   Final Cost: Rs.{analysis["final_cost"]}, Time: {analysis["execution_time_ms"]:.4f} ms')

print('7. Running benchmark API...')
bench = post('http://127.0.0.1:8001/api/benchmark', {'sizes': ['small', 'medium', 'large']})
for entry in bench['entries']:
    print(f'   {entry["size_label"].upper()}: V={entry["num_nodes"]}, E={entry["num_edges"]}, MST Cost=Rs.{entry["mst_cost"]}, Time={entry["execution_time_ms"]:.4f} ms')

print('\n>>> ALL API ENDPOINTS FUNCTIONING END-TO-END! <<<')
