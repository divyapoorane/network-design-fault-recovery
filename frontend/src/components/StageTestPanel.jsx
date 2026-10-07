// StageTestPanel.jsx
// Stage 3: TEST — select an MST edge and simulate a failure.

import React, { useState } from 'react';
import { simulateFailure } from '../api';

export default function StageTestPanel({
  network, optimizeResult, failureResult: propFailureResult, onFailureResult, onError,
}) {
  const [selectedEdgeId, setSelectedEdgeId] = useState(propFailureResult?.failed_edge?.id || null);
  const [failureResult, setFailureResult]   = useState(propFailureResult || null);
  const [busy, setBusy]                     = useState(false);

  React.useEffect(() => {
    if (propFailureResult) {
      setFailureResult(propFailureResult);
      if (propFailureResult.failed_edge?.id) {
        setSelectedEdgeId(propFailureResult.failed_edge.id);
      }
    }
  }, [propFailureResult]);

  const mstEdges = (network?.edges || []).filter((e) => e.status === 'mst');

  async function handleSimulate() {
    if (!selectedEdgeId) return;
    setBusy(true);
    setFailureResult(null);
    try {
      const res = await simulateFailure(network.id, selectedEdgeId);
      setFailureResult(res.data);
      onFailureResult(res.data);
    } catch (err) {
      onError(err.response?.data?.detail || 'Failure simulation failed');
    } finally { setBusy(false); }
  }

  const selectedEdge = mstEdges.find((e) => e.id === selectedEdgeId);

  return (
    <>
      <div className="section-card">
        <h3>Test Network Resilience</h3>
        <div className="explanation" style={{ marginBottom: 10 }}>
          An MST has no redundant edges. Removing any single edge may disconnect
          the network. Select an MST connection below to simulate its failure.
        </div>

        {mstEdges.length === 0 ? (
          <p style={{ fontSize: 12, color: '#9ca3af' }}>
            Run Kruskal's algorithm first to generate the MST.
          </p>
        ) : (
          <>
            <label>Select MST Connection to Fail</label>
            <div style={{ marginBottom: 10 }}>
              {mstEdges.map((e) => (
                <div
                  key={e.id}
                  className={`edge-item mst ${selectedEdgeId === e.id ? 'selected' : ''}`}
                  onClick={() => setSelectedEdgeId(e.id)}
                >
                  <span className="edge-label">
                    {selectedEdgeId === e.id ? '▶ ' : ''}{e.source} — {e.destination}
                  </span>
                  <span className="edge-cost">₹{e.cost}</span>
                  <span className="tag tag-mst">MST</span>
                </div>
              ))}
            </div>

            <button
              className="btn-danger"
              onClick={handleSimulate}
              disabled={busy || !selectedEdgeId}
              style={{ width: '100%' }}
            >
              {busy ? <span className="spinner" style={{ marginRight: 6 }} /> : '⚠ '}
              Simulate Failure
            </button>
          </>
        )}
      </div>

      {failureResult && (
        <div className="section-card" style={{ borderLeft: '4px solid #dc2626' }}>
          <h3>Failure Analysis</h3>

          <div className="kv-row">
            <span className="kv-label">Failed Connection</span>
            <span className="kv-value" style={{ color: '#dc2626' }}>
              {failureResult.failed_edge?.source} — {failureResult.failed_edge?.destination}
            </span>
          </div>
          <div className="kv-row">
            <span className="kv-label">Network Status</span>
            <span className="kv-value" style={{
              color: failureResult.network_status === 'DISCONNECTED' ? '#dc2626' : '#16a34a'
            }}>
              {failureResult.network_status}
            </span>
          </div>
          <div className="kv-row">
            <span className="kv-label">Components Formed</span>
            <span className="kv-value">{failureResult.num_components}</span>
          </div>

          <div style={{ marginTop: 10 }}>
            <label>Current Components (BFS Analysis)</label>
            {failureResult.components?.map((c, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px', background: '#f9fafb',
                borderRadius: 6, marginBottom: 4, fontSize: 12,
                borderLeft: `3px solid ${i === 0 ? '#2563eb' : '#7c3aed'}`
              }}>
                <strong>Component {i + 1}:</strong>
                <span>{c.nodes?.join(', ')}</span>
              </div>
            ))}
          </div>

          <div className="explanation" style={{ marginTop: 8 }}>
            The failed connection separated the network into {failureResult.num_components} component
            {failureResult.num_components > 1 ? 's' : ''}. The BFS algorithm discovered
            all nodes reachable from each isolated group.
          </div>
        </div>
      )}
    </>
  );
}
