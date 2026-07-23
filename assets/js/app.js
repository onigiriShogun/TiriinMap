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

  function wire(){
    MapApp.initMap();

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

    syncMapToggleButton();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', wire);
  }else{
    wire();
  }
})();