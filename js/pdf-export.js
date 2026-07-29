/**
 * pdf-export.js
 * Headless chart generation and PDF document creation for NIST SP 800-22.
 */

'use strict';

/**
 * Stage 3: Generate headless charts for all tests with a "Print Theme".
 * Saves the Base64 image strings back into window.reportData.tests[i].chartBase64.
 */
function generateHeadlessCharts() {
  if (!window.reportData || !window.reportData.tests) return;

  var container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.top = '-9999px';
  container.style.width = '600px';
  container.style.height = '300px';
  document.body.appendChild(container);

  var tickC = '#333333';
  var gridC = '#eeeeee';
  var strokeC = '#000000';

  var chartDefs = {
    scales: {
      x: { ticks: { color: tickC, font: { size: 10 } }, grid: { color: gridC } },
      y: { ticks: { color: tickC, font: { size: 10 } }, grid: { color: gridC } }
    },
    plugins: { legend: { display: false } },
    animation: false,
    responsive: false,
    maintainAspectRatio: false
  };

  window.reportData.tests.forEach(function(testObj) {
    var id = testObj.id;
    var r = testObj.rawResult;
    
    if (!r || r.pValue === null || r.pValue === undefined) return;
    
    // Tests 9 and 12 do not have standard Chart.js charts (they use custom HTML gauges)
    if (id === 9 || id === 12) return;

    var canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 300;
    container.appendChild(canvas);

    var cfg = null;

    switch(id) {
      case 1:
        cfg = { type: 'bar', data: { labels: ['Zeros','Ones'], datasets: [{ data: [r.zeros,r.ones], backgroundColor: 'transparent', borderColor: strokeC, borderWidth: 1 }] }, options: chartDefs };
        break;
      case 2:
        cfg = { type: 'line', data: { labels: r.props.map(function(_,i){ return 'B'+(i+1); }), datasets: [
          { label:'π per block', data: r.props, borderColor: strokeC, backgroundColor:'transparent', pointRadius: r.props.length>200?0:2, borderWidth:1.5, fill:false, tension:0.2 },
          { label:'Ideal 0.5',  data: new Array(r.N).fill(0.5), borderColor:'#999999', borderDash:[5,5], borderWidth:1, pointRadius:0 }
        ] }, options: chartDefs };
        break;
      case 3:
        if (r.runLengths && r.runLengths.length > 0) {
          var mx = 0; for(var ii=0;ii<r.runLengths.length;ii++) if(r.runLengths[ii]>mx) mx=r.runLengths[ii]; mx=Math.min(mx,20);
          var h=[]; for(var ii=0;ii<mx;ii++) h.push(0);
          for(var ii=0;ii<r.runLengths.length;ii++){ var l=r.runLengths[ii]; if(l>=1&&l<=mx) h[l-1]++; }
          cfg = { type:'bar', data:{ labels: Array.from({length:mx},function(_,i){return String(i+1);}), datasets:[{ data:h, backgroundColor:'transparent', borderColor: strokeC, borderWidth: 1 }] }, options: chartDefs };
        }
        break;
      case 4:
        cfg = { type:'bar', data:{ labels: r.v.map(function(_,i){return String(i+r.vObs_min);}), datasets:[{ data:r.v, backgroundColor:'transparent', borderColor: strokeC, borderWidth: 1 }] }, options: chartDefs };
        break;
      case 5:
        cfg = { type:'bar', data:{ labels:['Rank 32','Rank 31','Rank ≤30'], datasets:[{ data:[r.FM,r.FM1,r.rest], backgroundColor:'transparent', borderColor: strokeC, borderWidth: 1 }] }, options: chartDefs };
        break;
      case 6:
        // No default chart for DFT in carousel yet, skip or add if implemented
        break;
      case 7:
        cfg = { type:'bar', data:{ labels: r.Wj.map(function(_,i){return 'B'+(i+1);}), datasets:[{ data:r.Wj, backgroundColor:'transparent', borderColor: strokeC, borderWidth: 1 }] }, options: chartDefs };
        break;
      case 8:
        cfg = { type:'bar', data:{ labels: r.v.map(function(_,i){return String(i);}), datasets:[{ data:r.v, backgroundColor:'transparent', borderColor: strokeC, borderWidth: 1 }] }, options: chartDefs };
        break;
      case 10:
        cfg = { type:'bar', data:{ labels:['≤-2.5','(-2.5,-1.5]','(-1.5,-0.5]','(-0.5,0.5]','(0.5,1.5]','(1.5,2.5]','>2.5'], datasets:[{ data:r.v, backgroundColor:'transparent', borderColor: strokeC, borderWidth: 1 }] }, options: chartDefs };
        break;
      case 11:
        cfg = {
          type: 'bar',
          data: { labels: ['p-value 1', 'p-value 2'], datasets: [{ data: [r.pv1, r.pv2], backgroundColor: 'transparent', borderColor: strokeC, borderWidth: 1 }] },
          options: { indexAxis: 'y', scales: { x: { min:0, max:1, ticks:{ color:tickC, font:{size:10} }, grid:{ color:gridC } }, y: { ticks:{ color:tickC, font:{size:10} }, grid:{ color:'transparent' } } }, plugins: { legend:{ display:false } }, animation: false, responsive: false, maintainAspectRatio: false }
        };
        break;
      case 13:
        if (r.fwd) {
          var step = Math.max(1, Math.floor(r.fwd.length/1000)); // Downsample to max 1000 points
          var lbl=[],dat=[];
          for(var ii=0;ii<r.fwd.length;ii+=step){lbl.push(ii);dat.push(r.fwd[ii]);}
          cfg = { type:'line', data:{ labels:lbl, datasets:[
            { label:'Cumulative sum', data:dat, borderColor: strokeC, pointRadius:0, borderWidth:1, fill:false },
            { label:'Zero', data:new Array(lbl.length).fill(0), borderColor:'#999999', borderDash:[4,4], borderWidth:1, pointRadius:0 }
          ] }, options: chartDefs };
        }
        break;
      case 14:
        cfg = { type:'bar', data:{ labels: r.states.map(function(s){return (s>0?'+':'')+s;}), datasets:[{ data: r.states.map(function(s){return r.results[s].pValue;}), backgroundColor: 'transparent', borderColor: strokeC, borderWidth: 1 }] }, options: chartDefs };
        break;
      case 15:
        cfg = { type:'bar', data:{ labels: r.states.map(function(s){return (s>0?'+':'')+s;}), datasets:[{ data: r.states.map(function(s){return r.results[s].cnt;}), backgroundColor: 'transparent', borderColor: strokeC, borderWidth: 1 }] }, options: chartDefs };
        break;
    }

    if (cfg) {
      // Force chart rendering synchronously with animation: false
      var chart = new Chart(canvas, cfg);
      // Ensure it renders completely before extracting Base64
      testObj.chartBase64 = chart.toBase64Image();
      chart.destroy();
    }

    // Clear container to avoid DOM bloat
    container.innerHTML = '';
  });

  document.body.removeChild(container);
}

