(function () {
  var map = L.map('map').setView([20.59, 78.96], 5);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  var layer = L.layerGroup().addTo(map);
  var current = null; // { points, typeText }

  var $ = function (id) { return document.getElementById(id); };
  var sportSel = $('sport');
  Sports.SPORTS.forEach(function (s) {
    var o = document.createElement('option');
    o.value = s.id; o.textContent = s.icon + ' ' + s.label;
    sportSel.appendChild(o);
  });

  function render() {
    if (!current || !current.points.length) return;
    var sport = Sports.byId(sportSel.value);
    var weight = parseFloat($('weight').value) || 70;
    var st = Gpx.stats(current.points, weight, sport.met);

    layer.clearLayers();
    var pts = current.points, lo = st.hrMin, hi = st.hrMax;
    for (var i = 1; i < pts.length; i++) {
      L.polyline([[pts[i - 1].lat, pts[i - 1].lon], [pts[i].lat, pts[i].lon]], {
        color: Gpx.hrColor(pts[i].hr, lo, hi), weight: 5, opacity: 0.9
      }).addTo(layer);
    }
    L.circleMarker([pts[0].lat, pts[0].lon], { radius: 7, color: '#0a0', fillOpacity: 1 }).addTo(layer).bindTooltip('Start');
    var last = pts[pts.length - 1];
    L.circleMarker([last.lat, last.lon], { radius: 7, color: '#c00', fillOpacity: 1 }).addTo(layer).bindTooltip('End');
    map.fitBounds(L.latLngBounds(pts.map(function (p) { return [p.lat, p.lon]; })), { padding: [30, 30] });

    var speedLabel, speedVal;
    if (sport.metric === 'pace') {
      speedLabel = 'Pace'; speedVal = st.paceSecPerKm ? Gpx.fmtDuration(st.paceSecPerKm) + ' /km' : '–';
    } else {
      speedLabel = 'Speed'; speedVal = st.speedKmh ? st.speedKmh.toFixed(1) + ' km/h' : '–';
    }
    var cards = [
      ['Distance', st.distanceKm.toFixed(2) + ' km'],
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
    $('legend').hidden = st.hrMax == null;
    if (st.hrMax != null) { $('lo').textContent = Math.round(lo); $('hi').textContent = Math.round(hi); }
  }

  function load(text, name) {
    var doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) { alert('Ye valid GPX file nahi hai.'); return; }
    var parsed = Gpx.parseDoc(doc);
    if (!parsed.points.length) { alert('GPX mein koi track point nahi mila.'); return; }
    current = parsed;
    sportSel.value = Sports.detect(parsed.typeText || name);
    render();
  }

  $('file').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    var r = new FileReader(); r.onload = function () { load(r.result, f.name); }; r.readAsText(f);
  });
  $('demo').addEventListener('click', function () {
    fetch('sample/sample.gpx').then(function (r) { return r.text(); }).then(function (t) { load(t, 'running'); });
  });
  sportSel.addEventListener('change', render);
  $('weight').addEventListener('input', render);
})();
