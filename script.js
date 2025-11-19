// Browser Fingerprint Detector - script.js
// No external libraries. Uses Web Crypto API for hashing.

(async function () {
  // DOM references
  const summaryText = document.getElementById('summaryText');
  const fingerprintHashEl = document.getElementById('fingerprintHash');
  const hardwareList = document.getElementById('hardwareList');
  const screenList = document.getElementById('screenList');
  const featureList = document.getElementById('featureList');
  const uaBlock = document.getElementById('uaBlock');
  const canvasEl = document.getElementById('canvas');
  const canvasHashEl = document.getElementById('canvasHash');
  const webglInfoEl = document.getElementById('webglInfo');
  const audioHashEl = document.getElementById('audioHash');
  const fontListEl = document.getElementById('fontList');
  const copyBtn = document.getElementById('copyBtn');
  const exportBtn = document.getElementById('exportBtn');

  // Utilities
  async function sha256hex(str) {
    const enc = new TextEncoder();
    const data = enc.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function safeString(v){ try { return String(v); } catch(e){ return '—'; } }

  // Collect basic UA/time info
  function collectUA() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      product: navigator.product,
      vendor: navigator.vendor || '—',
      language: navigator.language,
      languages: navigator.languages,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '—',
      cookieEnabled: navigator.cookieEnabled,
    };
  }

  // Hardware info
  function collectHardware() {
    return {
      cores: navigator.hardwareConcurrency || '—',
      deviceMemory: navigator.deviceMemory || '—',
      touchPoints: navigator.maxTouchPoints || 0,
      online: navigator.onLine,
      doNotTrack: navigator.doNotTrack || navigator.msDoNotTrack || '—'
    };
  }

  // Screen info
  function collectScreen() {
    return {
      width: screen.width,
      height: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      colorDepth: screen.colorDepth,
      pixelRatio: window.devicePixelRatio || 1,
    };
  }

  // Feature detection
  function collectFeatures() {
    return {
      webGL: !!getWebGLContext(),
      webGL2: !!getWebGL2Context(),
      canvas: !!window.HTMLCanvasElement,
      audioContext: !!(window.OfflineAudioContext || window.webkitOfflineAudioContext),
      crypto: !!window.crypto,
      serviceWorker: 'serviceWorker' in navigator,
      localStorage: testStorage('localStorage'),
      sessionStorage: testStorage('sessionStorage'),
      indexedDB: !!window.indexedDB
    };
  }

  function testStorage(key) {
    try {
      const k = '__fp_test__';
      window[key].setItem(k, k);
      window[key].removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Canvas fingerprint
  function fingerprintCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    // Draw background
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw text with various fonts and styles
    ctx.textBaseline = 'top';
    ctx.font = '16px "Arial Black", Gadget, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Fingerprint ✨ — ' + navigator.userAgent, 8, 8);

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.moveTo(10, 60);
    ctx.bezierCurveTo(100, 10, 200, 120, 290, 60);
    ctx.stroke();

    // small shapes
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.fillRect(20, 80, 30, 20);
    ctx.arc(200, 30, 12, 0, Math.PI * 2);
    ctx.fill();

    try {
      return canvas.toDataURL();
    } catch (e) {
      return 'unable-to-export';
    }
  }

  // WebGL info
  function getWebGLContext() {
    try {
      const c = document.createElement('canvas');
      return c.getContext('webgl') || c.getContext('experimental-webgl');
    } catch (e) { return null; }
  }
  function getWebGL2Context() {
    try {
      const c = document.createElement('canvas');
      return c.getContext('webgl2');
    } catch (e) { return null; }
  }
  function collectWebGLInfo() {
    const gl = getWebGLContext();
    const gl2 = getWebGL2Context();
    const info = { webgl: !!gl, webgl2: !!gl2 };
    try {
      const context = gl || gl2;
      if (context) {
        const dbg = context.getExtension('WEBGL_debug_renderer_info');
        if (dbg) {
          info.vendor = context.getParameter(dbg.UNMASKED_VENDOR_WEBGL);
          info.renderer = context.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
        } else {
          info.vendor = context.getParameter(context.VENDOR);
          info.renderer = context.getParameter(context.RENDERER);
        }
        info.version = context.getParameter(context.VERSION);
      }
    } catch (e) {
      // ignore
    }
    return info;
  }

  // Audio fingerprint
  async function fingerprintAudio() {
    try {
      const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!OfflineContext) return 'no-offline-audio';
      const ctx = new OfflineContext(1, 44100, 44100);
      const oscillator = ctx.createOscillator();
      oscillator.type = 'triangle';
      oscillator.frequency.value = 10000;
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -50;
      compressor.knee.value = 40;
      compressor.ratio.value = 12;
      compressor.attack.value = 0;
      compressor.release.value = 0.25;

      oscillator.connect(compressor);
      compressor.connect(ctx.destination);
      oscillator.start(0);
      const buffer = await ctx.startRendering();
      const channelData = buffer.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < channelData.length; i += 1000) {
        sum += Math.abs(channelData[i]);
      }
      return String(sum);
    } catch (e) {
      return 'audio-failed';
    }
  }

  // Fonts detection (basic)
  function detectFonts(sampleFonts = [
    "Arial","Courier New","Times New Roman","Georgia","Trebuchet MS","Verdana",
    "Roboto","Open Sans","Lato","Montserrat","Noto Sans","Segoe UI","Helvetica"
  ]) {
    const base = "monospace";
    const testString = "mmmmmmmmmmlli";
    const testSize = '72px';
    const detected = [];
    const body = document.body;
    const span = document.createElement('span');
    span.style.position = 'absolute';
    span.style.left = '-9999px';
    span.style.fontSize = testSize;
    span.style.lineHeight = 'normal';
    span.textContent = testString;
    body.appendChild(span);

    const defaultWidth = (w => { span.style.fontFamily = base; return span.offsetWidth; })();

    for (let f of sampleFonts) {
      span.style.fontFamily = `${f},${base}`;
      const w = span.offsetWidth;
      if (w !== defaultWidth) detected.push(f);
    }

    body.removeChild(span);
    return detected;
  }

  // Assemble fingerprint string
  async function collectFingerprint() {
    summaryText.textContent = 'Gathering data...';

    const ua = collectUA();
    const hw = collectHardware();
    const sc = collectScreen();
    const features = collectFeatures();

    const canvasData = fingerprintCanvas(canvasEl);
    canvasHashEl.textContent = await sha256hex(canvasData).then(h => h);

    const webgl = collectWebGLInfo();
    webglInfoEl.textContent = JSON.stringify(webgl, null, 2);

    const audio = await fingerprintAudio();
    audioHashEl.textContent = String(audio).slice(0, 36);

    const fonts = detectFonts();
    fontListEl.innerHTML = fonts.slice(0, 12).map(f => `<li>${f}</li>`).join('') || '<li>None detected (common)</li>';

    // create canonical JSON
    const fingerprintObj = {
      ua,
      hw,
      sc,
      features,
      webgl,
      canvasHash: await sha256hex(canvasData),
      audio: audio,
      fonts,
      timestamp: new Date().toISOString()
    };

    const canonical = JSON.stringify(fingerprintObj, Object.keys(fingerprintObj).sort(), 2);
    const finalHash = await sha256hex(canonical);

    // Render UI pieces
    fingerprintHashEl.textContent = finalHash;
    summaryText.textContent = `Fingerprint assembled — ${Object.keys(fingerprintObj).length} sections`;
    uaBlock.textContent = JSON.stringify(ua, null, 2);

    hardwareList.innerHTML = Object.entries(hw).map(([k,v]) => `<li><strong>${k}:</strong> ${safeString(v)}</li>`).join('');
    screenList.innerHTML = Object.entries(sc).map(([k,v]) => `<li><strong>${k}:</strong> ${safeString(v)}</li>`).join('');
    featureList.innerHTML = Object.entries(features).map(([k,v]) => `<li><strong>${k}:</strong> ${safeString(v)}</li>`).join('');

    // Store lastFingerprint for copy/export
    lastFingerprint = { fingerprintObj, finalHash, canonical };
    return lastFingerprint;
  }

  // Interaction
  let lastFingerprint = null;
  copyBtn.addEventListener('click', async () => {
    if (!lastFingerprint) return alert('Not ready yet — wait a moment.');
    try {
      await navigator.clipboard.writeText(lastFingerprint.finalHash);
      copyBtn.textContent = 'Copied!';
      setTimeout(()=> copyBtn.textContent = 'Copy fingerprint', 1500);
    } catch (e) {
      alert('Clipboard failed. You can copy manually from the UI.');
    }
  });

  exportBtn.addEventListener('click', () => {
    if (!lastFingerprint) return alert('Not ready yet.');
    const blob = new Blob([lastFingerprint.canonical], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fingerprint-${(new Date()).toISOString().slice(0,19)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  // Kick off
  await collectFingerprint();

  // Re-run on visibility change (to refresh some signals)
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      await collectFingerprint();
    }
  });

})();