/**
 * Helper to extract key statistics for the PDF report without HTML.
 */
function _getTestParamsForPdf(id, r, params) {
  if (!r) return [];
  var p = [];
  
  function fmt(val, dec) {
    if (val === undefined || val === null) return 'N/A';
    if (typeof val === 'number') return val.toFixed(dec !== undefined ? dec : 6);
    return val;
  }

  switch(id) {
    case 1: p.push(['S_obs', fmt(r.sObs)], ['Ones', r.ones || 'N/A'], ['Zeros', r.zeros || 'N/A'], ['n', r.n || 'N/A']); break;
    case 2: p.push(['chi²', fmt(r.chi2)], ['Blocks N', r.N || 'N/A'], ['Block M', r.M || 'N/A']); break;
    case 3: p.push(['Total runs Vn', r.Vn || 'N/A'], ['pi (1s ratio)', fmt(r.pi)], ['n', r.n || 'N/A']); break;
    case 4: p.push(['chi²', fmt(r.chi2)], ['Blocks N', r.N || 'N/A'], ['Block M', r.M || 'N/A']); break;
    case 5: p.push(['chi²', fmt(r.chi2)], ['Matrices N', r.N || 'N/A']); break;
    case 6: p.push(['N0', r.stats ? r.stats.N0 : 'N/A'], ['N1', r.stats ? r.stats.N1 : 'N/A']); break;
    case 7: p.push(['chi²', fmt(r.chi2)], ['Blocks N', r.N || 'N/A'], ['Template m', r.m || 'N/A']); break;
    case 8: p.push(['chi²', fmt(r.chi2)], ['Blocks N', r.N || 'N/A']); break;
    case 9: p.push(['f_n', fmt(r.fn)], ['E[f_n]', fmt(r.EL)], ['L', r.L || 'N/A']); break;
    case 10: p.push(['chi²', fmt(r.chi2)], ['Blocks N', r.N || 'N/A'], ['Block M', r.M || 'N/A']); break;
    case 11: p.push(['ΔΨ²', fmt(r.dPsi2)], ['Δ²Ψ²', fmt(r.d2Psi2)], ['m', r.m || 'N/A']); break;
    case 12: p.push(['ApEn', fmt(r.ApEn)], ['chi²', fmt(r.chi2)], ['m', r.m || 'N/A']); break;
    case 13: p.push(['max|S| fwd', r.maxF || 'N/A'], ['max|S| bwd', r.maxB || 'N/A']); break;
    case 14: p.push(['J (cycles)', r.J || 'N/A']); break;
    case 15: p.push(['J (crossings)', r.J || 'N/A']); break;
  }
  return p;
}

/**
 * Stage 4: Generate the PDF document layout using pdfMake.
 */
