// App.jsx
// Main application shell.
// Manages: active stage, network state, mode toggle (Guided / Technical).
// Orchestrates the 3-column layout, bidirectional stage navigation, and state preservation.

import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

import NetworkGraph       from './components/NetworkGraph';
import StageBuildPanel    from './components/StageBuildPanel';
import StageOptimizePanel from './components/StageOptimizePanel';
import StageTestPanel     from './components/StageTestPanel';
import StageRecoverPanel  from './components/StageRecoverPanel';
import StageAnalyzePanel  from './components/StageAnalyzePanel';
import StageAnalyzeSidebar from './components/StageAnalyzeSidebar';
import RightPanel         from './components/RightPanel';
import BottomBar          from './components/BottomBar';

import { createNetwork, getNetwork, clearNetwork, checkHealth } from './api';

const STAGES = [
  { id: 1, label: 'Build',    key: 'BUILD'    },
  { id: 2, label: 'Optimize', key: 'OPTIMIZE' },
  { id: 3, label: 'Test',     key: 'TEST'     },
  { id: 4, label: 'Recover',  key: 'RECOVER'  },
  { id: 5, label: 'Analyze',  key: 'ANALYZE'  },
];

export default function App() {
  const [stage, setStage]               = useState(1);
  const [maxStage, setMaxStage]         = useState(1);
  const [network, setNetwork]           = useState(null);
  const [netError, setNetError]         = useState('');
  const [techMode, setTechMode]         = useState(false);
  const [backendOk, setBackendOk]       = useState(null);

  // Selection state (passed to graph + right panel)
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [currentEdgeId, setCurrentEdgeId] = useState(null);  // Kruskal step highlight

  // Algorithm results (preserved during backward/forward navigation)
  const [optimizeResult, setOptimizeResult] = useState(null);
  const [failureResult, setFailureResult]   = useState(null);
  const [recoveryResult, setRecoveryResult] = useState(null);

  // ── Backend health check ────────────────────────────────────
  useEffect(() => {
    checkHealth()
      .then(() => setBackendOk(true))
      .catch(() => setBackendOk(false));
  }, []);

  // ── Bootstrap: create or reuse network 1 ──────────────────
  useEffect(() => {
    if (backendOk !== true) return;
    getNetwork(1)
      .then((r) => setNetwork(r.data))
      .catch(() => {
        createNetwork('My Network')
          .then((r) => setNetwork(r.data))
          .catch(() => setNetError('Could not connect to backend. Is the server running?'));
      });
  }, [backendOk]);

  // ── Refresh network from backend ───────────────────────────
  const refreshNetwork = useCallback(async () => {
    if (!network?.id) return;
    try {
      const r = await getNetwork(network.id);
      setNetwork(r.data);
      setNetError('');
    } catch (err) {
      setNetError(err.response?.data?.detail || 'Failed to refresh network');
    }
  }, [network?.id]);

  // ── Stage unlock logic ─────────────────────────────────────
  function unlockStage(s) {
    setMaxStage((prev) => Math.max(prev, s));
  }

  // Prevent jumping forward to a step whose prerequisite has not been completed
  function goStage(s) {
    if (s <= maxStage) {
      setStage(s);
    }
  }

  function handleBack() {
    if (stage > 1) {
      setStage((prev) => prev - 1);
    }
  }

  // ── Reset / New Network Action ─────────────────────────────
  async function handleResetWorkflow() {
    if (!network?.id) return;
    const confirmReset = window.confirm(
      'Reset the entire network and workflow? This will clear all locations, connections, and algorithm states.'
    );
    if (!confirmReset) return;

    try {
      await clearNetwork(network.id);
      setOptimizeResult(null);
      setFailureResult(null);
      setRecoveryResult(null);
      setSelectedNode(null);
      setSelectedEdge(null);
      setCurrentEdgeId(null);
      setMaxStage(1);
      setStage(1);
      await refreshNetwork();
    } catch (err) {
      setNetError(err.response?.data?.detail || 'Failed to reset network');
    }
  }

  // ── Callbacks from panels ──────────────────────────────────
  function handleOptimizeComplete(result) {
    setOptimizeResult(result);
    unlockStage(3);
    refreshNetwork();
  }

  function handleFailureResult(result) {
    setFailureResult(result);
    unlockStage(4);
    refreshNetwork();
  }

  function handleRecoveryComplete(result) {
    setRecoveryResult(result);
    unlockStage(5);
    refreshNetwork();
  }

  // ── Continue / Next button logic ───────────────────────────
  const nodes = network?.nodes || [];
  const edges = network?.edges || [];
  const mstEdges = edges.filter((e) => e.status === 'mst');
  const failedEdges = edges.filter((e) => e.status === 'failed');

  const continueConfig = (() => {
    if (stage === 1) {
      const canGo = nodes.length >= 2 && edges.length >= 1;
      return {
        canContinue: canGo,
        label: 'Continue to Optimization',
        action: () => { unlockStage(2); setStage(2); },
      };
    }
    if (stage === 2) {
      const canGo = mstEdges.length > 0 || optimizeResult !== null;
      return {
        canContinue: canGo,
        label: 'Next: Test Failure',
        action: () => { unlockStage(3); setStage(3); },
      };
    }
    if (stage === 3) {
      const canGo = failedEdges.length > 0 || failureResult !== null;
      return {
        canContinue: canGo,
        label: 'Next: Recover Network',
        action: () => { unlockStage(4); setStage(4); },
      };
    }
    if (stage === 4) {
      const canGo = edges.some((e) => e.status === 'recovery') || recoveryResult !== null;
      return {
        canContinue: canGo,
        label: 'Next: Analyze Network',
        action: () => { unlockStage(5); setStage(5); },
      };
    }
    return { canContinue: false, label: '', action: null };
  })();

  // ── Error handler ──────────────────────────────────────────
  function handleError(msg) {
    setNetError(msg);
    setTimeout(() => setNetError(''), 5000);
  }

  // ── Render ─────────────────────────────────────────────────
  if (backendOk === false) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100vh', gap: 12 }}>
        <div style={{ fontSize: 32 }}>⚠</div>
        <h2>Cannot connect to backend</h2>
        <p style={{ color: '#6b7590', maxWidth: 400, textAlign: 'center' }}>
          Make sure the FastAPI server is running on{' '}
          <code>http://localhost:8001</code>
        </p>
        <code style={{ background: '#f0f2f7', padding: '8px 16px', borderRadius: 6 }}>
          cd backend &amp;&amp; python -m uvicorn main:app --reload --port 8001
        </code>
      </div>
    );
  }

  if (backendOk === null || !network) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', gap: 10, color: '#6b7590' }}>
        <span className="spinner" />
        Connecting to backend...
      </div>
    );
  }

  const leftPanel = () => {
    switch (stage) {
      case 1: return (
        <StageBuildPanel
          network={network}
          onNetworkUpdate={refreshNetwork}
          onError={handleError}
          techMode={techMode}
        />
      );
      case 2: return (
        <StageOptimizePanel
          network={network}
          optimizeResult={optimizeResult}
          onOptimizeComplete={handleOptimizeComplete}
          onError={handleError}
          techMode={techMode}
          onCurrentEdgeChange={setCurrentEdgeId}
        />
      );
      case 3: return (
        <StageTestPanel
          network={network}
          optimizeResult={optimizeResult}
          failureResult={failureResult}
          onFailureResult={handleFailureResult}
          onError={handleError}
        />
      );
      case 4: return (
        <StageRecoverPanel
          network={network}
          failureResult={failureResult}
          recoveryResult={recoveryResult}
          onRecoveryComplete={handleRecoveryComplete}
          onError={handleError}
          techMode={techMode}
        />
      );
      case 5: return (
        <StageAnalyzeSidebar
          network={network}
          optimizeResult={optimizeResult}
          failureResult={failureResult}
          recoveryResult={recoveryResult}
          onBack={handleBack}
        />
      );
      default: return null;
    }
  };

  return (
    <div className="app-shell">
      {/* ── Header ── */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <h1>Network Design &amp; Fault Recovery</h1>
          <span className="header-subtitle">DSA-based MST Optimization</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="btn-ghost"
            onClick={handleResetWorkflow}
            style={{ fontSize: 11, padding: '4px 10px', color: 'var(--color-danger)' }}
            title="Reset the network and clear current workflow"
          >
            ↺ Reset / New Network
          </button>
          <div className="mode-toggle">
            <button
              className={!techMode ? 'active' : ''}
              onClick={() => setTechMode(false)}
            >
              Guided
            </button>
            <button
              className={techMode ? 'active' : ''}
              onClick={() => setTechMode(true)}
            >
              Technical
            </button>
          </div>
        </div>
      </header>

      {/* ── Stage Navigator (Step Indicator) ── */}
      <nav className="stage-nav">
        {STAGES.map((s, i) => {
          const isDone   = s.id < stage && s.id <= maxStage;
          const isActive = s.id === stage;
          const isLocked = s.id > maxStage;
          return (
            <React.Fragment key={s.id}>
              {i > 0 && <span className="stage-arrow">→</span>}
              <div
                className={`stage-item ${isActive ? 'active' : ''} ${isDone ? 'done' : ''} ${isLocked ? 'locked' : ''}`}
                onClick={() => !isLocked && goStage(s.id)}
                title={isLocked ? 'Complete the previous step first' : `Go to ${s.label}`}
                style={{ cursor: isLocked ? 'not-allowed' : 'pointer' }}
              >
                <div className="stage-num">{s.id}</div>
                {s.label}
                {isDone && <span style={{ fontSize: 10, marginLeft: 2 }}>✓</span>}
              </div>
            </React.Fragment>
          );
        })}
      </nav>

      {/* ── Error banner ── */}
      {netError && (
        <div className="error-banner" style={{ margin: '0 16px', marginTop: 8 }}>
          {netError}
          <button
            onClick={() => setNetError('')}
            style={{ background: 'none', color: '#dc2626', float: 'right', padding: 0, fontSize: 14 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Main 3-column layout ── */}
      <div className="main-layout" style={{ flex: 1, overflow: 'hidden' }}>
        {/* LEFT */}
        <div className="panel-left">
          <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className="heading-icon">{stage}</div>
              {STAGES[stage - 1]?.label?.toUpperCase()}
            </div>
            {stage > 1 && (
              <button
                className="btn-ghost"
                onClick={handleBack}
                style={{ fontSize: 11, padding: '3px 8px' }}
                title="Go to previous step (preserves state)"
              >
                ← Back
              </button>
            )}
          </div>
          {leftPanel()}
        </div>

        {/* CENTER */}
        <div className="panel-center">
          <div className={stage === 5 ? 'graph-canvas-analyze' : 'graph-canvas'}>
            {stage === 5 ? (
              <StageAnalyzePanel
                network={network}
                optimizeResult={optimizeResult}
                failureResult={failureResult}
                recoveryResult={recoveryResult}
                techMode={techMode}
                onBack={handleBack}
                onReset={handleResetWorkflow}
              />
            ) : (
              <NetworkGraph
                network={network}
                currentEdgeId={currentEdgeId}
                selectedEdgeId={selectedEdge?.id}
                onNodeClick={(label) => {
                  setSelectedNode(label);
                  setSelectedEdge(null);
                }}
                onEdgeClick={(edge) => {
                  setSelectedEdge(edge);
                  setSelectedNode(null);
                }}
              />
            )}
          </div>

          {/* Bottom status + primary navigation actions */}
          <BottomBar
            stage={stage}
            network={network}
            optimizeResult={optimizeResult}
            failureResult={failureResult}
            recoveryResult={recoveryResult}
            onBack={handleBack}
            onNext={continueConfig.action}
            canGoBack={stage > 1}
            canGoNext={continueConfig.canContinue}
            nextLabel={continueConfig.label}
            onReset={handleResetWorkflow}
          />
        </div>

        {/* RIGHT */}
        <div className="panel-right">
          <div className="panel-heading">
            <div className="heading-icon" style={{ background: '#6b7590' }}>ℹ</div>
            Context
          </div>
          <RightPanel
            stage={stage}
            network={network}
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
          />
        </div>
      </div>
    </div>
  );
}
