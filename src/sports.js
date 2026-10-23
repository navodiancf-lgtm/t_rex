(function (root) {
  // met: approximate Metabolic Equivalent of Task, used for the calorie estimate.
  // metric: how the main speed figure is shown ("pace" = min/km, "speed" = km/h).
  var SPORTS = [
    { id: 'running',      label: 'Running',        icon: '🏃', metric: 'pace',  met: 9.8 },
    { id: 'trail',        label: 'Trail Running',  icon: '⛰️', metric: 'pace',  met: 10.0 },
    { id: 'treadmill',    label: 'Treadmill',      icon: '🏃‍♂️', metric: 'pace',  met: 9.0 },
    { id: 'walking',      label: 'Walking',        icon: '🚶', metric: 'pace',  met: 3.8 },
    { id: 'hiking',       label: 'Hiking',         icon: '🥾', metric: 'pace',  met: 6.0 },
    { id: 'trekking',     label: 'Trekking',       icon: '🏔️', metric: 'pace',  met: 7.0 },
    { id: 'cycling',      label: 'Cycling',        icon: '🚴', metric: 'speed', met: 8.0 },
    { id: 'mtb',          label: 'Mountain Bike',  icon: '🚵', metric: 'speed', met: 8.5 },
    { id: 'swimming',     label: 'Swimming',       icon: '🏊', metric: 'pace',  met: 8.0 },
    { id: 'openwater',    label: 'Open Water',     icon: '🌊', metric: 'pace',  met: 8.5 },
    { id: 'rowing',       label: 'Rowing',         icon: '🚣', metric: 'speed', met: 7.0 },
    { id: 'skiing',       label: 'Skiing',         icon: '⛷️', metric: 'speed', met: 7.0 },
    { id: 'climbing',     label: 'Climbing',       icon: '🧗', metric: 'speed', met: 8.0 },
    { id: 'skating',      label: 'Skating',        icon: '⛸️', metric: 'speed', met: 7.5 },
    { id: 'cricket',      label: 'Cricket',        icon: '🏏', metric: 'speed', met: 4.8 },
    { id: 'football',     label: 'Football',       icon: '⚽', metric: 'speed', met: 7.0 },
    { id: 'badminton',    label: 'Badminton',      icon: '🏸', metric: 'speed', met: 5.5 },
    { id: 'other',        label: 'Other',          icon: '🎯', metric: 'speed', met: 5.0 }
  ];

  // Words found in GPX <type> / <name> tags, mapped to our sport ids.
  var ALIASES = {
    run: 'running', running: 'running', jog: 'running', trailrun: 'trail', trail: 'trail',
    treadmill: 'treadmill', walk: 'walking', walking: 'walking', hike: 'hiking', hiking: 'hiking',
    trek: 'trekking', trekking: 'trekking', bike: 'cycling', biking: 'cycling', cycle: 'cycling',
    cycling: 'cycling', ride: 'cycling', mtb: 'mtb', mountainbike: 'mtb', swim: 'swimming',
    swimming: 'swimming', openwater: 'openwater', row: 'rowing', rowing: 'rowing',
    ski: 'skiing', skiing: 'skiing', climb: 'climbing', climbing: 'climbing',
    skate: 'skating', skating: 'skating', cricket: 'cricket', football: 'football',
    soccer: 'football', badminton: 'badminton'
  };

  function byId(id) {
    for (var i = 0; i < SPORTS.length; i++) if (SPORTS[i].id === id) return SPORTS[i];
    return SPORTS[SPORTS.length - 1];
  }

  function detect(text) {
    var key = String(text || '').toLowerCase().replace(/[^a-z]/g, '');
    if (ALIASES[key]) return ALIASES[key];
    for (var a in ALIASES) if (key.indexOf(a) !== -1) return ALIASES[a];
    return 'other';
  }

  var api = { SPORTS: SPORTS, byId: byId, detect: detect };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Sports = api;
})(typeof window !== 'undefined' ? window : globalThis);
