/**
 * runner.js — Test orchestration
 * Updated to call applyResults() for the carousel UI.
 */

'use strict';

var TESTS = [
  { run: testFrequency,                render: null },
  { run: testBlockFrequency,           render: null, extraArgs: function(p){ return [p.M]; } },
  { run: testRuns,                     render: null },
  { run: testLongestRun,               render: null },
  { run: testMatrixRank,               render: null },
  { run: testDiscreteFourierTransform, render: null },
  { run: testNonOverlapping,           render: null, extraArgs: function(p){ return [p.m]; } },
  { run: testOverlapping,              render: null, extraArgs: function(p){ return [p.m]; } },
  { run: testMaurer,                   render: null },
  { run: testLinearComplexity,         render: null, extraArgs: function(p){ return [p.lcM]; } },
  { run: testSerial,                   render: null },
  { run: testApproxEntropy,            render: null },
  { run: testCusum,                    render: null },
  { run: testRandomExcursions,         render: null },
  { run: testRandomExcursionsVariant,  render: null }
];

function runAllTests(bits, params) {
  var layout = document.getElementById('carouselLayout');
  var viewport = document.getElementById('panelViewport');
  var sidebar = document.getElementById('testSidebar');
  var summary = document.getElementById('summary');
  
  if (layout) layout.classList.add('visible');
  if (sidebar) sidebar.innerHTML = '';
  if (summary) summary.innerHTML = '<span class="sum-pill sum-na">Processing...</span>';
  if (summary) summary.classList.add('visible');
  if (viewport) {
    viewport.innerHTML = '<div style="display:flex; flex-direction:column; width:100%; height:100%; align-items:center; justify-content:center; padding: 0 40px;">' +
        '<div style="font-size:1.1rem; color:var(--text); margin-bottom:20px; font-weight:500;">Analysing ' + bits.length + ' bits...</div>' +
        '<div style="width: 100%; max-width: 400px; height: 8px; background: var(--bg4); border-radius: 8px; overflow: hidden; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);">' +
          '<div id="testProgress" style="width: 0%; height: 100%; background: linear-gradient(90deg, var(--accent), #bf5af2); transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);"></div>' +
        '</div>' +
        '<div id="testName" style="margin-top:16px; font-size:0.8rem; color:var(--text3); font-family:var(--font-mono); text-transform:uppercase; letter-spacing:0.05em; animation: pulse-text 1.5s infinite alternate ease-in-out;">Initializing...</div>' +
      '</div>';
  }

  var worker = new Worker('js/worker.js');
  worker.onmessage = function(e) {
    var data = e.data;
    
    if (data.type === 'progress') {
      var pct = Math.round((data.testIndex / data.total) * 100);
      var progressEl = document.getElementById('testProgress');
      var nameEl = document.getElementById('testName');
      if (progressEl) progressEl.style.width = pct + '%';
      if (nameEl) nameEl.textContent = 'Running Test ' + (data.testIndex + 1) + ' of ' + data.total + '...';
      return;
    }
    
    if (data.type === 'done') {
      _lastParams = data.params;
      
      if (typeof buildCarousel === 'function') {
        buildCarousel();
      }
      
      applyResults(data.results, data.params);
      renderSummary(data.bitsLength, data.results);
      
      var infoEl = document.getElementById('inputInfo');
      if (infoEl) infoEl.textContent = data.bitsLength + ' bits analysed.';
      
      worker.terminate();
    }
  };
  
  worker.onerror = function(err) {
    console.error('Worker error:', err);
    var errEl = document.getElementById('inputError');
    if (errEl) errEl.textContent = 'An error occurred during analysis in Web Worker.';
    if (viewport) {
      viewport.innerHTML = '<div style="display:flex; height:100%; align-items:center; justify-content:center; color:var(--fail);">Processing error.</div>';
    }
    worker.terminate();
  };
  
  worker.postMessage({ bits: bits, params: params });
}

function renderSummary(totalBits, results) {
  var withPv = results.filter(function(r){ return r && r.pValue !== null && r.pValue !== undefined; });
  var passed = withPv.filter(function(r){ return r.pValue >= 0.01; }).length;
  var failed = withPv.filter(function(r){ return r.pValue <  0.01; }).length;
  var na     = results.filter(function(r){ return !r || r.pValue === null || r.pValue === undefined; }).length;

  if (window.reportData) {
    window.reportData.passCount = passed;
    window.reportData.failCount = failed;
    window.reportData.naCount = na;
  }

  var el = document.getElementById('summary');
  el.innerHTML =
    '<span class="sum-pill sum-pass"><span class="dot"></span>PASS: ' + passed + '</span>' +
    '<span class="sum-pill sum-fail"><span class="dot"></span>FAIL: ' + failed + '</span>' +
    '<span class="sum-pill sum-na"><span class="dot"></span>N/A: ' + na + '</span>' +
    '<span class="sum-bits">' + totalBits + ' bits</span>' +
    '<button id="exportPdfBtn" class="btn-primary" style="margin-left:auto; padding:6px 12px; font-size:0.85rem; display:flex; align-items:center; gap:6px;" onclick="exportToPdf()">' +
      '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width:14px;height:14px;stroke-width:2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>' +
      '<span>Export PDF</span>' +
    '</button>';
  el.classList.add('visible');

  var layout = document.getElementById('carouselLayout');
  if (layout) layout.classList.add('visible');
}