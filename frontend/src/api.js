// api.js
// Centralised API client for the Network Design & Fault Recovery backend.
// All requests go through these functions — no fetch() calls scattered in components.

import axios from 'axios';

const BASE = 'http://localhost:8001/api';

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
});

// ── Health ────────────────────────────────────────────────────────
export const checkHealth = () => api.get('/health');

// ── Networks ──────────────────────────────────────────────────────
export const createNetwork = (name) => api.post('/networks', { name });
export const getNetwork    = (id)   => api.get(`/networks/${id}`);
export const listNetworks  = ()     => api.get('/networks');

// ── Nodes ─────────────────────────────────────────────────────────
export const addNode    = (netId, label)  => api.post(`/networks/${netId}/nodes`, { label });
export const deleteNode = (netId, nodeId) => api.delete(`/networks/${netId}/nodes/${nodeId}`);

// ── Edges ─────────────────────────────────────────────────────────
export const addEdge    = (netId, source, destination, cost) =>
  api.post(`/networks/${netId}/edges`, { source, destination, cost });
export const deleteEdge = (netId, edgeId) =>
  api.delete(`/networks/${netId}/edges/${edgeId}`);

// ── Example / Clear ───────────────────────────────────────────────
export const loadExample    = (netId) => api.post(`/networks/${netId}/load-example`);
export const clearNetwork   = (netId) => api.post(`/networks/${netId}/clear`);

// ── Optimization ──────────────────────────────────────────────────
export const runKruskal  = (netId) => api.post(`/networks/${netId}/optimize`);
export const getTrace    = (netId) => api.get(`/networks/${netId}/optimization/trace`);

// ── Failure ───────────────────────────────────────────────────────
export const simulateFailure = (netId, edgeId) =>
  api.post(`/networks/${netId}/fail`, { edge_id: edgeId });

// ── Recovery ──────────────────────────────────────────────────────
export const recoverNetwork = (netId) => api.post(`/networks/${netId}/recover`);

// ── Analysis ──────────────────────────────────────────────────────
export const getAnalysis = (netId) => api.get(`/networks/${netId}/analysis`);

// ── Benchmark ─────────────────────────────────────────────────────
export const runBenchmark = (sizes) => api.post('/benchmark', { sizes });

export default api;
