/* Unity 2019 has two mouse paths:
 *   fillMouseEventData:  clientX - rect.left                  (NO scale)
 *   calculateMouseEvent: (pageX - scroll - rect.left) * (cw / rect.width)
 * CSS transform makes those disagree. Fake the canvas rect as 996×666 at the
 * visual origin, and rewrite clientX/pageX into that space so BOTH equal
 * game pixels.
 */
(function () {
  var W = 996;
  var H = 666;
  var origBCR = Element.prototype.getBoundingClientRect;

  function canvasEl() {
    return document.querySelector("#unityContainer canvas");
  }

  function visualRect(el) {
    return origBCR.call(el);
  }

  Element.prototype.getBoundingClientRect = function () {
    var r = origBCR.call(this);
    var canvas = canvasEl();
    if (!canvas || this !== canvas) return r;
    var gw = canvas.width >= 500 ? canvas.width : W;
    var gh = canvas.height >= 400 ? canvas.height : H;
    return new DOMRect(r.left, r.top, gw, gh);

  };

  function remapEvent(e, canvas) {
    var visual = visualRect(canvas);
    if (!visual.width || !visual.height) return false;
    var sx = (canvas.width>=500?canvas.width:W) / visual.width;
    var sy = (canvas.height>=400?canvas.height:H) / visual.height;
    var nx = visual.left + (e.clientX - visual.left) * sx;
    var ny = visual.top + (e.clientY - visual.top) * sy;
    var npx = nx + (window.scrollX || 0);
    var npy = ny + (window.scrollY || 0);
    try {
      Object.defineProperty(e, "clientX", { get: function () { return nx; }, configurable: true });
      Object.defineProperty(e, "clientY", { get: function () { return ny; }, configurable: true });
      Object.defineProperty(e, "pageX", { get: function () { return npx; }, configurable: true });
      Object.defineProperty(e, "pageY", { get: function () { return npy; }, configurable: true });
      e.__stFixed = true;
      record(e, canvas, sx);
      return true;
    } catch (err) {
      return { nx: nx, ny: ny, npx: npx, npy: npy, sx: sx, sy: sy };
    }
  }

  function record(e, canvas, sx) {
    var r = canvas.getBoundingClientRect();
    var fillX = e.clientX - r.left;
    var fillY = e.clientY - r.top;
    var calcX = fillX * ((canvas.width>=500?canvas.width:W) / (r.width || 1));
    var calcY = fillY * ((canvas.height>=400?canvas.height:H) / (r.height || 1));
    window.__stLastClick = {
      fillX: fillX,
      fillY: fillY,
      calcX: calcX,
      calcY: calcY,
      scale: sx,
      rectW: r.width,
      canvasW: canvas.width
    };
  }

  function intercept(e) {
    if (e.__stFixed) return;
    var canvas = canvasEl();
    if (!canvas) return;
    var t = e.target;
    if (t !== canvas && !(t && t.closest && t.closest("#unityContainer"))) return;
    var visual = visualRect(canvas);
    var sx = (canvas.width>=500?canvas.width:W) / (visual.width || 1);
    if (Math.abs(sx - 1) < 0.002 && Math.abs((canvas.height>=400?canvas.height:H) / (visual.height || 1) - 1) < 0.002) {
      record(e, canvas, 1);
      return;
    }
    var mapped = remapEvent(e, canvas);
    if (mapped === true) return;
    if (!mapped) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    var init = {
      bubbles: true,
      cancelable: true,
      view: window,
      detail: e.detail || 0,
      clientX: mapped.nx,
      clientY: mapped.ny,
      screenX: e.screenX,
      screenY: e.screenY,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      shiftKey: e.shiftKey,
      metaKey: e.metaKey,
      button: e.button || 0,
      buttons: e.buttons || 0
    };
    var ne;
    if (e.type === "wheel" && typeof WheelEvent === "function") {
      ne = new WheelEvent("wheel", Object.assign({}, init, { deltaX: e.deltaX, deltaY: e.deltaY, deltaMode: e.deltaMode }));
    } else {
      ne = new MouseEvent(e.type, init);
    }
    ne.__stFixed = true;
    record(ne, canvas, mapped.sx);
    canvas.dispatchEvent(ne);
  }

  ["mousedown", "mouseup", "mousemove", "click", "dblclick", "wheel", "contextmenu"].forEach(function (type) {
    window.addEventListener(type, intercept, true);
  });

  window.stFitGame = function () {
    var box = document.getElementById("unityContainer");
    if (!box) return;
    var s = Math.min(window.innerWidth / W, window.innerHeight / H);
    if (!isFinite(s) || s <= 0) s = 1;
    box.style.transform = s === 1 ? "none" : "scale(" + s + ")";
  };

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }
  ready(function () {
    window.stFitGame();
    window.addEventListener("resize", window.stFitGame);
  });
})();
