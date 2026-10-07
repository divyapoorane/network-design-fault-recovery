// StageRecoverPanel.jsx
// Stage 4: RECOVER — find cheapest recovery edge after a failure.

import React, { useState } from 'react';
import { recoverNetwork } from '../api';

export default function StageRecoverPanel({
  network, failureResult, recoveryResult: propRecoveryResult, onRecoveryComplete, onError, techMode,
}) {
  const [result, setResult] = useState(propRecoveryResult || null);
  const [busy, setBusy]     = useState(false);

  React.useEffect(() => {
    if (propRecoveryResult) {
      setResult(propRecoveryResult);
    }
  }, [propRecoveryResult]);

  const hasFailed = (network?.edges || []).some((e) => e.status === 'failed');

  async function handleRecover() {
    setBusy(true);
    setResult(null);
    try {
      const res = await recoverNetwork(network.id);
      setResult(res.data);
      onRecoveryComplete(res.data);
    } catch (err) {
      onError(err.response?.data?.detail || 'Recovery failed');
    } finally { setBusy(false); }
  }

  // Candidate edges shown before running recovery
  const failedEdge = (network?.edges || []).find((e) => e.status === 'failed');
  const candidateEdges = (network?.edges || []).filter(
    (e) => e.status === 'rejected' || e.status === 'active'
  );

  return (
    <>
      <div className="section-card">
        <h3>Recovery Strategy</h3>
        <div className="explanation" style={{ marginBottom: 10 }}>
          The system examines the remaining available connections and selects the
          lowest-cost one that reconnects the separated components.
          This is <strong>Failure Recovery by Recalculation</strong>.
        </div>

        {!hasFailed ? (
          <p style={{ fontSize: 12, color: '#9ca3af' }}>
            Simulate a failure first in the Test stage.
          </p>
        ) : (
          <>
            {failedEdge && (
              <div className="kv-row">
                <span className="kv-label">Failed Connection</span>
                <span className="kv-value" style={{ color: '#dc2626' }}>
                  {failedEdge.source} — {failedEdge.destination}
                </span>
              </div>
            )}

            {failureResult?.components && (
              <div style={{ margin: '8px 0' }}>
                <label>Disconnected Components</label>
                {failureResult.components.map((c, i) => (
                  <div key={i} className="component-chip" style={{
                    background: i === 0 ? '#dbeafe' : '#ede9fe',
                    color: i === 0 ? '#1d4ed8' : '#7c3aed'
                  }}>
                    Component {i + 1}: {c.nodes?.join(', ')}
                  </div>
                ))}
              </div>
            )}

            <div style={{ margin: '10px 0' }}>
              <label>Candidate Recovery Connections</label>
              {candidateEdges.length === 0 ? (
                <p style={{ fontSize: 12, color: '#dc2626' }}>
                  No candidate connections available.
                </p>
              ) : (
                candidateEdges.map((e) => (
                  <div key={e.id} className="candidate-item">
                    <span style={{ fontWeight: 600 }}>{e.source} — {e.destination}</span>
                    <span style={{ color: '#6b7590', fontSize: 11 }}>₹{e.cost}</span>
                    <span className="tag tag-reject">{e.status}</span>
                  </div>
                ))
              )}
            </div>

            {!result && (
              <button
                className="btn-primary"
                onClick={handleRecover}
                disabled={busy || candidateEdges.length === 0}
                style={{ width: '100%', background: '#7c3aed' }}
              >
                {busy ? <span className="spinner" style={{ marginRight: 6 }} /> : '⚡ '}
                Find Best Recovery
              </button>
            )}
          </>
        )}
      </div>

      {result && (
        <div className="section-card" style={{ borderLeft: '4px solid #7c3aed' }}>
          <h3>Recovery Result</h3>

          {result.recovery_edge ? (
            <>
              <div className="kv-row">
                <span className="kv-label">Recovery Connection</span>
                <span className="kv-value" style={{ color: '#7c3aed' }}>
                  {result.recovery_edge.source} — {result.recovery_edge.destination}
                </span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Recovery Cost</span>
                <span className="kv-value">₹{result.recovery_cost}</span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Final Network Cost</span>
                <span className="kv-value" style={{ fontWeight: 700, fontSize: 15 }}>
                  ₹{result.final_total_cost}
                </span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Network Status</span>
                <span className="kv-value" style={{ color: '#16a34a' }}>
                  ✓ {result.network_status}
                </span>
              </div>

              <div className="explanation" style={{ marginTop: 10 }}>
                {result.explanation}
              </div>

              {techMode && result.candidates_examined?.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <label>All Candidates Examined</label>
                  {result.candidates_examined.map((c, i) => (
                    <div
                      key={i}
                      className={`candidate-item ${c.edge_id === result.recovery_edge?.id ? 'best' : ''}`}
                    >
                      <span style={{ fontWeight: 600 }}>{c.source}—{c.destination}</span>
                      <span style={{ color: '#6b7590', fontSize: 11 }}>₹{c.cost}</span>
                      <span style={{ fontSize: 11, color: '#6b7590' }}>
                        C{c.connects_components?.join('↔C')}
                      </span>
                      {c.edge_id === result.recovery_edge?.id && (
                        <span className="candidate-best-badge">Best</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="error-banner">
              No recovery connection available. The network cannot be reconnected
              with the remaining connections.
            </div>
          )}
        </div>
      )}
    </>
  );
}