function generatePdfReport() {
  if (!window.reportData) return;

  var meta = window.reportData.metadata;
  var tests = window.reportData.tests;
  var passRate = (window.reportData.passCount / 15 * 100).toFixed(0) + '%';
  var overallVerdict = window.reportData.passCount === 15 ? 'PASS (Perfect)' : (window.reportData.passCount >= 14 ? 'PASS (Acceptable)' : 'FAIL');

  var docDef = {
    info: {
      title: 'NIST SP 800-22 Report - ' + meta.filename,
      author: 'NIST Test Suite Simulator',
      subject: 'Randomness Analysis Report'
    },
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    content: [
      { text: 'NIST SP 800-22 Randomness Analysis Report', style: 'header', alignment: 'center' },
      { text: 'Generated on: ' + new Date(meta.date).toLocaleString(), alignment: 'center', margin: [0, 0, 0, 20] },
      
      // ── Data Fingerprint ──
      { text: 'Data Fingerprint', style: 'subheader' },
      {
        style: 'tableExample',
        table: {
          widths: [120, '*'],
          body: [
            [{ text: 'Source File', bold: true }, meta.filename],
            [{ text: 'Length', bold: true }, meta.length + ' bits'],
            [{ text: 'SHA-256 Hash', bold: true }, { text: meta.sha256, fontSize: 9 }],
            [{ text: 'Snippet (64b)', bold: true }, { text: meta.snippet, fontSize: 9 }]
          ]
        }
      },

      // ── Executive Summary ──
      { text: 'Executive Summary', style: 'subheader', margin: [0, 15, 0, 5] },
      { text: 'Overall Verdict: ' + overallVerdict, fontSize: 16, bold: true, margin: [0, 0, 0, 5] },
      { text: 'Tests Passed: ' + window.reportData.passCount + ' / 15 (' + passRate + ')', margin: [0, 0, 0, 15] },

      // ── 15 Tests Summary Table ──
      {
        style: 'tableExample',
        table: {
          headerRows: 1,
          widths: ['auto', '*', 'auto', 'auto'],
          body: [
            [{ text: '#', style: 'tableHeader' }, { text: 'Test Name', style: 'tableHeader' }, { text: 'p-value', style: 'tableHeader' }, { text: 'Status', style: 'tableHeader' }]
          ]
        }
      }
    ],
    styles: {
      header: { fontSize: 22, bold: true, margin: [0, 0, 0, 10] },
      subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
      tableExample: { margin: [0, 5, 0, 15] },
      tableHeader: { bold: true, fontSize: 11, color: 'black', fillColor: '#eeeeee' },
      passText: { color: 'black' },
      failText: { color: 'black', bold: true } // Bold indicates fail in b&w
    },
    defaultStyle: {
      fontSize: 10
    }
  };

  // Populate summary table
  tests.forEach(function(t) {
    var pvStr = t.pValue !== null ? t.pValue.toFixed(6) : 'N/A';
    if (t.id === 11 || t.id === 14 || t.id === 15) {
       pvStr = 'Multiple (see details)';
    }
    var statusStyle = t.status === 'PASS' ? 'passText' : 'failText';
    docDef.content[docDef.content.length - 1].table.body.push([
      t.id.toString(),
      t.name,
      { text: pvStr },
      { text: t.status, style: statusStyle }
    ]);
  });

  // ── Detailed Results ──
  docDef.content.push({ text: 'Detailed Test Results', style: 'header', pageBreak: 'before' });

  tests.forEach(function(t) {
    var block = [
      { text: t.id + '. ' + t.name, style: 'subheader', margin: [0, 15, 0, 5], unbreakable: true }
    ];

    var paramsTable = {
      table: {
        widths: ['*', '*'],
        body: []
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 10]
    };

    var params = _getTestParamsForPdf(t.id, t.rawResult, window.reportData.params);
    
    // Group params into two columns
    for (var i = 0; i < params.length; i += 2) {
      var row = [];
      row.push({ text: params[i][0] + ': ' + params[i][1], fontSize: 9 });
      if (i + 1 < params.length) {
        row.push({ text: params[i+1][0] + ': ' + params[i+1][1], fontSize: 9 });
      } else {
        row.push({ text: '' });
      }
      paramsTable.table.body.push(row);
    }
    
    if (paramsTable.table.body.length > 0) {
      block.push(paramsTable);
    }

    if (t.chartBase64) {
      block.push({
        image: t.chartBase64,
        width: 300,
        alignment: 'center',
        margin: [0, 5, 0, 15]
      });
    }

    docDef.content.push({
      unbreakable: true,
      stack: block
    });
  });

  pdfMake.createPdf(docDef).download('NIST_Report_' + meta.filename + '.pdf');
}

/**
 * Stage 5: UI handler for the Export PDF button.
 */
function exportToPdf() {
  var btn = document.getElementById('exportPdfBtn');
  if (!btn) return;
  
  var originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<svg class="icon spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width:14px;height:14px;animation:spin 1s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="4.93" x2="19.07" y2="7.76"></line></svg><span> Generating...</span>';
  
  // Use setTimeout to allow the browser to paint the spinner
  setTimeout(function() {
    try {
      generateHeadlessCharts();
      generatePdfReport();
    } catch(e) {
      console.error('PDF Generation Failed:', e);
      alert('Failed to generate PDF. Check console for details.');
    } finally {
      btn.innerHTML = originalHtml;
      btn.disabled = false;
    }
  }, 50);
}
