# T-Rex Track Viewer

Amazfit T-Rex (ya kisi bhi GPX-exporting watch) ke GPS tracks ko **2D map** par dekhne ka chhota web app.
Koi build step nahi: `index.html` browser mein kholo (ya `python3 -m http.server` chalao).

## Features
- GPX upload, OpenStreetMap par route, start/end markers
- Route heart rate ke hisaab se rangeen (neela = kam, laal = zyada)
- Distance, time, pace/speed, elevation gain, avg/max HR, estimated calories
- 18 sports (Running, Trail, Hiking, Trekking, Cycling, MTB, Swimming, Cricket, Football, Badminton, ...).
  GPX ke `<type>`/`<name>` se sport apne aap pehchana jata hai, aur dropdown se badal sakte ho.

> Note: ye sports viewer mein hain. Watch ke andar ki activity list firmware se fixed hai.

## Watch se data kaise laayein (Android)
1. **Gadgetbridge** install karo (F-Droid) aur T-Rex ko pair karo (Amazfit account se auth key chahiye hoti hai).
2. Workout ke baad Gadgetbridge mein **Activity** kholo, workout par tap karo aur **Export GPX** chuno.
3. Yahan app mein wo `.gpx` file upload karo.

## GPS lock slow ho to
- Purani watch ka A-GPS data expire ho jata hai. Gadgetbridge ke device settings mein A-GPS update option dekho.
- Workout se pehle khule aasman ke neeche 1-2 minute ruko.

## Test
`node test/test.js` (Playwright + Chromium chahiye).
