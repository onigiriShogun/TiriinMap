// assets/js/map.js
(function(){
  "use strict";

  let map = null;
  let layerPale = null;
  let layerPhoto = null;
  let currentBase = "pale";
  let markers = []; // {marker, label}
  let suppressMeasureUntil = 0;

  const DEFAULT_LAT = 35.17113349632888;
  const DEFAULT_LON = 136.88352363391604;
  const DEFAULT_ZOOM = 14;
  const GESTURE_SUPPRESS_MS = 300;

  function suppressMeasurementBriefly(){
    suppressMeasureUntil = Date.now() + GESTURE_SUPPRESS_MS;
  }

  function isMeasurementSuppressed(){
    return Date.now() < suppressMeasureUntil;
  }

  function removeMarkerItem(item){
    if(!map || !item) return;
    try{ item.marker.closePopup(); }catch(e){}
    try{ map.removeLayer(item.marker); }catch(e){}
    try{ map.removeLayer(item.label); }catch(e){}
    markers = markers.filter(current => current !== item);
    UI.toast("選択した標高点を削除しました");
  }

  function bindDeletePopup(item, elevationText){
    const popup = L.popup({
      closeButton: true,
      className: "elev-delete-popup",
      offset: [0, -8]
    }).setContent(
      '<div class="elev-delete-popup__value">' + elevationText + '</div>' +
      '<button type="button" class="elev-delete-popup__button">この点を削除</button>'
    );

    item.marker.bindPopup(popup);

    item.marker.on('click', (event)=>{
      if(event?.originalEvent){
        L.DomEvent.stopPropagation(event.originalEvent);
      }
    });

    item.marker.on('popupopen', (event)=>{
      const popupElement = event.popup.getElement();
      const deleteButton = popupElement?.querySelector('.elev-delete-popup__button');
      if(!deleteButton) return;

      L.DomEvent.disableClickPropagation(popupElement);
      L.DomEvent.disableScrollPropagation(popupElement);

      deleteButton.addEventListener('click', (buttonEvent)=>{
        L.DomEvent.stop(buttonEvent);
        removeMarkerItem(item);
      }, {once:true});
    });
  }

  function initMap(){
    if(map) return map;

    map = L.map('map', {
      zoomControl: false,
      attributionControl: true,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 200,
      maxZoom: 21
    });

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

    layerPhoto = L.tileLayer(
      "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg",
      {
        maxZoom: 21,
        maxNativeZoom: 18,
        minZoom: 2,
        tileSize: 256,
        attribution: "出典：国土地理院（地理院タイル）"
      }
    );

    layerPale.addTo(map);
    currentBase = "pale";
    L.control.zoom({ position: "bottomright" }).addTo(map);

    map.on('dragstart zoomstart movestart', suppressMeasurementBriefly);
    map.on('dragend zoomend moveend', suppressMeasurementBriefly);

    map.on('click', async (e)=>{
      if(isMeasurementSuppressed()) return;

      const originalTarget = e?.originalEvent?.target;
      if(originalTarget?.closest?.('.leaflet-control, .leaflet-popup, #controls')) return;

      const lat = e.latlng.lat;
      const lon = e.latlng.lng;

      try{
        const elev = await ElevationAPI.getElevationJSONP(lat, lon);
        if(elev === null){
          UI.toast("標高が取得できませんでした（N/A）");
          return;
        }

        const txt = UI.format2NoRound(elev) + " m";
        const dotIcon = L.divIcon({
          className: "elev-marker-hitarea",
          html: '<div class="elev-dot"></div>',
          iconSize: [36,36],
          iconAnchor: [18,18]
        });
        const marker = L.marker([lat, lon], {
          icon: dotIcon,
          keyboard: true,
          title: txt + "。クリックで削除メニューを表示"
        }).addTo(map);

        const labelIcon = L.divIcon({
          className: "",
          html: '<div class="elev-label">' + txt + '</div>',
          iconSize: [0,0],
          iconAnchor: [-6, 22]
        });
        const label = L.marker([lat, lon], {icon: labelIcon, interactive:false}).addTo(map);

        const item = {marker, label};
        markers.push(item);
        bindDeletePopup(item, txt);
      }catch(err){
        UI.toast(String(err?.message || err), 4500);
      }
    });

    map.setView([DEFAULT_LAT, DEFAULT_LON], DEFAULT_ZOOM);

    window.addEventListener('resize', ()=>{
      try{ map.invalidateSize(true); }catch(e){}
    });

    return map;
  }

  function clearMarkers(){
    if(!map) return;
    for(const item of markers){
      try{ item.marker.closePopup(); }catch(e){}
      try{ map.removeLayer(item.marker); }catch(e){}
      try{ map.removeLayer(item.label); }catch(e){}
    }
    markers = [];
    UI.toast("標高表示を全クリアしました");
  }

  function getBaseLayer(){
    return currentBase;
  }

  function getNextBaseLayerLabel(){
    return currentBase === "photo" ? "淡色地図へ切替" : "航空写真へ切替";
  }

  function toggleBaseLayer(){
    const next = currentBase === "photo" ? "pale" : "photo";
    setBaseLayer(next);
    return currentBase;
  }

  function setBaseLayer(key){
    if(!map) initMap();
    const next = (key === "photo") ? "photo" : "pale";
    if(next === currentBase) return currentBase;

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
    return currentBase;
  }

  async function exportImage(){
    const mapEl = document.getElementById('map');
    UI.toast("画像準備中...", 2000);
    const bodyEl = document.body;
    bodyEl.classList.add('exporting');

    try{
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const canvas = await html2canvas(mapEl, {
        useCORS:true,
        allowTaint:false,
        backgroundColor:"#ffffff"
      });
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const ts = new Date();
      const timestamp = `${ts.getFullYear()}${String(ts.getMonth()+1).padStart(2,'0')}${String(ts.getDate()).padStart(2,'0')}_${String(ts.getHours()).padStart(2,'0')}${String(ts.getMinutes()).padStart(2,'0')}${String(ts.getSeconds()).padStart(2,'0')}`;
      const defaultName = `地理院地図標高_${timestamp}.png`;

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
    clearMarkers,
    getBaseLayer,
    getNextBaseLayerLabel,
    setBaseLayer,
    toggleBaseLayer,
    exportImage
  };
})();