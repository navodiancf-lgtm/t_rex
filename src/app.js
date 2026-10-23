(function () {
  var map = L.map('map').setView([20.59, 78.96], 5);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  var layer = L.layerGroup().addTo(map);

  var current = null; // { id, name, sportId, points }
  var gbDb = null;    // open sql.js Database for a Gadgetbridge export

  var $ = function (id) { return document.getElementById(id); };
  var sportSel = $('sport');
  Sports.SPORTS.forEach(function (s) {
    var o = document.createElement('option');
    o.value = s.id; o.textContent = s.icon + ' ' + s.label;
    sportSel.appendChild(o);
  });

  function msg(t) { $('msg').textContent = t || ''; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function params() {
    return { sport: Sports.byId(sportSel.value), weight: parseFloat($('weight').value) || 70, maxHr: parseFloat($('maxhr').value) || 190 };
  }

  function drawMap(pts, st) {
    layer.clearLayers();
    if (!st.hasGps) { $('legend').hidden = true; return; }
    var gps = pts.filter(Gpx.hasCoord);
    for (var i = 1; i < pts.length; i++) {
      if (!Gpx.hasCoord(pts[i - 1]) || !Gpx.hasCoord(pts[i])) continue;
      L.polyline([[pts[i - 1].lat, pts[i - 1].lon], [pts[i].lat, pts[i].lon]], {
        color: Gpx.hrColor(pts[i].hr, st.hrMin, st.hrMax), weight: 5, opacity: 0.9
      }).addTo(layer);
    }
    L.circleMarker([gps[0].lat, gps[0].lon], { radius: 7, color: '#0a0', fillOpacity: 1 }).addTo(layer).bindTooltip('Start');
    var last = gps[gps.length - 1];
    L.circleMarker([last.lat, last.lon], { radius: 7, color: '#c00', fillOpacity: 1 }).addTo(layer).bindTooltip('End');
    map.fitBounds(L.latLngBounds(gps.map(function (p) { return [p.lat, p.lon]; })), { padding: [30, 30] });
    $('legend').hidden = st.hrMax == null;
    if (st.hrMax != null) { $('lo').textContent = Math.round(st.hrMin); $('hi').textContent = Math.round(st.hrMax); }
  }

  function drawStats(st, sport) {
    var speedLabel = sport.metric === 'pace' ? 'Pace' : 'Speed';
    var speedVal = !st.hasGps ? '–' : sport.metric === 'pace'
      ? (st.paceSecPerKm ? Gpx.fmtDuration(st.paceSecPerKm) + ' /km' : '–')
      : (st.speedKmh ? st.speedKmh.toFixed(1) + ' km/h' : '–');
    var cards = [
      ['Distance', st.hasGps ? st.distanceKm.toFixed(2) + ' km' : '–'],
      ['Time', Gpx.fmtDuration(st.seconds)],
      [speedLabel, speedVal],
      ['Elevation gain', Math.round(st.elevationGain) + ' m'],
      ['Avg HR', st.hrAvg ? Math.round(st.hrAvg) + ' bpm' : '–'],
      ['Max HR', st.hrMax ? st.hrMax + ' bpm' : '–'],
      ['Calories (est.)', st.calories != null ? st.calories + ' kcal' : '–']
    ];
    $('stats').innerHTML = cards.map(function (c) {
      return '<div class="card"><span>' + c[0] + '</span><b>' + c[1] + '</b></div>';
    }).join('');
  }

  function drawZones(pts, maxHr) {
    var z = Analysis.hrZones(pts, maxHr);
    $('zonesBox').hidden = !z.total;
    $('zones').innerHTML = Analysis.ZONES.map(function (zone, i) {
      var pct = z.total ? z.secs[i] / z.total * 100 : 0;
      return '<div class="zone"><span>' + zone.label + '</span><div class="bar"><i style="width:' + pct.toFixed(1) +
        '%;background:' + zone.color + '"></i></div><span>' + Gpx.fmtDuration(z.secs[i]) + '</span></div>';
    }).join('');
  }

  function drawCharts(pts, sport) {
    var s = Analysis.series(pts, Gpx), pace = sport.metric === 'pace';
    var show = function (box, canvas, ys, opts) {
      var ok = Charts.line($(canvas), s.t, ys, opts);
      $(box).hidden = !ok;
    };
    // Boxes must be visible before drawing so the canvas has a real size.
    ['boxHr', 'boxSpeed', 'boxEle'].forEach(function (b) { $(b).hidden = false; });
    show('boxHr', 'chHr', s.hr, { color: '#e53935' });
    var speedYs = s.speed.map(function (v) {
      if (v == null || v < 1) return null;
      return pace ? Math.min(60 / v, 20) : v;
    });
    $('speedTitle').textContent = pace ? 'Pace (min/km)' : 'Speed (km/h)';
    show('boxSpeed', 'chSpeed', speedYs, pace
      ? { color: '#1e88e5', invert: true, fmtY: function (v) { return Gpx.fmtDuration(v * 60); } }
      : { color: '#1e88e5', fmtY: function (v) { return v.toFixed(1); } });
    show('boxEle', 'chEle', s.ele, { color: '#6d4c41' });
  }

  function render() {
    if (!current || !current.points.length) return;
    var p = params();
    var st = Gpx.stats(current.points, p.weight, p.sport.met);
    drawMap(current.points, st);
    drawStats(st, p.sport);
    drawZones(current.points, p.maxHr);
    drawCharts(current.points, p.sport);
  }

  // ---- History (IndexedDB) ----
  function persist(w) {
    var p = params(), st = Gpx.stats(w.points, p.weight, Sports.byId(w.sportId).met);
    var rec = {
      id: w.id, name: w.name, sportId: w.sportId, savedAt: Date.now(),
      startTime: w.points[0].time || 0,
      summary: { distanceKm: st.hasGps ? st.distanceKm : null, seconds: st.seconds },
      points: Store.pack(w.points)
    };
    return Store.put(rec).then(refreshHistory, function () { msg('History save nahi ho payi (browser storage blocked ho sakta hai).'); });
  }

  function refreshHistory() {
    return Store.list().then(function (items) {
      items.sort(function (a, b) { return b.startTime - a.startTime; });
      $('historyEmpty').hidden = items.length > 0;
      $('history').innerHTML = items.map(function (it) {
        var sp = Sports.byId(it.sportId), date = it.startTime ? new Date(it.startTime).toLocaleString() : '';
        var km = it.summary.distanceKm != null ? it.summary.distanceKm.toFixed(2) + ' km · ' : '';
        return '<li data-id="' + esc(it.id) + '"><span>' + sp.icon + '</span><div class="grow"><b>' + esc(it.name) +
          '</b><small>' + esc(date) + ' · ' + km + Gpx.fmtDuration(it.summary.seconds) +
          '</small></div><button type="button" data-del="1" title="Delete" aria-label="Delete">🗑️</button></li>';
      }).join('');
    }, function () { $('historyEmpty').hidden = false; });
  }

  $('history').addEventListener('click', function (e) {
    var li = e.target.closest('li'); if (!li) return;
    var id = li.getAttribute('data-id');
    if (e.target.closest('[data-del]')) { Store.remove(id).then(refreshHistory); return; }
    Store.get(id).then(function (r) {
      if (!r) return;
      current = { id: r.id, name: r.name, sportId: r.sportId, points: Store.unpack(r.points) };
      sportSel.value = r.sportId; msg(r.name); render();
    });
  });

  // ---- Loading ----
  function toWorkout(parsed, name) {
    return {
      id: (parsed.points[0].time || 0) + '_' + parsed.points.length,
      name: name, sportId: Sports.detect(parsed.typeText || name), points: parsed.points
    };
  }

  function loadText(text, name) {
    var doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) { msg(name + ': ye valid GPX file nahi hai.'); return null; }
    var parsed = Gpx.parseDoc(doc);
    if (!parsed.points.length) { msg(name + ': GPX mein koi track point nahi mila.'); return null; }
    return toWorkout(parsed, name.replace(/\.gpx$/i, ''));
  }

  function show(w) {
    current = w; sportSel.value = w.sportId; render(); persist(w); mergeFromDb();
  }

  $('file').addEventListener('change', function (e) {
    var files = Array.prototype.slice.call(e.target.files);
    e.target.value = '';
    Promise.all(files.map(function (f) {
      return new Promise(function (res) { var r = new FileReader(); r.onload = function () { res(loadText(r.result, f.name)); }; r.readAsText(f); });
    })).then(function (ws) {
      ws = ws.filter(Boolean); if (!ws.length) return;
      ws.slice(1).forEach(persist); // extra files only go to history
      show(ws[0]);
      msg(ws.length > 1 ? ws.length + ' workouts history mein save hue.' : '');
    });
  });
  $('demo').addEventListener('click', function () {
    fetch('sample/sample.gpx').then(function (r) { return r.text(); }).then(function (t) {
      var w = loadText(t, 'Demo run'); if (w) show(w);
    }, function () { msg('Demo load nahi hua. Page ko http server se kholo (file:// se fetch nahi chalta).'); });
  });

  // ---- Gadgetbridge database ----
  function timeRange(points) {
    var t = points.map(function (p) { return p.time; }).filter(function (x) { return x != null; });
    return t.length ? [Math.min.apply(null, t), Math.max.apply(null, t)] : null;
  }

  function mergeFromDb() {
    if (!gbDb || !current) return;
    var range = timeRange(current.points); if (!range) return;
    var missing = current.points.some(function (p) { return p.hr == null; });
    if (!missing) return;
    var n = GbDb.mergeHr(current.points, GbDb.hrSamples(gbDb, range[0], range[1]));
    if (n) { msg('Gadgetbridge DB se ' + n + ' heart-rate readings jodi gayi.'); render(); persist(current); }
  }

  function listGbWorkouts() {
    var ws = GbDb.listWorkouts(gbDb);
    $('gbBox').hidden = !ws.length;
    $('gbList').innerHTML = ws.map(function (w, i) {
      var sp = Sports.byId(Sports.detect(w.name));
      return '<li data-i="' + i + '"><span>' + sp.icon + '</span><div class="grow"><b>' + esc(w.name) + '</b><small>' +
        esc(new Date(w.start).toLocaleString()) + ' · ' + Gpx.fmtDuration((w.end - w.start) / 1000) + '</small></div></li>';
    }).join('');
    $('gbList').onclick = function (e) {
      var li = e.target.closest('li'); if (!li) return;
      var w = ws[+li.getAttribute('data-i')];
      var samples = GbDb.hrSamples(gbDb, w.start, w.end);
      if (!samples.length) { msg('Is workout ke liye heart-rate data nahi mila.'); return; }
      var pts = GbDb.samplesToPoints(samples);
      show({ id: 'gb_' + w.start, name: w.name, sportId: Sports.detect(w.name), points: pts });
      msg('Gadgetbridge workout (sirf heart rate, GPS ke liye GPX file bhi upload karo).');
    };
  }

  $('db').addEventListener('change', function (e) {
    var f = e.target.files[0]; e.target.value = ''; if (!f) return;
    if (typeof initSqlJs === 'undefined') { msg('SQLite reader load nahi hua (internet chahiye).'); return; }
    var r = new FileReader();
    r.onload = function () {
      initSqlJs({ locateFile: function (n) { return 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/' + n; } })
        .then(function (SQL) {
          if (gbDb) gbDb.close();
          gbDb = new SQL.Database(new Uint8Array(r.result));
          listGbWorkouts(); mergeFromDb();
          if (!current) msg('Gadgetbridge DB khul gayi. Neeche se workout chuno.');
        })
        .catch(function () { msg('Ye valid Gadgetbridge database nahi lagti.'); });
    };
    r.readAsArrayBuffer(f);
  });

  sportSel.addEventListener('change', function () {
    if (current) { current.sportId = sportSel.value; persist(current); }
    render();
  });
  $('weight').addEventListener('input', render);
  $('maxhr').addEventListener('input', render);
  window.addEventListener('resize', render);
  refreshHistory();
})();
