// RightPanel.jsx
// Context-sensitive right panel — content changes per stage and selection.

import React from 'react';

// ── Node info ──────────────────────────────────────────────────
function NodeInfo({ nodeLabel, network }) {
  const edges = (network?.edges || []).filter(
    (e) => e.source === nodeLabel || e.destination === nodeLabel
  );
  const neighbours = edges.map((e) =>
    e.source === nodeLabel ? e.destination : e.source
  );

  return (
    <div className="node-info">
      <h3>📍 {nodeLabel}</h3>
      <div className="kv-row">
        <span className="kv-label">Connections</span>
        <span className="kv-value">{edges.length}</span>
      </div>
      <div className="kv-row">
        <span className="kv-label">Connected to</span>
        <span className="kv-value">{neighbours.join(', ') || '—'}</span>
      </div>
      {edges.map((e) => (
        <div key={e.id} className="edge-item" style={{ marginTop: 4 }}>
          <span className="edge-label">
            {e.source === nodeLabel ? e.destination : e.source}
          </span>
          <span className="edge-cost">₹{e.cost}</span>
          <span className={`tag tag-${e.status}`}>{e.status}</span>
        </div>
      ))}
    </div>
  );
}

// ── Edge info ──────────────────────────────────────────────────
function EdgeInfo({ edge }) {
  if (!edge) return null;

  const statusLabel = {
    active:   'Available',
    mst:      'Part of MST',
    rejected: 'Rejected (Cycle)',
    failed:   'FAILED',
    recovery: 'Recovery Edge',
  };

  return (
    <div className="edge-info">
      <h3>🔗 {edge.source} — {edge.destination}</h3>
      <div className="kv-row">
        <span className="kv-label">Cost</span>
        <span className="kv-value">₹{edge.cost}</span>
      </div>
      <div className="kv-row">
        <span className="kv-label">Status</span>
        <span className={`tag tag-${edge.status}`}>
          {statusLabel[edge.status] || edge.status}
        </span>
      </div>
      {edge.status === 'rejected' && (
        <div className="explanation" style={{ marginTop: 8 }}>
          This connection was examined by Kruskal but rejected because both endpoints
          were already in the same component — adding it would create a cycle.
        </div>
      )}
      {edge.status === 'failed' && (
        <div className="explanation" style={{ marginTop: 8, borderLeftColor: '#dc2626' }}>
          This connection has been simulated as failed. The network is now analysing
          the resulting disconnected components.
        </div>
      )}
      {edge.status === 'recovery' && (
        <div className="explanation" style={{ marginTop: 8, borderLeftColor: '#7c3aed' }}>
          This connection was selected as the lowest-cost option to reconnect the
          separated components after the failure.
        </div>
      )}
    </div>
  );
}

// ── Network summary ────────────────────────────────────────────
function NetworkSummary({ network, stage }) {
  const nodes = network?.nodes || [];
  const edges = network?.edges || [];

  const mstEdges      = edges.filter((e) => e.status === 'mst');
  const rejectedEdges = edges.filter((e) => e.status === 'rejected');
  const failedEdges   = edges.filter((e) => e.status === 'failed');
  const recoveryEdges = edges.filter((e) => e.status === 'recovery');

  const mstCost      = mstEdges.reduce((s, e) => s + e.cost, 0);
  const recoveryCost = recoveryEdges.reduce((s, e) => s + e.cost, 0);

  return (
    <div className="section-card">
      <h3>Network Summary</h3>
      <div className="kv-row">
        <span className="kv-label">Locations</span>
        <span className="kv-value">{nodes.length}</span>
      </div>
      <div className="kv-row">
        <span className="kv-label">Connections</span>
        <span className="kv-value">{edges.length}</span>
      </div>
      {mstEdges.length > 0 && (
        <>
          <div className="kv-row">
            <span className="kv-label">MST Edges</span>
            <span className="kv-value">{mstEdges.length}</span>
          </div>
          <div className="kv-row">
            <span className="kv-label">MST Cost</span>
            <span className="kv-value" style={{ color: '#2563eb' }}>₹{mstCost}</span>
          </div>
          <div className="kv-row">
            <span className="kv-label">Rejected</span>
            <span className="kv-value">{rejectedEdges.length}</span>
          </div>
        </>
      )}
      {failedEdges.length > 0 && (
        <div className="kv-row">
          <span className="kv-label">Failed</span>
          <span className="kv-value" style={{ color: '#dc2626' }}>{failedEdges.length}</span>
        </div>
      )}
      {recoveryEdges.length > 0 && (
        <div className="kv-row">
          <span className="kv-label">Recovery Cost</span>
          <span className="kv-value" style={{ color: '#7c3aed' }}>₹{recoveryCost}</span>
        </div>
      )}
    </div>
  );
}

// ── Legend ─────────────────────────────────────────────────────
function EdgeLegend() {
  const items = [
    { color: '#9ca3af', label: 'Available connection', dash: false },
    { color: '#2563eb', label: 'MST edge (selected)', dash: false },
    { color: '#f59e0b', label: 'Currently examining', dash: false },
    { color: '#d1d5db', label: 'Rejected (cycle)', dash: true },
    { color: '#dc2626', label: 'Failed', dash: true },
    { color: '#7c3aed', label: 'Recovery edge', dash: false },
  ];

  return (
    <div className="section-card">
      <h3>Legend</h3>
      {items.map(({ color, label, dash }) => (
        <div key={label} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '4px 0', fontSize: 12
        }}>
          <svg width="28" height="10">
            <line
              x1="0" y1="5" x2="28" y2="5"
              stroke={color}
              strokeWidth={dash ? 1.5 : 2.5}
              strokeDasharray={dash ? '4,3' : 'none'}
            />
          </svg>
          <span style={{ color: '#374151' }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────
export default function RightPanel({
  stage, network, selectedNode, selectedEdge,
}) {
  return (
    <>
      {selectedNode && (
        <NodeInfo nodeLabel={selectedNode} network={network} />
      )}
      {selectedEdge && !selectedNode && (
        <EdgeInfo edge={selectedEdge} />
      )}

      <NetworkSummary network={network} stage={stage} />

      {/* Stage-specific MST listing */}
      {stage >= 2 && network && (
        <div className="section-card">
          <h3>MST Connections</h3>
          {(network.edges || []).filter((e) => e.status === 'mst').length === 0 ? (
            <p style={{ fontSize: 12, color: '#9ca3af' }}>Not yet computed.</p>
          ) : (
            <>
              {(network.edges || [])
                .filter((e) => e.status === 'mst')
                .map((e) => (
                  <div key={e.id} className="edge-item mst">
                    <span className="edge-label">{e.source} — {e.destination}</span>
                    <span className="edge-cost">₹{e.cost}</span>
                  </div>
                ))}
              <div style={{ marginTop: 8 }}>
                {(network.edges || [])
                  .filter((e) => e.status === 'rejected')
                  .map((e) => (
                    <div key={e.id} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '4px 8px', fontSize: 11, color: '#9ca3af'
                    }}>
                      <span style={{ fontWeight: 500 }}>{e.source}—{e.destination}</span>
                      <span>₹{e.cost}</span>
                      <span className="tag tag-reject">Cycle</span>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      )}

      <EdgeLegend />
    </>
  );
}
