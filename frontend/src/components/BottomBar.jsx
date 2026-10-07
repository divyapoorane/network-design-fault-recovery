// BottomBar.jsx
// Persistent bottom panel showing:
//   - Network status summary
//   - Stage-specific Back and Next / Continue action buttons
//   - Reset / New Network action
//   - Contextual explanation text

import React from 'react';

const STAGE_INFO = {
  1: {
    question: 'What network am I working with?',
    hint: 'Add locations and connections. Load the example to get started quickly.',
  },
  2: {
    question: 'What is the cheapest way to connect the network?',
    hint: "Kruskal's algorithm finds the minimum cost spanning tree using DSU for cycle detection.",
  },
  3: {
    question: 'What happens if a selected connection fails?',
    hint: 'Select an MST edge and simulate its failure. BFS will find the resulting components.',
  },
  4: {
    question: 'How can the network reconnect?',
    hint: 'The system selects the lowest-cost available connection bridging the two components.',
  },
  5: {
    question: 'How well did the algorithm perform?',
    hint: 'Review network stats, algorithm complexity, empirical benchmark, and technical report.',
  },
};

export default function BottomBar({
  stage,
  network,
  optimizeResult,
  failureResult,
  recoveryResult,
  onBack,
  onNext,
  canGoBack,
  canGoNext,
  nextLabel,
  onReset,
}) {
  const info = STAGE_INFO[stage] || {};
  const nodes = network?.nodes || [];
  const edges = network?.edges || [];
  const mstEdges = edges.filter((e) => e.status === 'mst');

  // Determine connectivity status
  let statusLabel = 'No network';
  let statusClass = 'unknown';
  if (nodes.length > 0 && edges.length === 0) {
    statusLabel = `${nodes.length} location${nodes.length !== 1 ? 's' : ''}, no connections`;
    statusClass = 'unknown';
  } else if (mstEdges.length > 0) {
    const failed = edges.find((e) => e.status === 'failed');
    const recovery = edges.find((e) => e.status === 'recovery');
    if (recovery) {
      statusLabel = 'Connected (recovered)';
      statusClass = 'connected';
    } else if (failed && failureResult?.network_status === 'DISCONNECTED') {
      statusLabel = `Disconnected (${failureResult.num_components} components)`;
      statusClass = 'disconnected';
    } else {
      statusLabel = `Connected · MST cost ₹${mstEdges.reduce((s, e) => s + e.cost, 0)}`;
      statusClass = 'connected';
    }
  } else if (nodes.length >= 2 && edges.length > 0) {
    statusLabel = `${nodes.length} locations · ${edges.length} connections`;
    statusClass = 'unknown';
  }

  return (
    <>
      <div className="graph-status-bar">
        <div className="status-badge">
          <div className={`status-dot ${statusClass}`} />
          <span>{statusLabel}</span>
        </div>

        <div style={{ fontSize: 12, color: '#6b7590', fontStyle: 'italic', flex: 1, textAlign: 'center', padding: '0 16px' }}>
          <span style={{ fontWeight: 600, color: '#374151' }}>Stage {stage}:</span>{' '}
          {info.question}
        </div>

        <div style={{ fontSize: 11, color: '#9ca3af' }}>
          V={nodes.length} · E={edges.length}
          {mstEdges.length > 0 ? ` · MST=${mstEdges.length}` : ''}
        </div>
      </div>

      <div className="graph-primary-action">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {canGoBack && (
            <button
              className="btn-secondary"
              onClick={onBack}
              style={{ fontSize: 12, padding: '7px 14px' }}
            >
              ← Back
            </button>
          )}

          <button
            className="btn-ghost"
            onClick={onReset}
            style={{ fontSize: 12, padding: '7px 12px', color: 'var(--color-danger)' }}
            title="Reset network and workflow state"
          >
            ↺ Reset / New Network
          </button>
        </div>

        <div style={{ fontSize: 12, color: '#6b7590', flex: 1, margin: '0 12px' }}>
          {info.hint}
        </div>

        {canGoNext && nextLabel && (
          <button
            className="btn-primary"
            onClick={onNext}
            style={{ whiteSpace: 'nowrap', fontSize: 13 }}
          >
            {nextLabel} →
          </button>
        )}
      </div>
    </>
  );
}
