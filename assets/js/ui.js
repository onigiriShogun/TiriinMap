// assets/js/ui.js
(function(){
  "use strict";

  function toast(msg, ms=2200){
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(()=>t.classList.remove('show'), ms);
  }

  // 「丸めない」＝切り捨てで小数第2位表示
  function format2NoRound(n){
    const v = Math.trunc(n * 100) / 100;
    return v.toFixed(2);
  }

  window.UI = {
    toast,
    format2NoRound
  };
})();