/**
 * ui/controller.js — Input validation, event handlers, file loading
 *
 * File processing pipeline:
 *   1. Binary file  → readAsArrayBuffer → Uint8Array → each byte → 8 bits (MSB first)
 *   2. Base64 text  → strip whitespace → atob() → Uint8Array → same byte→bit expansion
 *   3. Plain 0/1 text → strip whitespace → validate → use directly
 *
 * Rules:
 *   - Binary files are NEVER interpreted as UTF-8/ASCII text
 *   - Base64 is always decoded to raw bytes FIRST, never analysed as Base64 chars
 *   - Only plain 0/1 strings bypass byte expansion
 */

'use strict';

/* ── Constants ───────────────────────────────────────────────────────────────── */

var BASE64_RE = /^[A-Za-z0-9+/\r\n]+=*$/;

// File extensions that are always treated as raw binary (never as text)
var BINARY_EXTS = ['bin','rng','dat','raw','bits','rand','ent','img','bin64',
                   'exe','dll','so','dylib','jpg','jpeg','png','gif','pdf',
                   'zip','gz','bz2','xz','7z'];

/* ── Param helpers ───────────────────────────────────────────────────────────── */

function readParams() {
  return {
    M:   parseInt(document.getElementById('blockSize').value, 10) || 128,
    m:   parseInt(document.getElementById('tmplSize').value,  10) || 9,
    lcM: parseInt(document.getElementById('lcBlock').value,   10) || 500
  };
}

/* ── Core bit-string validation ──────────────────────────────────────────────── */

function validateInput(raw) {
  if (!raw)                    return { error: 'Please enter a binary sequence.' };
  if (!/^[01]+$/.test(raw))   return { error: 'Input must contain only 0s and 1s.' };
  if (raw.length < 100)        return { error: 'Minimum 100 bits required.' };
  return { bits: raw.split('').map(Number) };
}

/* ── Run button ──────────────────────────────────────────────────────────────── */

async function runAll() {
  var raw    = document.getElementById('binInput').value.replace(/\s/g, '');
  var errEl  = document.getElementById('inputError');
  var infoEl = document.getElementById('inputInfo');
  
  var extractedFilename = infoEl.textContent.includes('"') 
      ? infoEl.textContent.split('"')[1] 
      : "Manual / Generated Input";
      
  errEl.textContent  = '';
  infoEl.textContent = '';

  var validation = validateInput(raw);
  if (validation.error) { errEl.textContent = validation.error; return; }

  var bits   = validation.bits;
  var params = readParams();

  infoEl.textContent = 'Analysing ' + bits.length + ' bits…';
  
  // Prepare global report data
  var hashHex = "N/A";
  try {
    // We compute the hash of the exact ASCII sequence of '0' and '1' characters
    // being analyzed, making it easy to verify with e.g. `echo -n "0101..." | sha256sum`
    var bytes = new TextEncoder().encode(raw);
    var hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    var hashArray = Array.from(new Uint8Array(hashBuffer));
    hashHex = hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
  } catch(e) {
    console.error("SHA-256 failed", e);
  }

  window.reportData = {
    metadata: {
      filename: extractedFilename,
      length: raw.length,
      originalSha256: window.currentOriginalFileHash || "N/A (Manual/Generated)",
      sequenceSha256: hashHex,
      snippet: raw.length > 64 
                ? raw.substring(0, 32) + " ... " + raw.substring(raw.length - 32)
                : raw,
      date: new Date().toISOString()
    },
    tests: [],
    passCount: 0,
    failCount: 0,
    naCount: 0
  };

  runAllTests(bits, params);
}

/* ── Random generator ────────────────────────────────────────────────────────── */

function generateRandom(len) {
  window.currentOriginalFileHash = null; // Clear file hash since this is generated
  var byteLen = Math.ceil(len / 8);
  var buf = new Uint8Array(byteLen);
  
  // crypto.getRandomValues has a max limit of 65536 bytes per call
  var MAX_BYTES = 65536;
  for (var offset = 0; offset < byteLen; offset += MAX_BYTES) {
    var chunk = new Uint8Array(Math.min(MAX_BYTES, byteLen - offset));
    window.crypto.getRandomValues(chunk);
    buf.set(chunk, offset);
  }
  
  var bits = [];
  for (var i = 0; i < buf.length && bits.length < len; i++) {
    for (var j = 7; j >= 0 && bits.length < len; j--) {
      bits.push((buf[i] >> j) & 1);
    }
  }
  document.getElementById('binInput').value = bits.join('');
  document.getElementById('inputError').textContent  = '';
  document.getElementById('inputInfo').textContent   = '';
  
  var textBtn = document.querySelectorAll('.input-tab')[1];
  if (typeof switchInputTab === 'function') switchInputTab('text', textBtn);
  if (typeof checkInputState === 'function') checkInputState();
}

