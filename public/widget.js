/**
 * LeapCreww embeddable WhatsApp chat button.
 *
 * Usage (one line, anywhere in the page):
 *   <script src="https://<your-leapcreww-host>/widget.js" data-wf="wfw_..." async></script>
 *
 * The script derives the API base from its own src, fetches the org's public
 * widget config, renders a floating button (+ optional greeting bubble), and
 * deep-links to wa.me with the configured prefilled message. Clicks are
 * counted via a bodyless beacon. No cookies, no tracking, no dependencies.
 */
(function () {
  "use strict";

  var script = document.currentScript;
  if (!script) return;
  var key = script.getAttribute("data-wf");
  if (!key) return;
  var base = new URL(script.src).origin;

  // Re-running (e.g. SPA re-injection) must not duplicate the button.
  if (document.getElementById("leapcreww-widget")) return;

  var WA_ICON =
    '<svg viewBox="0 0 24 24" width="28" height="28" fill="#fff" aria-hidden="true">' +
    '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>' +
    '<path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.387 0-4.594-.818-6.34-2.192l-.442-.352-3.25 1.09 1.09-3.25-.352-.442A9.935 9.935 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>';

  function el(tag, styles, html) {
    var node = document.createElement(tag);
    for (var k in styles) node.style[k] = styles[k];
    if (html) node.innerHTML = html;
    return node;
  }

  function render(cfg) {
    if (!cfg || !cfg.enabled || !cfg.phoneNumber) return;

    var right = cfg.position !== "bottom-left";
    var dismissKey = "leapcreww-greeting-dismissed-" + key;

    var root = el("div", {
      position: "fixed",
      bottom: "20px",
      zIndex: "2147483000",
      display: "flex",
      flexDirection: "column",
      alignItems: right ? "flex-end" : "flex-start",
      gap: "10px",
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    });
    root.id = "leapcreww-widget";
    root.style[right ? "right" : "left"] = "20px";

    function openChat() {
      // Fire-and-forget click beacon; never block the chat from opening.
      try {
        fetch(base + "/api/widget/" + encodeURIComponent(key) + "/click", {
          method: "POST",
          keepalive: true,
        });
      } catch {
        /* beacon is best-effort */
      }
      // Append attribution marker so the server can tag widget-originated contacts.
      var prefill = (cfg.prefilledText || "") + (key ? "\n[ref:" + key + "]" : "");
      window.open(
        "https://wa.me/" + cfg.phoneNumber + "?text=" + encodeURIComponent(prefill),
        "_blank",
        "noopener"
      );
    }

    // Greeting bubble (dismissible, remembered per browser).
    if (cfg.showGreeting && cfg.greeting && !localStorage.getItem(dismissKey)) {
      var bubble = el("div", {
        maxWidth: "260px",
        background: "#fff",
        color: "#1c1917",
        borderRadius: "14px",
        boxShadow: "0 4px 24px rgba(0,0,0,.16)",
        padding: "12px 14px",
        fontSize: "13px",
        lineHeight: "1.45",
        cursor: "pointer",
        position: "relative",
        opacity: "0",
        transform: "translateY(6px)",
        transition: "opacity .25s ease, transform .25s ease",
      });
      bubble.setAttribute("role", "button");
      bubble.innerHTML =
        '<div style="font-weight:700;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#78716c;margin-bottom:4px;"></div><div></div>';
      bubble.children[0].textContent = cfg.brandName || "Chat with us";
      bubble.children[1].textContent = cfg.greeting;

      var close = el(
        "button",
        {
          position: "absolute",
          top: "-8px",
          right: "-8px",
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          border: "none",
          background: "#1c1917",
          color: "#fff",
          fontSize: "11px",
          lineHeight: "20px",
          cursor: "pointer",
          padding: "0",
        },
        "&times;"
      );
      close.setAttribute("aria-label", "Dismiss");
      close.addEventListener("click", function (e) {
        e.stopPropagation();
        localStorage.setItem(dismissKey, "1");
        bubble.remove();
      });
      bubble.appendChild(close);
      bubble.addEventListener("click", openChat);
      root.appendChild(bubble);
      setTimeout(function () {
        bubble.style.opacity = "1";
        bubble.style.transform = "translateY(0)";
      }, 900);
    }

    var button = el(
      "button",
      {
        width: "56px",
        height: "56px",
        borderRadius: "50%",
        border: "none",
        background: cfg.color || "#25D366",
        boxShadow: "0 4px 16px rgba(0,0,0,.24)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "transform .15s ease",
        padding: "0",
      },
      WA_ICON
    );
    button.setAttribute("aria-label", "Chat on WhatsApp");
    button.addEventListener("mouseenter", function () {
      button.style.transform = "scale(1.08)";
    });
    button.addEventListener("mouseleave", function () {
      button.style.transform = "scale(1)";
    });
    button.addEventListener("click", openChat);
    root.appendChild(button);

    document.body.appendChild(root);
  }

  fetch(base + "/api/widget/" + encodeURIComponent(key) + "/config")
    .then(function (res) {
      return res.ok ? res.json() : null;
    })
    .then(render)
    .catch(function () {
      /* config unavailable — render nothing */
    });
})();
