(function (root) {
  var R = 6371000;

  function haversine(a, b) {
    var toRad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * toRad, dLon = (b.lon - a.lon) * toRad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  // doc: an XML Document (browser DOMParser or a compatible one).
  function parseDoc(doc) {
    var trkpts = doc.getElementsByTagName('trkpt');
    var points = [];
    for (var i = 0; i < trkpts.length; i++) {
      var n = trkpts[i];
      var p = { lat: parseFloat(n.getAttribute('lat')), lon: parseFloat(n.getAttribute('lon')),
        ele: null, time: null, hr: null };
      var ele = n.getElementsByTagName('ele')[0];
      if (ele) p.ele = parseFloat(ele.textContent);
      var time = n.getElementsByTagName('time')[0];
      if (time) p.time = Date.parse(time.textContent);
      // Heart rate lives in a namespaced extension (gpxtpx:hr, ns3:hr, ...), so match by local name.
      var all = n.getElementsByTagName('*');
      for (var j = 0; j < all.length; j++) {
        var name = (all[j].localName || all[j].nodeName).replace(/^.*:/, '');
        if (name === 'hr') { p.hr = parseFloat(all[j].textContent); break; }
      }
      if (isFinite(p.lat) && isFinite(p.lon)) points.push(p);
    }
    var typeEl = doc.getElementsByTagName('type')[0] || doc.getElementsByTagName('name')[0];
    return { points: points, typeText: typeEl ? typeEl.textContent : '' };
  }

  // Points imported from a watch database have heart rate but no coordinates.
  function hasCoord(p) {
    return typeof p.lat === 'number' && typeof p.lon === 'number' && isFinite(p.lat) && isFinite(p.lon);
  }

  function stats(points, weightKg, met) {
    var dist = 0, gain = 0, hrSum = 0, hrN = 0, hrMax = 0, hrMin = Infinity, hasGps = false;
    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      if (hasCoord(p)) hasGps = true;
      if (i > 0) {
        if (hasCoord(points[i - 1]) && hasCoord(p)) dist += haversine(points[i - 1], p);
        if (p.ele != null && points[i - 1].ele != null && p.ele > points[i - 1].ele) gain += p.ele - points[i - 1].ele;
      }
      if (p.hr != null && isFinite(p.hr) && p.hr > 0) {
        hrSum += p.hr; hrN++; if (p.hr > hrMax) hrMax = p.hr; if (p.hr < hrMin) hrMin = p.hr;
      }
    }
    var t0 = points.length ? points[0].time : null, t1 = points.length ? points[points.length - 1].time : null;
    var seconds = t0 != null && t1 != null ? (t1 - t0) / 1000 : 0;
    var km = dist / 1000;
    return {
      hasGps: hasGps,
      distanceKm: km,
      seconds: seconds,
      paceSecPerKm: km > 0 && seconds > 0 ? seconds / km : null,
      speedKmh: seconds > 0 ? km / (seconds / 3600) : null,
      elevationGain: gain,
      hrAvg: hrN ? hrSum / hrN : null,
      hrMax: hrN ? hrMax : null,
      hrMin: hrN ? hrMin : null,
      calories: seconds > 0 ? Math.round(met * weightKg * seconds / 3600) : null
    };
  }

  // Blue (low) -> green -> red (high), by position between lo and hi.
  function hrColor(hr, lo, hi) {
    if (hr == null || hi <= lo) return '#3388ff';
    var t = Math.max(0, Math.min(1, (hr - lo) / (hi - lo)));
    var hue = 220 - t * 220; // 220 = blue, 0 = red
    return 'hsl(' + hue.toFixed(0) + ',85%,50%)';
  }

  function fmtDuration(s) {
    s = Math.round(s || 0);
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    var pad = function (x) { return x < 10 ? '0' + x : '' + x; };
    return (h ? h + ':' + pad(m) : m) + ':' + pad(sec);
  }

  var api = { haversine: haversine, parseDoc: parseDoc, stats: stats, hasCoord: hasCoord, hrColor: hrColor, fmtDuration: fmtDuration };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Gpx = api;
})(typeof window !== 'undefined' ? window : globalThis);
