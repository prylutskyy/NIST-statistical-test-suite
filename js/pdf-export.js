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
