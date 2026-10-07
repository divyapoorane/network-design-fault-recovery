// StageBuildPanel.jsx
// Stage 1: BUILD — add/remove nodes and edges, load example.

import React, { useState } from 'react';
import { addNode, deleteNode, addEdge, deleteEdge, loadExample, clearNetwork } from '../api';

export default function StageBuildPanel({ network, onNetworkUpdate, onError, techMode }) {
  const [nodeLabel, setNodeLabel]   = useState('');
  const [edgeSrc, setEdgeSrc]       = useState('');
  const [edgeDst, setEdgeDst]       = useState('');
  const [edgeCost, setEdgeCost]     = useState('');
  const [busy, setBusy]             = useState(false);

  const netId = network?.id;
  const nodes = network?.nodes || [];
  const edges = network?.edges || [];

  async function handleAddNode(e) {
    e.preventDefault();
    if (!nodeLabel.trim()) return;
    setBusy(true);
    try {
      await addNode(netId, nodeLabel.trim());
      setNodeLabel('');
      await onNetworkUpdate();
    } catch (err) {
      onError(err.response?.data?.detail || 'Failed to add location');
    } finally { setBusy(false); }
  }

  async function handleDeleteNode(nodeId) {
    setBusy(true);
    try {
      await deleteNode(netId, nodeId);
      await onNetworkUpdate();
    } catch (err) {
      onError(err.response?.data?.detail || 'Failed to delete location');
    } finally { setBusy(false); }
  }

  async function handleAddEdge(e) {
    e.preventDefault();
    const cost = parseFloat(edgeCost);
    if (!edgeSrc || !edgeDst || isNaN(cost)) {
      onError('Fill in both locations and a valid cost'); return;
    }
    setBusy(true);
    try {
      await addEdge(netId, edgeSrc, edgeDst, cost);
      setEdgeSrc(''); setEdgeDst(''); setEdgeCost('');
      await onNetworkUpdate();
    } catch (err) {
      onError(err.response?.data?.detail || 'Failed to add connection');
    } finally { setBusy(false); }
  }

  async function handleDeleteEdge(edgeId) {
    setBusy(true);
    try {
      await deleteEdge(netId, edgeId);
      await onNetworkUpdate();
    } catch (err) {
      onError(err.response?.data?.detail || 'Failed to delete connection');
    } finally { setBusy(false); }
  }

  async function handleLoadExample() {
    setBusy(true);
    try {
      await loadExample(netId);
      await onNetworkUpdate();
    } catch (err) {
      onError(err.response?.data?.detail || 'Failed to load example');
    } finally { setBusy(false); }
  }

  async function handleClear() {
    setBusy(true);
    try {
      await clearNetwork(netId);
      await onNetworkUpdate();
    } catch (err) {
      onError(err.response?.data?.detail || 'Failed to clear network');
    } finally { setBusy(false); }
  }

  const nodeOptions = nodes.map((n) => (
    <option key={n.id} value={n.label}>{n.label}</option>
  ));

  return (
    <>
      {/* ── Locations ── */}
      <div className="section-card">
        <h3>Locations</h3>
        <form onSubmit={handleAddNode}>
          <div className="form-row">
            <label>Location Name</label>
            <input
              value={nodeLabel}
              onChange={(e) => setNodeLabel(e.target.value)}
              placeholder="e.g. A, Server-1, Delhi"
              maxLength={20}
            />
          </div>
          <button className="btn-primary" type="submit" disabled={busy || !nodeLabel.trim()}
            style={{ width: '100%' }}>
            + Add Location
          </button>
        </form>

        {nodes.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {nodes.map((n) => (
              <div key={n.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '4px 0', borderBottom: '1px solid #f0f2f7', fontSize: 13
              }}>
                <span style={{ fontWeight: 600 }}>{n.label}</span>
                <button className="btn-ghost" onClick={() => handleDeleteNode(n.id)}
                  disabled={busy} style={{ padding: '2px 8px', fontSize: 11 }}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Connections ── */}
      <div className="section-card">
        <h3>Connections</h3>
        {nodes.length < 2 ? (
          <p style={{ fontSize: 12, color: '#9ca3af' }}>Add at least 2 locations first.</p>
        ) : (
          <form onSubmit={handleAddEdge}>
            <div className="form-row">
              <label>From</label>
              <select value={edgeSrc} onChange={(e) => setEdgeSrc(e.target.value)}>
                <option value="">Select location</option>
                {nodeOptions}
              </select>
            </div>
            <div className="form-row">
              <label>To</label>
              <select value={edgeDst} onChange={(e) => setEdgeDst(e.target.value)}>
                <option value="">Select location</option>
                {nodeOptions}
              </select>
            </div>
            <div className="form-row">
              <label>Cost (₹)</label>
              <input
                type="number"
                value={edgeCost}
                onChange={(e) => setEdgeCost(e.target.value)}
                placeholder="e.g. 10"
                min="1"
                step="any"
              />
            </div>
            <button className="btn-primary" type="submit" disabled={busy}
              style={{ width: '100%' }}>
              + Add Connection
            </button>
          </form>
        )}

        {edges.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {edges.map((e) => (
              <div key={e.id} className="edge-item">
                <span className="edge-label">{e.source} — {e.destination}</span>
                <span className="edge-cost">₹{e.cost}</span>
                <button className="btn-ghost" onClick={() => handleDeleteEdge(e.id)}
                  disabled={busy} style={{ padding: '2px 8px', fontSize: 11 }}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Quick actions ── */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-secondary" onClick={handleLoadExample} disabled={busy}
          style={{ flex: 1, fontSize: 12 }}>
          Load Example
        </button>
        <button className="btn-ghost" onClick={handleClear} disabled={busy}
          style={{ flex: 1, fontSize: 12 }}>
          Clear All
        </button>
      </div>

      {/* ── Technical mode ── */}
      {techMode && edges.length > 0 && (
        <div className="section-card" style={{ marginTop: 12 }}>
          <h3>Edge List</h3>
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['ID', 'Src', 'Dst', 'Cost', 'Status'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '3px 4px',
                    borderBottom: '1px solid #e5e7eb', color: '#6b7590', fontWeight: 700 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {edges.map((e) => (
                <tr key={e.id}>
                  <td style={{ padding: '3px 4px', borderBottom: '1px solid #f3f4f6' }}>{e.id}</td>
                  <td style={{ padding: '3px 4px', borderBottom: '1px solid #f3f4f6', fontWeight: 600 }}>{e.source}</td>
                  <td style={{ padding: '3px 4px', borderBottom: '1px solid #f3f4f6', fontWeight: 600 }}>{e.destination}</td>
                  <td style={{ padding: '3px 4px', borderBottom: '1px solid #f3f4f6' }}>₹{e.cost}</td>
                  <td style={{ padding: '3px 4px', borderBottom: '1px solid #f3f4f6' }}>
                    <span className={`tag tag-${e.status}`}>{e.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
