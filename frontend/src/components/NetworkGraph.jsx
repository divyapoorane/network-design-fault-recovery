// NetworkGraph.jsx
// Interactive graph visualisation using React Flow.
// Maps backend edge status values to visual styles.
// No algorithm logic lives here — purely visual.

import React, { useMemo, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

// ── Edge colour mapping ──────────────────────────────────────
const EDGE_STYLES = {
  active:   { stroke: '#9ca3af', strokeWidth: 2, strokeDasharray: 'none' },
  mst:      { stroke: '#2563eb', strokeWidth: 3 },
  current:  { stroke: '#f59e0b', strokeWidth: 3 },
  rejected: { stroke: '#d1d5db', strokeWidth: 1.5, strokeDasharray: '5,4' },
  failed:   { stroke: '#dc2626', strokeWidth: 2.5, strokeDasharray: '4,3' },
  recovery: { stroke: '#7c3aed', strokeWidth: 3 },
  candidate:{ stroke: '#9ca3af', strokeWidth: 1.5, strokeDasharray: '3,3' },
};

// ── Node layout helpers ──────────────────────────────────────

function layoutNodes(nodeLabels) {
  // Place nodes in a circle so that any graph looks reasonable by default.
  const n = nodeLabels.length;
  const radius = Math.max(120, n * 28);
  const cx = 300, cy = 220;

  return nodeLabels.map((label, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    return {
      id: label,
      data: { label },
      position: {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      },
      style: {
        background: '#fff',
        border: '2px solid #2563eb',
        borderRadius: '50%',
        width: 44,
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: 14,
        color: '#1a2030',
        boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
      },
    };
  });
}

function buildEdges(edges, currentEdgeId, selectedEdgeId) {
  return edges.map((e) => {
    let status = e.status || 'active';
    let style = EDGE_STYLES[status] || EDGE_STYLES.active;

    // Override: if this edge is currently being examined by the step visualiser
    if (e.id === currentEdgeId) {
      style = EDGE_STYLES.current;
    }

    // Label shows cost + status hint
    const labelParts = [`₹${e.cost}`];
    if (status === 'mst')      labelParts.push('MST');
    if (status === 'failed')   labelParts.push('FAILED');
    if (status === 'recovery') labelParts.push('RECOVERY');
    if (e.id === currentEdgeId) labelParts.push('▶');

    return {
      id: `e-${e.id}`,
      source: e.source,
      target: e.destination,
      label: labelParts.join(' · '),
      labelStyle: {
        fontSize: 11,
        fontWeight: 600,
        fill: status === 'failed' ? '#dc2626' : status === 'recovery' ? '#7c3aed' : '#374151',
      },
      labelBgStyle: {
        fill: '#fff',
        fillOpacity: 0.85,
      },
      style,
      animated: e.id === currentEdgeId || status === 'recovery',
      markerEnd: undefined,
      data: { edgeObj: e },
      selected: e.id === selectedEdgeId,
    };
  });
}

export default function NetworkGraph({
  network,
  currentEdgeId = null,
  selectedEdgeId = null,
  onNodeClick = null,
  onEdgeClick = null,
}) {
  if (!network) {
    return (
      <div className="empty-state" style={{ height: '100%' }}>
        <div className="empty-state-icon">⬡</div>
        <div>No network loaded</div>
      </div>
    );
  }

  const nodeLabels = (network.nodes || []).map((n) => n.label);
  const edges = network.edges || [];

  const rfNodes = useMemo(() => layoutNodes(nodeLabels), [JSON.stringify(nodeLabels)]);
  const rfEdges = useMemo(
    () => buildEdges(edges, currentEdgeId, selectedEdgeId),
    [JSON.stringify(edges), currentEdgeId, selectedEdgeId]
  );

  const handleNodeClick = useCallback(
    (_, node) => onNodeClick && onNodeClick(node.id),
    [onNodeClick]
  );

  const handleEdgeClick = useCallback(
    (_, edge) => onEdgeClick && onEdgeClick(edge.data?.edgeObj),
    [onEdgeClick]
  );

  if (nodeLabels.length === 0) {
    return (
      <div className="empty-state" style={{ height: '100%' }}>
        <div className="empty-state-icon">⬡</div>
        <div>Add locations to get started</div>
        <div style={{ fontSize: 11, color: '#9ca3af' }}>Use the panel on the left</div>
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      onNodeClick={handleNodeClick}
      onEdgeClick={handleEdgeClick}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      nodesDraggable
      nodesConnectable={false}
      elementsSelectable
      deleteKeyCode={null}
    >
      <Background color="#e5e7eb" gap={20} size={1} />
      <Controls showInteractive={false} />
      <MiniMap
        nodeStrokeColor="#2563eb"
        nodeColor="#fff"
        nodeBorderRadius={50}
        style={{ border: '1px solid #dde1e9' }}
      />
    </ReactFlow>
  );
}
