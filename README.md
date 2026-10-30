# T-Rex Track Viewer

Amazfit T-Rex (ya kisi bhi GPX-exporting watch) ke GPS tracks ko **2D map** par dekhne ka chhota web app.
Koi build step nahi: `index.html` browser mein kholo (ya `python3 -m http.server` chalao).

## Features
- GPX upload, OpenStreetMap par route, start/end markers
- Route heart rate ke hisaab se rangeen (neela = kam, laal = zyada)
- Distance, time, pace/speed, elevation gain, avg/max HR, estimated calories
- **Heart-rate zones** (Z1-Z5, % of Max HR) aur **charts**: heart rate, pace/speed, elevation
- **History**: har upload browser mein (IndexedDB) save hota hai, baad mein click karke dobara khol sakte ho. Ek saath kai GPX upload ho sakti hain.
- **Compare**: History mein 2 ya zyada workouts ka checkbox chuno, phir **Compare** dabao. Routes ek map par alag rangon mein, aur stats ki side-by-side table dikhegi.
- **Gadgetbridge DB import**: `Gadgetbridge.db` upload karo. GPX mein HR missing ho to DB se bhar jati hai,
  aur DB ke workouts (sirf heart rate, bina GPS) bhi khol sakte ho.
- 18 sports (Running, Trail, Hiking, Trekking, Cycling, MTB, Swimming, Cricket, Football, Badminton, ...).
  GPX ke `<type>`/`<name>` se sport apne aap pehchana jata hai, aur dropdown se badal sakte ho.

> Note: ye sports viewer mein hain. Watch ke andar ki activity list firmware se fixed hai.

## Watch se data kaise laayein (Android)
1. **Gadgetbridge** install karo (F-Droid) aur T-Rex ko pair karo (Amazfit account se auth key chahiye hoti hai).
2. Workout ke baad Gadgetbridge mein **Activity** kholo, workout par tap karo aur **Export GPX** chuno.
3. Yahan app mein wo `.gpx` file upload karo.

### Gadgetbridge DB (optional)
Gadgetbridge mein **Settings -> Database management -> Export DB**, phir wo file yahan `Gadgetbridge DB` button se chuno.
Ye table/column naam Gadgetbridge ke Huami schema (`BASE_ACTIVITY_SUMMARY`, `HUAMI_EXTENDED_ACTIVITY_SAMPLE`,
`MI_BAND_ACTIVITY_SAMPLE`) se liye gaye hain. Test ek banayi hui DB par hua hai, asli T-Rex export par nahi.
Agar aapki DB mein kuch na dikhe to batao, schema ke hisaab se adjust kar dunge. GPS route DB mein nahi hota (alag GPX file mein
hota hai), isliye map ke liye GPX hi upload karo.

## GPS lock slow ho to
- Purani watch ka A-GPS data expire ho jata hai. Gadgetbridge ke device settings mein A-GPS update option dekho.
- Workout se pehle khule aasman ke neeche 1-2 minute ruko.

## Test
`npm install && npm test` (Playwright + Chromium chahiye). Test Leaflet/sql.js ko `node_modules` se serve karta hai, internet nahi chahiye.
App khud chalane ke liye internet chahiye (Leaflet, sql.js aur map tiles CDN se aate hain).
