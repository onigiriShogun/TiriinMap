// assets/js/app.js
(function(){
  "use strict";

  function setButtonLabel(button, text){
    const label = button?.querySelector('.btn__label');
    if(label){
      label.textContent = text;
    }else if(button){
      button.textContent = text;
    }
  }

  function syncMapToggleButton(){
    const btn = document.getElementById('btnMapToggle');
    if(!btn) return;
    const label = MapApp.getNextBaseLayerLabel();
    setButtonLabel(btn, label);
    btn.setAttribute('aria-label', label);
  }

  function syncMeasureButton(){
    const btn = document.getElementById('btnMeasure');
    const on = MapApp.isMeasureOn();
    if(on){
      setButtonLabel(btn, "標高計測END");
      btn.classList.remove('measure-off');
      btn.classList.add('measure-on');
      setHint("クリック地点の標高を地理院地図から取得します");
    }else{
      setButtonLabel(btn, "標高計測START");
      btn.classList.remove('measure-on');
      btn.classList.add('measure-off');
      setHint("クリック地点の標高を地理院地図から取得します");
    }
  }

  function setHint(text){
    const el = document.getElementById('hintLine');
    if(el) el.textContent = text || "";
  }

  function wire(){
    MapApp.initMap();

    document.getElementById('btnMeasure').addEventListener('click', ()=>{
      const next = !MapApp.isMeasureOn();
      MapApp.setMeasure(next);
      syncMeasureButton();
    });

    document.getElementById('btnClear').addEventListener('click', ()=>{
      MapApp.clearMarkers();
    });

    document.getElementById('btnExport').addEventListener('click', ()=>{
      MapApp.exportImage();
    });

    document.getElementById('btnMapToggle').addEventListener('click', ()=>{
      MapApp.toggleBaseLayer();
      syncMapToggleButton();
    });

    MapApp.setMeasure(false);
    syncMeasureButton();
    syncMapToggleButton();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', wire);
  }else{
    wire();
  }
})();
