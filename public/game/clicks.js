/* Scale the Unity canvas visually, but never let Unity see scaled mouse
 * coordinates. Unity 2019 uGUI does `clientX - canvas.getBoundingClientRect().left`
 * and treats that as a 996×666 pixel. CSS transform/zoom/width all break that.
 *
 * Hit layer sits on the *visible* scaled frame. We convert the pointer into
 * game pixels (0–996, 0–666) and dispatch a mouse event at
 *   canvasRect.left + gameX
 * so Unity's subtraction yields gameX.
 */
(function () {
  var W = 996;
  var H = 666;

  function canvasEl() {
    return document.querySelector("#unityContainer canvas");
  }

  function gameFromEvent(e) {
    var hit = document.getElementById("st-hit");
    var r = hit.getBoundingClientRect();
    var x = ((e.clientX - r.left) / r.width) * W;
    var y = ((e.clientY - r.top) / r.height) * H;
    if (x < 0) x = 0;
    if (y < 0) y = 0;
    if (x > W) x = W;
    if (y > H) y = H;
    return { x: x, y: y };
  }

  function send(type, e) {
    var canvas = canvasEl();
    if (!canvas) return;
    var g = gameFromEvent(e);
    var cr = canvas.getBoundingClientRect();
    var clientX = cr.left + g.x;
    var clientY = cr.top + g.y;
    var ev = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      view: window,
      detail: type === "mousedown" ? 1 : 0,
      clientX: clientX,
      clientY: clientY,
      screenX: e.screenX,
      screenY: e.screenY,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      shiftKey: e.shiftKey,
      metaKey: e.metaKey,
      button: e.button || 0,
      buttons: e.buttons || (type === "mouseup" ? 0 : 1)
    });
    canvas.dispatchEvent(ev);
    window.__stLastClick = {
      type: type,
      gameX: g.x,
      gameY: g.y,
      unityX: clientX - cr.left,
      unityY: clientY - cr.top,
      scale: cr.width / W
    };
  }

  window.stFitGame = function () {
    var frame = document.getElementById("st-frame");
    var box = document.getElementById("unityContainer");
    if (!frame || !box) return;
    var s = Math.min(window.innerWidth / W, window.innerHeight / H);
    if (!isFinite(s) || s <= 0) s = 1;
    frame.style.width = W * s + "px";
    frame.style.height = H * s + "px";
    box.style.transform = "scale(" + s + ")";
  };

  function bindHit() {
    var hit = document.getElementById("st-hit");
    if (!hit || hit.__stBound) return;
    hit.__stBound = true;
    var map = {
      pointerdown: "mousedown",
      pointermove: "mousemove",
      pointerup: "mouseup"
    };
    Object.keys(map).forEach(function (src) {
      hit.addEventListener(
        src,
        function (e) {
          e.preventDefault();
          e.stopPropagation();
          send(map[src], e);
        },
        { capture: true, passive: false }
      );
    });
    hit.addEventListener(
      "wheel",
      function (e) {
        var canvas = canvasEl();
        if (!canvas) return;
        e.preventDefault();
        e.stopPropagation();
        var g = gameFromEvent(e);
        var cr = canvas.getBoundingClientRect();
        var wev = new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: cr.left + g.x,
          clientY: cr.top + g.y,
          deltaX: e.deltaX,
          deltaY: e.deltaY,
          deltaMode: e.deltaMode
        });
        canvas.dispatchEvent(wev);
      },
      { capture: true, passive: false }
    );
    hit.addEventListener("contextmenu", function (e) {
      e.preventDefault();
    });
  }

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  ready(function () {
    bindHit();
    window.stFitGame();
    window.addEventListener("resize", window.stFitGame);
  });
})();