/* ── Byte array → bit string ─────────────────────────────────────────────────── */

/**
 * Convert a Uint8Array to a string of '0'/'1' characters.
 * Each byte contributes 8 bits, MSB first (standard convention).
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function bytesToBitString(bytes) {
  var parts = new Array(bytes.length);
  for (var i = 0; i < bytes.length; i++) {
    var b = bytes[i];
    parts[i] = ((b >> 7) & 1) + '' +
               ((b >> 6) & 1) +
               ((b >> 5) & 1) +
               ((b >> 4) & 1) +
               ((b >> 3) & 1) +
               ((b >> 2) & 1) +
               ((b >> 1) & 1) +
               ( b       & 1);
  }
  return parts.join('');
}

/* ── Base64 detection & decoding ─────────────────────────────────────────────── */

/**
 * Try to interpret `text` as Base64.
 * Returns Uint8Array on success, null if the content is not valid Base64.
 * @param {string} text  Raw file text content.
 * @returns {Uint8Array|null}
 */
function tryDecodeBase64(text) {
  // Strip all whitespace (Base64 files often have line breaks)
  var stripped = text.replace(/\s/g, '');
  if (stripped.length === 0) return null;

  // Must match Base64 character set (including = padding)
  if (!BASE64_RE.test(stripped)) return null;

  // Length must be a multiple of 4 (possibly with padding)
  // atob handles padding, but we check the charset first
  try {
    var binary = atob(stripped);
    var bytes  = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    return null;
  }
}

/* ── File extension helper ───────────────────────────────────────────────────── */

function getExt(filename) {
  var parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

function isBinaryExt(filename) {
  return BINARY_EXTS.indexOf(getExt(filename)) !== -1;
}

/* ── Main file processor ─────────────────────────────────────────────────────── */

/**
 * Process a File object: detect format, decode to bit-string, load into UI.
 * @param {File} file
 */
async function _readFile(file) {
  if (!file) return;

  // Compute original file hash immediately
  window.currentOriginalFileHash = "N/A";
  try {
    var arrayBuffer = await file.arrayBuffer();
    var hashBuf = await crypto.subtle.digest('SHA-256', arrayBuffer);
    var hashArr = Array.from(new Uint8Array(hashBuf));
    window.currentOriginalFileHash = hashArr.map(function(b){ return b.toString(16).padStart(2, '0'); }).join('');
  } catch (e) {
    console.error("Could not hash original file", e);
  }

  var errEl  = document.getElementById('inputError');
  var infoEl = document.getElementById('inputInfo');
  errEl.textContent  = '';
  infoEl.textContent = '';

  var forcebin = isBinaryExt(file.name);

  if (forcebin) {
    // ── Path A: known binary extension → ArrayBuffer only, no text interpretation ──
    _readAsBinary(file);
  } else {
    // ── Path B: read as text first, then decide ───────────────────────────────────
    var textReader = new FileReader();
    textReader.onload = function(e) {
      var text = e.target.result;

      // Check 1: plain 0/1 sequence?
      var stripped = text.replace(/\s/g, '');
      if (/^[01]+$/.test(stripped)) {
        // Plain binary text — use directly
        _loadBitString(stripped, file.name, 'plain text');
        return;
      }

      // Check 2: Base64?
      var b64bytes = tryDecodeBase64(text);
      if (b64bytes !== null) {
        var bitStr = bytesToBitString(b64bytes);
        _loadBitString(bitStr, file.name, 'Base64 decoded (' + b64bytes.length + ' bytes → ' + bitStr.length + ' bits)');
        return;
      }

      // Check 3: fall back to raw binary read (file may be binary without known extension)
      _readAsBinary(file);
    };
    textReader.onerror = function() { _readAsBinary(file); };
    textReader.readAsText(file);
  }
}

/**
 * Read file as ArrayBuffer and expand bytes to bits.
 * @param {File} file
 */
function _readAsBinary(file) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var bytes  = new Uint8Array(e.target.result);
    var bitStr = bytesToBitString(bytes);
    _loadBitString(bitStr, file.name, 'binary (' + bytes.length + ' bytes → ' + bitStr.length + ' bits)');
  };
  reader.onerror = function() {
    document.getElementById('inputError').textContent = 'Could not read file "' + file.name + '".';
    _dropReset();
  };
  reader.readAsArrayBuffer(file);
}

