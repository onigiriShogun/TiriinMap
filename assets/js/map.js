// assets/js/map.js
(function(){
  "use strict";

  let map = null;

  // base layers
  let layerPale = null;
  let layerPhoto = null;
  let currentBase = "pale";

  let measureOn = false;
  let markers = []; // {marker, label}

  // 初期表示座標
  const DEFAULT_LAT = 35.17113349632888;
  const DEFAULT_LON = 136.88352363391604;
  const DEFAULT_ZOOM = 14; // 3段階広域（元17）

  function initMap(){
    if(map) return map;

    map = L.map('map', {
      zoomControl: true,
      attributionControl: true,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
      maxZoom: 21
    });

    // 淡色地図
    layerPale = L.tileLayer(
      "https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png",
      {
        maxZoom: 21,
        maxNativeZoom: 18,
        minZoom: 2,
        tileSize: 256,
        attribution: "出典：国土地理院（地理院タイル）"
      }
    );

    // 航空写真
    layerPhoto = L.tileLayer(
      "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg",
      {
        maxZoom: 21,          // 表示上の最大
        maxNativeZoom: 18,    // タイルが存在する最大
        minZoom: 2,
        tileSize: 256,
        attribution: "出典：国土地理院（地理院タイル）"
      }
    );

    layerPale.addTo(map);
    currentBase = "pale";

    addLayerSwitcher();

    // クリックで標高
    map.on('click', async (e)=>{
      if(!measureOn) return;

      const lat = e.latlng.lat;
      const lon = e.latlng.lng;

      try{
        const elev = await ElevationAPI.getElevationJSONP(lat, lon);
        if(elev === null){
          UI.toast("標高が取得できませんでした（N/A）");
          return;
        }
        const txt = UI.format2NoRound(elev) + " m";

        // dot
        const dotIcon = L.divIcon({
          className: "",
          html: '<div class="elev-dot"></div>',
          iconSize: [14,14],
          iconAnchor: [7,7]
        });
        const m = L.marker([lat, lon], {icon: dotIcon}).addTo(map);

        // label
        const labelIcon = L.divIcon({
          className: "",
          html: '<div class="elev-label">' + txt + '</div>',
          iconSize: [0,0],
          iconAnchor: [-6, 22]
        });
        const lab = L.marker([lat, lon], {icon: labelIcon, interactive:false}).addTo(map);

        markers.push({marker:m, label:lab});
      }catch(err){
        UI.toast(String(err?.message || err), 4500);
      }
    });

    map.setView([DEFAULT_LAT, DEFAULT_LON], DEFAULT_ZOOM);
    setMeasure(false);

    window.addEventListener('resize', ()=>{
      try{ map.invalidateSize(true); }catch(e){}
    });

    return map;
  }

  function setMeasure(on){
    measureOn = !!on;
    return measureOn;
  }

  function isMeasureOn(){
    return measureOn;
  }

  function clearMarkers(){
    if(!map) return;
    for(const it of markers){
      try{ map.removeLayer(it.marker); }catch(e){}
      try{ map.removeLayer(it.label); }catch(e){}
    }
    markers = [];
    UI.toast("標高表示をクリアしました");
  }

  function addLayerSwitcher(){
    const LayerSwitcher = L.Control.extend({
      options: { position: "bottomright" },
      onAdd: function(){
        const container = L.DomUtil.create("div", "gsi-layer-switcher");
        container.innerHTML = `
          <button type="button" class="gsi-layer-switcher__toggle" aria-label="地図を選択" aria-haspopup="true">
            <span aria-hidden="true">▰</span>
          </button>
          <div class="gsi-layer-switcher__menu" role="menu" aria-label="地図の種類">
            <button type="button" class="gsi-layer-switcher__item is-active" data-layer="pale" role="menuitem">淡色地図</button>
            <button type="button" class="gsi-layer-switcher__item" data-layer="photo" role="menuitem">航空写真</button>
          </div>`;

        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        container.querySelectorAll("[data-layer]").forEach((button)=>{
          button.addEventListener("click", ()=>{
            setBaseLayer(button.dataset.layer);
          });
        });

        return container;
      }
    });

    map.addControl(new LayerSwitcher());
    syncLayerSwitcher();
  }

  function syncLayerSwitcher(){
    document.querySelectorAll(".gsi-layer-switcher__item").forEach((button)=>{
      const isActive = button.dataset.layer === currentBase;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function setBaseLayer(key){
    if(!map) initMap();
    const next = (key === "photo") ? "photo" : "pale";
    if(next === currentBase) return;

    const currentLayer = currentBase === "photo" ? layerPhoto : layerPale;
    try{ map.removeLayer(currentLayer); }catch(e){}

    if(next === "photo"){
      layerPhoto.addTo(map);
      UI.toast("航空写真に切り替えました");
    }else{
      layerPale.addTo(map);
      UI.toast("淡色地図に切り替えました");
    }
    currentBase = next;
    syncLayerSwitcher();
  }

  async function exportImage(){
    const mapEl = document.getElementById('map');
    UI.toast("画像準備中...", 2000);

    // 画像出力時はUI（各種ボタン等）を一時的に非表示にする
    const bodyEl = document.body;
    bodyEl.classList.add('exporting');

    try{
      // CSS反映を待ってからキャプチャ
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

      const canvas = await html2canvas(mapEl, {
        useCORS:true,
        allowTaint:false,
        backgroundColor:"#ffffff"
      });

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const ts = new Date();
      const timestamp = `${ts.getFullYear()}${String(ts.getMonth()+1).padStart(2,'0')}${String(ts.getDate()).padStart(2,'0')}_${String(ts.getHours()).padStart(2,'0')}${String(ts.getMinutes()).padStart(2,'0')}${String(ts.getSeconds()).padStart(2,'0')}`;
      const defaultName = `地理院地図標高_${timestamp}.png`;

      // 保存先指定 (File System Access API)
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: defaultName,
            types: [{
              description: 'PNG Image',
              accept: { 'image/png': ['.png'] },
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          UI.toast("画像を保存しました");
        } catch (err) {
          if (err.name !== 'AbortError') throw err;
        }
      } else {
        // Fallback: ダウンロード
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        UI.toast("ブラウザ制限により標準保存しました");
      }
    }catch(e){
      UI.toast("画像出力に失敗しました。画面のスクショをご利用ください。", 4500);
      console.error(e);
    }finally{
      bodyEl.classList.remove('exporting');
    }
  }

  window.MapApp = {
    initMap,
    setMeasure,
    isMeasureOn,
    clearMarkers,
    setBaseLayer,
    exportImage
  };
})();
