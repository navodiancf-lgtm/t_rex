(function (root) {
  // Reads a Gadgetbridge database export through an sql.js Database.
  // Table/column names follow Gadgetbridge's Huami (Amazfit/Mi Band) schema; each lookup is
  // checked first so a different version of the schema degrades to "nothing found", not a crash.
  var SAMPLE_TABLES = ['HUAMI_EXTENDED_ACTIVITY_SAMPLE', 'MI_BAND_ACTIVITY_SAMPLE'];

  function columns(db, table) {
    var r = db.exec('PRAGMA table_info(' + table + ')');
    return r.length ? r[0].values.map(function (row) { return row[1]; }) : [];
  }
  function has(cols, names) { return names.every(function (n) { return cols.indexOf(n) !== -1; }); }
  function toMs(v) { return v < 1e11 ? v * 1000 : v; } // tolerate seconds or milliseconds

  function listWorkouts(db) {
    var cols = columns(db, 'BASE_ACTIVITY_SUMMARY');
    if (!has(cols, ['START_TIME', 'END_TIME'])) return [];
    var name = cols.indexOf('NAME') !== -1 ? 'NAME' : "''";
    var r = db.exec('SELECT ' + name + ', START_TIME, END_TIME FROM BASE_ACTIVITY_SUMMARY ORDER BY START_TIME DESC LIMIT 200');
    if (!r.length) return [];
    return r[0].values.map(function (row) {
      return { name: row[0] || 'Workout', start: toMs(row[1]), end: toMs(row[2]) };
    });
  }

  // Heart-rate samples between two epoch-ms times, as [{time (ms), hr}]. Values outside 30-250 are sensor "invalid" markers.
  function hrSamples(db, startMs, endMs) {
    for (var i = 0; i < SAMPLE_TABLES.length; i++) {
      var t = SAMPLE_TABLES[i];
      if (!has(columns(db, t), ['TIMESTAMP', 'HEART_RATE'])) continue;
      var stmt = db.prepare('SELECT TIMESTAMP, HEART_RATE FROM ' + t +
        ' WHERE TIMESTAMP BETWEEN ? AND ? AND HEART_RATE BETWEEN 30 AND 250 ORDER BY TIMESTAMP');
      var out = [];
      stmt.bind([Math.floor(startMs / 1000), Math.ceil(endMs / 1000)]);
      while (stmt.step()) { var row = stmt.get(); out.push({ time: row[0] * 1000, hr: row[1] }); }
      stmt.free();
      if (out.length) return out;
    }
    return [];
  }

  // Fill missing hr on points from the nearest sample within maxGapMs. Returns how many points were filled.
  function mergeHr(points, samples, maxGapMs) {
    maxGapMs = maxGapMs || 60000;
    var filled = 0, j = 0;
    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      if (p.hr != null || p.time == null) continue;
      while (j + 1 < samples.length && Math.abs(samples[j + 1].time - p.time) <= Math.abs(samples[j].time - p.time)) j++;
      if (samples[j] && Math.abs(samples[j].time - p.time) <= maxGapMs) { p.hr = samples[j].hr; filled++; }
    }
    return filled;
  }

  // HR-only "points" (no coordinates) for a workout that has no GPX.
  function samplesToPoints(samples) {
    return samples.map(function (s) { return { lat: null, lon: null, ele: null, time: s.time, hr: s.hr }; });
  }

  var api = { listWorkouts: listWorkouts, hrSamples: hrSamples, mergeHr: mergeHr, samplesToPoints: samplesToPoints };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GbDb = api;
})(typeof window !== 'undefined' ? window : globalThis);
