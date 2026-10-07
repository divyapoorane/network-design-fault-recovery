// StageOptimizePanel.jsx
// Stage 2: OPTIMIZE — run Kruskal, step through the execution, show DSU state.

import React, { useState, useRef, useEffect } from 'react';
import { runKruskal } from '../api';

// ── DSU Component Visualizer ────────────────────────────────────
function DSUVisualizer({ components }) {
  if (!components || components.length === 0) return null;
  return (
    <div style={{ marginBottom: 8 }}>
      <div className="dsu-components">
        {components.map((comp, i) => (
          <div key={i} className="dsu-component">
            {'{'}  {comp.join(', ')} {'}'}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step Card ──────────────────────────────────────────────────
function StepCard({ step, techMode }) {
  const [showDetails, setShowDetails] = useState(false);
  if (!step) return null;

  const isSelect = step.decision === 'SELECT';

  return (
    <div className="section-card" style={{ borderLeft: `4px solid ${isSelect ? '#2563eb' : '#d1d5db'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: '#6b7590', fontWeight: 600 }}>
          STEP {step.step_number} / {step.total_steps}
        </span>
        <span className={`tag ${isSelect ? 'tag-select' : 'tag-reject'}`}>
          {step.decision}
        </span>
      </div>

      <div className="two-col" style={{ marginBottom: 10 }}>
        <div>
          <label>Examining</label>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            {step.edge_source} — {step.edge_destination}
          </div>
        </div>
        <div>
          <label>Cost</label>
          <div style={{ fontWeight: 700, fontSize: 16 }}>₹{step.cost}</div>
        </div>
      </div>

      <div className="two-col" style={{ marginBottom: 10, fontSize: 12 }}>
        <div>
          <label>Find({step.edge_source})</label>
          <code>{step.find_source}</code>
        </div>
        <div>
          <label>Find({step.edge_destination})</label>
          <code>{step.find_destination}</code>
        </div>
      </div>

      <div className="explanation">{step.reason}</div>

      <div style={{ marginTop: 10 }}>
        <label style={{ marginBottom: 6 }}>Connected Components After This Step</label>
        <DSUVisualizer components={step.dsu_state} />
      </div>

      {techMode && (
        <div className="tech-details">
          <button
            className="tech-details-toggle"
            onClick={() => setShowDetails(!showDetails)}
          >
            Technical Details (parent[] / rank[])
            <span>{showDetails ? '▲' : '▼'}</span>
          </button>
          {showDetails && (
            <div className="tech-details-body">
              <div style={{ marginBottom: 8 }}>
                <label>Parent Array</label>
                <code style={{ display: 'block', fontSize: 11, lineHeight: 1.8 }}>
                  {step.parent_array
                    ? Object.entries(step.parent_array).map(([k, v]) =>
                        `${k} → ${v}`
                      ).join('  |  ')
                    : '—'}
                </code>
              </div>
              <div>
                <label>Rank Array</label>
                <code style={{ display: 'block', fontSize: 11, lineHeight: 1.8 }}>
                  {step.rank_array
                    ? Object.entries(step.rank_array).map(([k, v]) =>
                        `${k}: ${v}`
                      ).join('  |  ')
                    : '—'}
                </code>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function StageOptimizePanel({
  network, optimizeResult, onOptimizeComplete, onError, techMode,
  onCurrentEdgeChange,
}) {
  const [result, setResult]     = useState(optimizeResult || null);
  const [stepIdx, setStepIdx]   = useState(0);
  const [playing, setPlaying]   = useState(false);
  const [busy, setBusy]         = useState(false);
  const playRef = useRef(null);

  // Sync result if optimizeResult is passed/updated from parent
  useEffect(() => {
    if (optimizeResult && !result) {
      setResult(optimizeResult);
      if (optimizeResult.steps?.length) {
        setStepIdx(optimizeResult.steps.length - 1);
      }
    }
  }, [optimizeResult]);

  const nodes = network?.nodes || [];
  const edges = network?.edges || [];

  const currentStep = result?.steps?.[stepIdx] || null;

  // Notify parent which edge to highlight in the graph
  useEffect(() => {
    if (currentStep) {
      onCurrentEdgeChange(currentStep.edge_id || null);
    }
  }, [stepIdx, result]);

  // Auto-play
  useEffect(() => {
    if (!playing || !result) return;
    const total = result.steps.length;
    if (stepIdx >= total - 1) { setPlaying(false); return; }
    playRef.current = setTimeout(() => setStepIdx((i) => i + 1), 1200);
    return () => clearTimeout(playRef.current);
  }, [playing, stepIdx, result]);

  async function handleRun() {
    setBusy(true);
    setResult(null);
    setStepIdx(0);
    setPlaying(false);
    onCurrentEdgeChange(null);
    try {
      const res = await runKruskal(network.id);
      setResult(res.data);
      onOptimizeComplete(res.data);
    } catch (err) {
      onError(err.response?.data?.detail || 'Optimization failed');
    } finally {
      setBusy(false);
    }
  }

  function prev() { if (stepIdx > 0) setStepIdx((i) => i - 1); }
  function next() { if (result && stepIdx < result.steps.length - 1) setStepIdx((i) => i + 1); }
  function togglePlay() { setPlaying((p) => !p); }

  const canRun = nodes.length >= 2 && edges.length >= nodes.length - 1;

  return (
    <>
      <div className="section-card">
        <h3>Algorithm Setup</h3>
        <div className="explanation" style={{ marginBottom: 10 }}>
          Kruskal's algorithm sorts connections by cost and adds each one if it doesn't
          create a cycle. Cycle detection is done using Disjoint Set Union (DSU).
        </div>
        <div className="kv-row">
          <span className="kv-label">Locations (V)</span>
          <span className="kv-value">{nodes.length}</span>
        </div>
        <div className="kv-row">
          <span className="kv-label">Candidate Connections (E)</span>
          <span className="kv-value">{edges.length}</span>
        </div>
        <div className="kv-row">
          <span className="kv-label">Target MST Edges (V - 1)</span>
          <span className="kv-value">{Math.max(0, nodes.length - 1)}</span>
        </div>
        <div style={{ marginTop: 12 }}>
          <button
            className="btn-primary"
            onClick={handleRun}
            disabled={busy || !canRun}
            style={{ width: '100%' }}
          >
            {busy ? <span className="spinner" style={{ marginRight: 6 }} /> : null}
            {busy ? 'Running Kruskal...' : '▶ Run Kruskal\'s Algorithm'}
          </button>
          {!canRun && (
            <p style={{ fontSize: 11, color: '#dc2626', marginTop: 6 }}>
              Need at least {nodes.length} location{nodes.length !== 1 ? 's' : ''} and {Math.max(0, nodes.length - 1)} connection{nodes.length > 2 ? 's' : ''}.
            </p>
          )}
        </div>
      </div>

      {result && (
        <>
          {/* ── Step-by-step navigator ── */}
          <div className="section-card">
            <h3>Step-by-Step Execution</h3>
            <div className="step-nav">
              <button className="btn-ghost" onClick={prev}
                disabled={stepIdx === 0} style={{ padding: '4px 10px' }}>
                ‹ Prev
              </button>
              <div className="step-progress">
                <div
                  className="step-progress-fill"
                  style={{ width: `${((stepIdx + 1) / result.steps.length) * 100}%` }}
                />
              </div>
              <button className="play-btn" onClick={togglePlay}>
                {playing ? '⏸' : '▶'}
              </button>
              <button className="btn-ghost" onClick={next}
                disabled={stepIdx >= result.steps.length - 1} style={{ padding: '4px 10px' }}>
                Next ›
              </button>
            </div>
            <div className="step-counter" style={{ textAlign: 'center', marginBottom: 8 }}>
              Step {stepIdx + 1} of {result.steps.length}
            </div>

            <StepCard step={currentStep} techMode={techMode} />
          </div>

          {/* ── MST Result summary (after all steps viewed or when done) ── */}
          {stepIdx === result.steps.length - 1 && (
            <div className="section-card" style={{ borderLeft: '4px solid #16a34a' }}>
              <h3>✓ MST Complete</h3>
              <div className="kv-row">
                <span className="kv-label">Total MST Cost</span>
                <span className="kv-value" style={{ color: '#16a34a', fontSize: 15 }}>
                  ₹{result.total_mst_cost}
                </span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Edges Selected</span>
                <span className="kv-value">{result.mst_edges?.length}</span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Edges Rejected</span>
                <span className="kv-value">{result.rejected_edges?.length}</span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Network Status</span>
                <span className="kv-value" style={{ color: '#16a34a' }}>CONNECTED</span>
              </div>

              {techMode && (
                <div style={{ marginTop: 10 }}>
                  <label>Sorted Edge Order</label>
                  {result.sorted_edges?.map((e, i) => (
                    <div key={i} style={{ fontSize: 11, padding: '2px 0',
                      borderBottom: '1px solid #f3f4f6', display: 'flex',
                      justifyContent: 'space-between' }}>
                      <span>{e.source}—{e.destination}</span>
                      <span>₹{e.cost}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 8 }}>
                    <label>Execution Time</label>
                    <code>{result.execution_time_ms?.toFixed(4)} ms</code>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
