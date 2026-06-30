// assets/js/elevation.js
(function(){
  "use strict";

  // JSONP for GSI elevation API (CORS回避)
  function getElevationJSONP(lat, lon, timeoutMs=8000){
    return new Promise((resolve, reject)=>{
      const cb = "__gsi_cb_" + Math.random().toString(36).slice(2);
      const script = document.createElement('script');
      const timer = setTimeout(()=>{
        cleanup();
        reject(new Error("標高取得タイムアウト"));
      }, timeoutMs);

      function cleanup(){
        clearTimeout(timer);
        try{
          if(window[cb]) delete window[cb];
        }catch(e){
          window[cb] = undefined;
        }
        if(script && script.parentNode) script.parentNode.removeChild(script);
      }

      window[cb] = (data)=>{
        cleanup();
        if(!data || data.elevation === undefined || data.elevation === null){
          resolve(null);
          return;
        }
        const val = Number(data.elevation);
        if(!isFinite(val)) resolve(null);
        else resolve(val);
      };

      const url = "https://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php"
        + "?lon=" + encodeURIComponent(lon)
        + "&lat=" + encodeURIComponent(lat)
        + "&callback=" + encodeURIComponent(cb);

      script.src = url;
      script.onerror = ()=>{
        cleanup();
        reject(new Error("標高APIに接続できませんでした"));
      };
      document.head.appendChild(script);
    });
  }

  window.ElevationAPI = { getElevationJSONP };
})();
