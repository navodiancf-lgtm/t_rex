(function (root) {
  // Minimal canvas line chart. xs/ys are parallel arrays; null y values break the line.
  // opts: { color, invert (smaller y drawn higher, for pace), fmtY, fmtX }
  function line(canvas, xs, ys, opts) {
    opts = opts || {};
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.clientWidth || 300, h = canvas.clientHeight || 120;
    canvas.width = w * dpr; canvas.height = h * dpr;
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var lo = Infinity, hi = -Infinity, xmax = 0, n = 0;
    for (var i = 0; i < ys.length; i++) {
      if (ys[i] == null) continue;
      n++; if (ys[i] < lo) lo = ys[i]; if (ys[i] > hi) hi = ys[i];
    }
    if (xs.length) xmax = xs[xs.length - 1];
    if (!n) return false;
    if (hi === lo) { hi += 1; lo -= 1; }
    var padY = (hi - lo) * 0.08; lo -= padY; hi += padY;

    var fg = getComputedStyle(document.body).color;
    var L = 46, R = 8, T = 8, B = 20, pw = w - L - R, ph = h - T - B;
    var fx = function (x) { return L + (xmax ? x / xmax : 0) * pw; };
    var fy = function (y) { var f = (y - lo) / (hi - lo); return T + (opts.invert ? f : 1 - f) * ph; };
    var fmtY = opts.fmtY || function (v) { return Math.round(v); };
    var fmtX = opts.fmtX || function (v) { return Math.round(v / 60) + 'm'; };

    ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = fg; ctx.strokeStyle = fg;
    ctx.globalAlpha = 0.25; ctx.lineWidth = 1;
    for (var g = 0; g <= 3; g++) {
      var gy = T + ph * g / 3; ctx.beginPath(); ctx.moveTo(L, gy); ctx.lineTo(w - R, gy); ctx.stroke();
    }
    ctx.globalAlpha = 0.75; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (var g2 = 0; g2 <= 3; g2++) {
      var v = opts.invert ? lo + (hi - lo) * g2 / 3 : hi - (hi - lo) * g2 / 3;
      ctx.fillText(fmtY(v), L - 6, T + ph * g2 / 3);
    }
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.fillText('0', L, h - 5);
    ctx.textAlign = 'right'; ctx.fillText(fmtX(xmax), w - R, h - 5);

    ctx.globalAlpha = 1; ctx.strokeStyle = opts.color || '#2e7d32'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    ctx.beginPath();
    var pen = false;
    for (var k = 0; k < ys.length; k++) {
      if (ys[k] == null) { pen = false; continue; }
      if (!pen) { ctx.moveTo(fx(xs[k]), fy(ys[k])); pen = true; } else ctx.lineTo(fx(xs[k]), fy(ys[k]));
    }
    ctx.stroke();
    return true;
  }

  var api = { line: line };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Charts = api;
})(typeof window !== 'undefined' ? window : globalThis);