/**
 * Put a validated bit-string into the textarea and update UI.
 * @param {string} bitStr
 * @param {string} filename
 * @param {string} modeLabel  Human-readable description of how the file was decoded.
 */
function _loadBitString(bitStr, filename, modeLabel) {
  var errEl  = document.getElementById('inputError');
  var infoEl = document.getElementById('inputInfo');

  if (bitStr.length < 100) {
    errEl.textContent = '"' + filename + '" decoded to only ' + bitStr.length + ' bits. Minimum is 100.';
    _dropReset();
    if (typeof checkInputState === 'function') checkInputState();
    return;
  }

  document.getElementById('binInput').value = bitStr;
  infoEl.textContent = '\u2713 "' + filename + '" loaded as ' + modeLabel + ' — ' + bitStr.length + ' bits.';
  _dropOk();
  
  var textBtn = document.querySelectorAll('.input-tab')[1];
  if (typeof switchInputTab === 'function') switchInputTab('text', textBtn);
  if (typeof checkInputState === 'function') checkInputState();
}

/* ── Drop zone state helpers ─────────────────────────────────────────────────── */

function _dropReset() {
  var z = document.getElementById('dropZone');
  if (z) z.classList.remove('drag-over', 'drop-ok');
}

function _dropOk() {
  var z = document.getElementById('dropZone');
  if (!z) return;
  z.classList.remove('drag-over');
  z.classList.add('drop-ok');
  setTimeout(function() { z.classList.remove('drop-ok'); }, 2200);
}

/* ── DOM event wiring ────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', function() {
  var zone   = document.getElementById('dropZone');
  var picker = document.getElementById('fileInput');
  if (!zone || !picker) return;

  /* File picker */
  picker.addEventListener('change', function() {
    if (picker.files && picker.files[0]) _readFile(picker.files[0]);
    picker.value = ''; // allow re-selecting the same file
  });

  /* Zone click → open picker (guard against inner-element double-trigger) */
  zone.addEventListener('click', function(e) {
    if (e.target === picker) return;
    picker.click();
  });

  /* Drag-and-drop */
  zone.addEventListener('dragenter', function(e) { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragover',  function(e) { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', function(e) {
    if (!zone.contains(e.relatedTarget)) zone.classList.remove('drag-over');
  });
  zone.addEventListener('drop', function(e) {
    e.preventDefault();
    zone.classList.remove('drag-over');
    var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) _readFile(file);
  });

  /* Global guard — stop browser from opening dropped files in a new tab */
  document.addEventListener('dragover', function(e) { e.preventDefault(); });
  document.addEventListener('drop',     function(e) { e.preventDefault(); });
  
  // Initial check
  if (typeof checkInputState === 'function') checkInputState();
});

/* ── UI Interaction helpers ──────────────────────────────────────────────────── */

function switchInputTab(tabId, btn) {
  var tabs = document.querySelectorAll('.input-tab');
  for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
  if (btn) btn.classList.add('active');
  
  var contents = document.querySelectorAll('.input-tab-content');
  for (var i = 0; i < contents.length; i++) contents[i].classList.remove('active');
  var target = document.getElementById('tab-' + tabId);
  if (target) target.classList.add('active');
}

function checkInputState() {
  var inputEl = document.getElementById('binInput');
  if (!inputEl) return;
  var raw = inputEl.value.replace(/\s/g, '');
  var runBtn = document.getElementById('runBtn');
  if (runBtn) {
    if (raw.length >= 100) {
      runBtn.removeAttribute('disabled');
    } else {
      runBtn.setAttribute('disabled', 'true');
    }
  }
}