// StageAnalyzeSidebar.jsx
// Stage 5 Left Sidebar: "Analysis Guide" and dynamic "Key Result" panel

import React from 'react';

export default function StageAnalyzeSidebar({
  network,
  optimizeResult,
  failureResult,
  recoveryResult,
  onBack,
}) {
  const edges = network?.edges || [];
  const mstEdges = edges.filter((e) => e.status === 'mst');
  const recoveryEdge = edges.find((e) => e.status === 'recovery');
  const failedEdge = edges.find((e) => e.status === 'failed');

  // Dynamic values
  const mstCost = optimizeResult?.total_mst_cost ?? mstEdges.reduce((acc, e) => acc + e.cost, 0);
  const recoveryCost = recoveryResult?.recovery_cost ?? (recoveryEdge ? recoveryEdge.cost : null);

  let isConnected = true;
  if (failedEdge && !recoveryEdge) {
    isConnected = false;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Subtitle / Stage Identity */}
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        Stage 5 — Final Evaluation
      </div>

      {/* ANALYSIS GUIDE */}
      <div className="section-card" style={{ padding: '10px 12px', marginBottom: 0 }}>
        <h3 style={{ fontSize: 11, marginBottom: 8, paddingBottom: 6 }}>Analysis Guide</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11, color: 'var(--color-text)' }}>
          <div>
            <strong style={{ color: 'var(--color-primary)' }}>1. Network Summary</strong>
            <p style={{ color: 'var(--color-text-muted)', margin: '2px 0 0 0', lineHeight: 1.35 }}>
              Shows locations (V), connections (E), selected MST edges, and overall topology status.
            </p>
          </div>

          <div>
            <strong style={{ color: 'var(--color-primary)' }}>2. Algorithm</strong>
            <p style={{ color: 'var(--color-text-muted)', margin: '2px 0 0 0', lineHeight: 1.35 }}>
              Details Kruskal's greedy selection and DSU cycle prevention logic.
            </p>
          </div>

          <div>
            <strong style={{ color: 'var(--color-primary)' }}>3. Performance</strong>
            <p style={{ color: 'var(--color-text-muted)', margin: '2px 0 0 0', lineHeight: 1.35 }}>
              Displays measured backend runtime and multi-scale benchmark results.
            </p>
          </div>

          <div>
            <strong style={{ color: 'var(--color-primary)' }}>4. Fault Recovery</strong>
            <p style={{ color: 'var(--color-text-muted)', margin: '2px 0 0 0', lineHeight: 1.35 }}>
              Summarizes post-failure BFS partitioning and lowest-cost recalculation recovery.
            </p>
          </div>
        </div>
      </div>

      {/* KEY RESULT */}
      <div className="section-card" style={{ padding: '10px 12px', marginBottom: 0, borderLeft: '3px solid var(--color-success)' }}>
        <h3 style={{ fontSize: 11, marginBottom: 8, paddingBottom: 6 }}>Key Result</h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 12, fontWeight: 700, color: isConnected ? 'var(--color-success)' : 'var(--color-danger)' }}>
          <span>{isConnected ? '✓' : '⚠'}</span>
          <span>{isConnected ? 'Network connected' : 'Network disconnected'}</span>
        </div>

        <div className="kv-row" style={{ padding: '3px 0', fontSize: 11 }}>
          <span className="kv-label">MST Cost</span>
          <span className="kv-value" style={{ color: 'var(--color-primary)' }}>
            ₹{mstCost}
          </span>
        </div>

        <div className="kv-row" style={{ padding: '3px 0', fontSize: 11 }}>
          <span className="kv-label">Recovery Cost</span>
          <span className="kv-value" style={{ color: recoveryCost != null ? 'var(--color-recovery)' : 'var(--color-text-muted)' }}>
            {recoveryCost != null ? `₹${recoveryCost}` : '—'}
          </span>
        </div>
      </div>

      {/* Back button */}
      <div>
        <button
          className="btn-secondary"
          onClick={onBack}
          style={{ width: '100%', fontSize: 12, padding: '7px 12px' }}
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
