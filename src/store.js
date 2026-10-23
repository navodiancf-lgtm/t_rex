(function (root) {
  var DB = 'trex-viewer', STORE = 'workouts';

  // Compact form: one array per point keeps stored workouts small.
  function pack(points) { return points.map(function (p) { return [p.lat, p.lon, p.ele, p.time, p.hr]; }); }
  function unpack(rows) {
    return rows.map(function (r) { return { lat: r[0], lon: r[1], ele: r[2], time: r[3], hr: r[4] }; });
  }

  function open() {
    return new Promise(function (resolve, reject) {
      if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB not available'));
      var r = indexedDB.open(DB, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(STORE, { keyPath: 'id' }); };
      r.onsuccess = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
    });
  }

  function run(mode, fn) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORE, mode), req = fn(t.objectStore(STORE));
        t.oncomplete = function () { db.close(); resolve(req && req.result); };
        t.onerror = t.onabort = function () { db.close(); reject(t.error); };
      });
    });
  }

  var api = {
    pack: pack, unpack: unpack,
    list: function () { return run('readonly', function (s) { return s.getAll(); }).then(function (r) { return r || []; }); },
    get: function (id) { return run('readonly', function (s) { return s.get(id); }); },
    put: function (w) { return run('readwrite', function (s) { return s.put(w); }); },
    remove: function (id) { return run('readwrite', function (s) { return s.delete(id); }); }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Store = api;
})(typeof window !== 'undefined' ? window : globalThis);
