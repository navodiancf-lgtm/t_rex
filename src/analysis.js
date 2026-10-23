(function (root) {
  var ZONES = [
    { label: 'Z1 Warm-up',   color: '#90caf9' },
    { label: 'Z2 Fat burn',  color: '#66bb6a' },
    { label: 'Z3 Aerobic',   color: '#fdd835' },
    { label: 'Z4 Threshold', color: '#fb8c00' },
    { label: 'Z5 Max',       color: '#e53935' }
  ];
  var MAX_GAP_S = 60; // pauses longer than this are not counted as time in a zone

  // Zones are % of max HR: Z2 from 60%, Z3 from 70%, Z4 from 80%, Z5 from 90%. Anything under 60% counts as Z1.
  function zoneIndex(hr, maxHr) {
    var pct = hr / maxHr;
    return pct < 0.6 ? 0 : pct < 0.7 ? 1 : pct < 0.8 ? 2 : pct < 0.9 ? 3 : 4;
  }

  function hrZones(points, maxHr) {
    var secs = [0, 0, 0, 0, 0], total = 0;
    for (var i = 1; i < points.length; i++) {
      var a = points[i - 1], b = points[i];
      if (a.time == null || b.time == null || b.hr == null) continue;
      var dt = (b.time - a.time) / 1000;
      if (dt <= 0 || dt > MAX_GAP_S) continue;
      secs[zoneIndex(b.hr, maxHr)] += dt; total += dt;
    }
    return { secs: secs, total: total };
  }

  // Per-point series for charts. t = seconds since start; speed = km/h over a short sliding window.
  function series(points, Gpx) {
    var t0 = points.length ? points[0].time : null;
    var out = { t: [], hr: [], ele: [], speed: [] };
    var cum = [0];
    for (var i = 1; i < points.length; i++) {
      var ok = Gpx.hasCoord(points[i - 1]) && Gpx.hasCoord(points[i]);
      cum.push(cum[i - 1] + (ok ? Gpx.haversine(points[i - 1], points[i]) : 0));
    }
    var WIN = 4;
    for (var k = 0; k < points.length; k++) {
      var p = points[k];
      out.t.push(t0 != null && p.time != null ? (p.time - t0) / 1000 : k);
      out.hr.push(p.hr != null ? p.hr : null);
      out.ele.push(p.ele != null ? p.ele : null);
      var j = Math.max(0, k - WIN), dt = (p.time != null && points[j].time != null) ? (p.time - points[j].time) / 1000 : 0;
      out.speed.push(Gpx.hasCoord(p) && dt > 0 ? (cum[k] - cum[j]) / dt * 3.6 : null);
    }
    return out;
  }

  var api = { ZONES: ZONES, zoneIndex: zoneIndex, hrZones: hrZones, series: series };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Analysis = api;
})(typeof window !== 'undefined' ? window : globalThis);
