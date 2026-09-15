/* Unity 2019 uGUI uses clientX - getBoundingClientRect() and does NOT
 * divide by canvas.width/rect.width. CSS transform: scale() therefore
 * shifts every click. Keep the game 1:1 unless the window is smaller,
 * and remap mouse events when a scale is still applied (browser zoom).
 */
(function () {
  var W = 996;
  var H = 666;

  function canvasEl() {
    return document.querySelector("#unityContainer canvas");
  }

  function remap(e) {
    var canvas = canvasEl();
    if (!canvas || !canvas.width || e.__stRemapped) return e;
    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return e;
    var sx = canvas.width / rect.width;
    var sy = canvas.height / rect.height;
    if (Math.abs(sx - 1) < 0.002 && Math.abs(sy - 1) < 0.002) return e;
    var cx = rect.left + (e.clientX - rect.left) * sx;
    var cy = rect.top + (e.clientY - rect.top) * sy;
    var ne = new MouseEvent(e.type, {
      bubbles: e.bubbles,
      cancelable: e.cancelable,
      composed: e.composed,
      view: e.view,
      detail: e.detail,
      screenX: e.screenX,
      screenY: e.screenY,
      clientX: cx,
      clientY: cy,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      shiftKey: e.shiftKey,
      metaKey: e.metaKey,
      button: e.button,
      buttons: e.buttons,
      relatedTarget: e.relatedTarget
    });
    ne.__stRemapped = true;
    return ne;
  }

  var orig = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (typeof listener === "function" && /^(mouse|pointer)/.test(type)) {
      var wrapped = function (e) {
        return listener.call(this, remap(e));
      };
      wrapped.__stOrig = listener;
      return orig.call(this, type, wrapped, options);
    }
    return orig.call(this, type, listener, options);
  };

  window.stFitGame = function () {
    var el = document.getElementById("unityContainer");
    if (!el) return;
    var s = Math.min(1, window.innerWidth / W, window.innerHeight / H);
    el.style.transform = s < 0.999 ? "scale(" + s + ")" : "none";
  };
})();
