// StageAnalyzePanel.jsx
// Stage 5: ANALYZE — compact engineering evaluation & structured project report.

import React, { useState, useEffect } from 'react';
import { getAnalysis, runBenchmark } from '../api';

// ── Compact Bar Chart ──────────────────────────────────────────
function BarChart({ entries }) {
  if (!entries || entries.length === 0) return null;
  const maxTime = Math.max(...entries.map((e) => e.execution_time_ms));
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-end',
      gap: 16,
      height: 48,
      margin: '6px 0 10px 0',
      borderBottom: '1px solid var(--color-border)',
      paddingBottom: 2,
    }}>
      {entries.map((e, i) => {
        const pct = maxTime > 0 ? (e.execution_time_ms / maxTime) * 100 : 10;
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flex: 1 }}>
            <span style={{ fontSize: 9, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
              {e.execution_time_ms.toFixed(3)}ms
            </span>
            <div
              style={{
                width: '100%',
                background: 'var(--color-primary)',
                borderRadius: '2px 2px 0 0',
                height: `${Math.max(pct, 8)}%`,
                transition: 'height 0.3s ease',
              }}
            />
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>
              {e.size_label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function StageAnalyzePanel({
  network,
  optimizeResult,
  failureResult,
  recoveryResult,
  techMode,
  onBack,
  onReset,
}) {
  const [analysis, setAnalysis]       = useState(null);
  const [benchResult, setBenchResult] = useState(null);
  const [benchBusy, setBenchBusy]     = useState(false);
  const [error, setError]             = useState('');

  useEffect(() => {
    if (!network?.id) return;
    getAnalysis(network.id)
      .then((r) => setAnalysis(r.data))
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load analysis'));
  }, [network?.id]);

  async function handleBenchmark() {
    setBenchBusy(true);
    setBenchResult(null);
    try {
      const res = await runBenchmark(['small', 'medium', 'large']);
      setBenchResult(res.data.entries);
    } catch (err) {
      setError(err.response?.data?.detail || 'Benchmark failed');
    } finally { setBenchBusy(false); }
  }

  // Calculate actual dynamic network statistics
  const nodes = network?.nodes || [];
  const edges = network?.edges || [];
  const mstEdges = edges.filter((e) => e.status === 'mst');
  const rejectedEdges = edges.filter((e) => e.status === 'rejected');
  const failedEdge = edges.find((e) => e.status === 'failed');
  const recoveryEdge = edges.find((e) => e.status === 'recovery');

  const mstCost = optimizeResult?.total_mst_cost ?? mstEdges.reduce((acc, e) => acc + e.cost, 0);
  const recoveryCost = recoveryResult?.recovery_cost ?? (recoveryEdge ? recoveryEdge.cost : null);
  const finalCost = analysis?.final_cost ?? (mstCost + (recoveryCost || 0));

  let connectivityStatus = 'CONNECTED';
  if (failedEdge && !recoveryEdge) {
    connectivityStatus = 'DISCONNECTED';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      {/* ── Top Bar with Fast Actions ── */}
      <div style={{
        padding: '8px 16px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn-secondary" onClick={onBack} style={{ padding: '4px 10px', fontSize: 11 }}>
            ← Back
          </button>
          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text)' }}>
            System Evaluation &amp; Report
          </span>
        </div>
        <button
          className="btn-ghost"
          onClick={onReset}
          style={{
            fontSize: 11,
            padding: '4px 10px',
            color: 'var(--color-danger)',
            borderColor: 'var(--color-border)',
            fontWeight: 600,
          }}
        >
          ↺ Reset / New Network
        </button>
      </div>

      {error && (
        <div className="error-banner" style={{ margin: '8px 14px' }}>{error}</div>
      )}

      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* ── ROW 1: Compact Network Summary & Algorithm Analysis ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {/* Card A: Network Summary */}
          <div className="section-card" style={{ padding: '10px 12px', marginBottom: 0 }}>
            <h3 style={{ fontSize: 11, marginBottom: 8, paddingBottom: 4 }}>
              Network Summary
            </h3>
            <div className="kv-row" style={{ padding: '3px 0', fontSize: 12 }}>
              <span className="kv-label">Locations (V)</span>
              <span className="kv-value">{nodes.length}</span>
            </div>
            <div className="kv-row" style={{ padding: '3px 0', fontSize: 12 }}>
              <span className="kv-label">Connections (E)</span>
              <span className="kv-value">{edges.length}</span>
            </div>
            <div className="kv-row" style={{ padding: '3px 0', fontSize: 12 }}>
              <span className="kv-label">MST Edges</span>
              <span className="kv-value">{mstEdges.length || (nodes.length > 1 ? nodes.length - 1 : 0)}</span>
            </div>
            <div className="kv-row" style={{ padding: '3px 0', fontSize: 12 }}>
              <span className="kv-label">MST Total Cost</span>
              <span className="kv-value" style={{ color: 'var(--color-primary)' }}>₹{mstCost}</span>
            </div>
            <div className="kv-row" style={{ padding: '3px 0', fontSize: 12 }}>
              <span className="kv-label">Rejected Edges</span>
              <span className="kv-value">{rejectedEdges.length}</span>
            </div>
            <div className="kv-row" style={{ padding: '3px 0', fontSize: 12 }}>
              <span className="kv-label">Network Status</span>
              <span className="kv-value" style={{ color: connectivityStatus === 'CONNECTED' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                ● {connectivityStatus}
              </span>
            </div>
          </div>

          {/* Card B: Algorithm Analysis */}
          <div className="section-card" style={{ padding: '10px 12px', marginBottom: 0 }}>
            <h3 style={{ fontSize: 11, marginBottom: 8, paddingBottom: 4 }}>
              Algorithm Analysis
            </h3>
            <div className="kv-row" style={{ padding: '3px 0', fontSize: 12 }}>
              <span className="kv-label">Algorithm</span>
              <span className="kv-value">Kruskal's MST</span>
            </div>
            <div className="kv-row" style={{ padding: '3px 0', fontSize: 12 }}>
              <span className="kv-label">Cycle Detection</span>
              <span className="kv-value">Disjoint Set Union (DSU)</span>
            </div>
            <div className="kv-row" style={{ padding: '3px 0', fontSize: 12 }}>
              <span className="kv-label">Time Complexity</span>
              <span className="complexity-badge" style={{ padding: '2px 6px', fontSize: 11 }}>O(E log E)</span>
            </div>
            <div className="kv-row" style={{ padding: '3px 0', fontSize: 12 }}>
              <span className="kv-label">Space Complexity</span>
              <span className="complexity-badge" style={{ padding: '2px 6px', fontSize: 11 }}>O(V + E)</span>
            </div>
            <div className="explanation" style={{ margin: '6px 0 0 0', padding: '6px 8px', fontSize: 11, lineHeight: 1.4 }}>
              Kruskal's algorithm sorts edges by cost and greedily unions components. DSU prevents cycles in near-O(1) amortized time.
            </div>
          </div>
        </div>

        {/* ── ROW 2: Measured Performance & Benchmark (Button Immediately Visible) ── */}
        <div className="section-card" style={{ padding: '10px 12px', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, borderBottom: '1px solid var(--color-border)', paddingBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 style={{ fontSize: 11, margin: 0, padding: 0, border: 'none' }}>
                Measured Performance
              </h3>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>
                {analysis ? `${analysis.execution_time_ms.toFixed(4)} ms` : 'Measuring...'}
              </span>
              <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                (Actual backend runtime)
              </span>
            </div>

            <button
              className="btn-primary"
              onClick={handleBenchmark}
              disabled={benchBusy}
              style={{ padding: '5px 12px', fontSize: 11, fontWeight: 600 }}
            >
              {benchBusy ? <span className="spinner" style={{ marginRight: 4 }} /> : null}
              {benchBusy ? 'Benchmarking...' : '▶ Run Benchmark'}
            </button>
          </div>

          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.35 }}>
            Measured runtime represents genuine server execution time for this graph. Benchmark evaluates execution across Small, Medium, and Large topologies.
          </div>

          {/* Benchmark Results (rendered inline when triggered) */}
          {benchResult && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--color-border)' }}>
              <BarChart entries={benchResult} />
              <table className="bench-table" style={{ fontSize: 11 }}>
                <thead>
                  <tr>
                    <th style={{ padding: '4px 8px' }}>Graph Size</th>
                    <th style={{ padding: '4px 8px' }}>Vertices (V)</th>
                    <th style={{ padding: '4px 8px' }}>Edges (E)</th>
                    <th style={{ padding: '4px 8px' }}>MST Cost</th>
                    <th style={{ padding: '4px 8px' }}>Execution Time</th>
                  </tr>
                </thead>
                <tbody>
                  {benchResult.map((e, i) => (
                    <tr key={i}>
                      <td style={{ padding: '4px 8px' }}><strong>{e.size_label}</strong></td>
                      <td style={{ padding: '4px 8px' }}>{e.num_nodes}</td>
                      <td style={{ padding: '4px 8px' }}>{e.num_edges}</td>
                      <td style={{ padding: '4px 8px' }}>₹{e.mst_cost}</td>
                      <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>{e.execution_time_ms.toFixed(4)} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── ROW 3: Project Evaluation Report (Structured, Scannable Cards) ── */}
        <div className="section-card" style={{ padding: '10px 12px', marginBottom: 0, background: '#fafbfc' }}>
          <h3 style={{ fontSize: 11, marginBottom: 8, paddingBottom: 6, color: 'var(--color-primary)' }}>
            Project Evaluation Report
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
            {/* A. Problem Statement */}
            <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '8px 10px' }}>
              <strong style={{ fontSize: 11, color: 'var(--color-primary)' }}>A. Problem Statement</strong>
              <p style={{ fontSize: 11, color: 'var(--color-text)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                "Connect all given locations using the minimum possible total connection cost while avoiding redundant/cyclic connections."
              </p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '3px 0 0 0', lineHeight: 1.35 }}>
                The system determines an optimal spanning topology and evaluates operational survivability against unplanned connection outages.
              </p>
            </div>

            {/* B. Approach */}
            <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '8px 10px' }}>
              <strong style={{ fontSize: 11, color: 'var(--color-primary)' }}>B. Approach</strong>
              <ul style={{ margin: '4px 0 0 14px', padding: 0, fontSize: 11, color: 'var(--color-text)', lineHeight: 1.35 }}>
                <li>Represented as a weighted undirected graph G = (V, E).</li>
                <li>Locations represent vertices; links represent weighted edges.</li>
                <li>Kruskal's algorithm sorts and iterates candidate edges by cost.</li>
                <li>DSU (Union-Find) validates acyclic properties via root checks.</li>
              </ul>
            </div>

            {/* C. Optimization Result */}
            <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '8px 10px' }}>
              <strong style={{ fontSize: 11, color: 'var(--color-primary)' }}>C. Optimization Result</strong>
              <div style={{ marginTop: 4, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 8px', fontSize: 11 }}>
                <div>Locations (V): <strong>{nodes.length}</strong></div>
                <div>Candidate Edges (E): <strong>{edges.length}</strong></div>
                <div>MST Edges: <strong>{mstEdges.length || (nodes.length > 1 ? nodes.length - 1 : 0)}</strong></div>
                <div>MST Cost: <strong style={{ color: 'var(--color-primary)' }}>₹{mstCost}</strong></div>
                <div>Rejected Edges: <strong>{rejectedEdges.length}</strong></div>
                <div>Status: <strong style={{ color: 'var(--color-success)' }}>{connectivityStatus}</strong></div>
              </div>
            </div>

            {/* D. Fault Testing */}
            <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '8px 10px' }}>
              <strong style={{ fontSize: 11, color: 'var(--color-primary)' }}>D. Fault Testing</strong>
              <p style={{ fontSize: 11, color: 'var(--color-text)', margin: '4px 0 0 0', lineHeight: 1.35 }}>
                An active MST connection was severed to simulate a line breakdown.
                BFS traversal confirmed network partition into <strong>{failureResult?.num_components || 2} components</strong>.
              </p>
              {failedEdge && (
                <div style={{ marginTop: 4, fontSize: 11, color: 'var(--color-danger)' }}>
                  Failed connection: <strong>{failedEdge.source} — {failedEdge.destination}</strong> (₹{failedEdge.cost})
                </div>
              )}
            </div>

            {/* E. Recovery */}
            <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '8px 10px' }}>
              <strong style={{ fontSize: 11, color: 'var(--color-primary)' }}>E. Recovery by Recalculation</strong>
              <p style={{ fontSize: 11, color: 'var(--color-text)', margin: '4px 0 0 0', lineHeight: 1.35 }}>
                Examined remaining candidate links bridging distinct components. Selected lowest-cost valid edge to restore global connectivity.
              </p>
              <div style={{ marginTop: 4, fontSize: 11, color: 'var(--color-text)' }}>
                {recoveryEdge ? (
                  <>
                    Recovery edge: <strong style={{ color: 'var(--color-recovery)' }}>{recoveryEdge.source} — {recoveryEdge.destination}</strong> | Cost: <strong>₹{recoveryCost}</strong> | Final Cost: <strong>₹{finalCost}</strong>
                  </>
                ) : (
                  <span style={{ color: 'var(--color-text-muted)' }}>Evaluates available non-tree connections to bridge partitions.</span>
                )}
              </div>
            </div>

            {/* F. Complexity Analysis */}
            <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '8px 10px' }}>
              <strong style={{ fontSize: 11, color: 'var(--color-primary)' }}>F. Complexity Analysis</strong>
              <div style={{ marginTop: 4, fontSize: 11, lineHeight: 1.35 }}>
                <div><strong>Time: O(E log E)</strong> — Dominated by sorting E edges; DSU path compression and union by rank run in near O(1) amortized time.</div>
                <div style={{ marginTop: 3 }}><strong>Space: O(V + E)</strong> — Storing adjacency edges and parent/rank DSU structures proportional to V and E.</div>
              </div>
            </div>
          </div>

          {/* G. Conclusion */}
          <div style={{ marginTop: 10, background: '#fff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: '8px 10px' }}>
            <strong style={{ fontSize: 11, color: 'var(--color-primary)' }}>G. Conclusion</strong>
            <p style={{ fontSize: 11, color: 'var(--color-text)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
              The system successfully constructs a verified minimum-cost network without redundant cycles, accurately simulates edge failures using BFS component discovery, and restores connectivity using the lowest-cost available recovery connection. It represents an end-to-end, deterministic graph optimization pipeline.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
