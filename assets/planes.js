// assets/planes.js
// Precios, límites y pago de los planes desde el backend, que los lee de src/v1/planes.json.
// Lo usan precios.html e index.html.
//   - Cifras: <span data-plan="starter" data-campo="por_dia">5 000</span> → se reescriben con
//     GET /billing/plans en el formato del idioma de la página. Si el backend no responde, se quedan
//     las del HTML.
//   - Contratar: <button class="btn" type="button" data-pagar="starter"> → POST /billing/checkout
//     { plan, lang } → el backend crea el pago con el precio de planes.json y devuelve la URL de Stripe.
//     Círculo de carga hasta que abre Stripe; si falla, aviso bajo el botón.
//   - En localhost habla con el propio backend; en GitHub Pages, con thredds.b1tmet.com.
(function () {
  var API = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? location.origin : "https://thredds.b1tmet.com";
  var SEP = { es: " ", fr: " ", en: ",", pt: ".", it: ".", nl: "." };   // separador de miles, como en el HTML
  var T = {
    es: { err: "No se pudo abrir el pago. Inténtalo de nuevo en unos minutos.", rate: "Demasiados intentos. Inténtalo de nuevo más tarde." },
    en: { err: "Could not open the payment page. Try again in a few minutes.", rate: "Too many attempts. Try again later." },
    pt: { err: "Não foi possível abrir o pagamento. Tente novamente em alguns minutos.", rate: "Tentativas demais. Tente novamente mais tarde." },
    fr: { err: "Impossible d'ouvrir la page de paiement. Réessayez dans quelques minutes.", rate: "Trop de tentatives. Réessayez plus tard." },
    it: { err: "Impossibile aprire il pagamento. Riprova tra qualche minuto.", rate: "Troppi tentativi. Riprova più tardi." },
    nl: { err: "De betaalpagina kon niet worden geopend. Probeer het over een paar minuten opnieuw.", rate: "Te veel pogingen. Probeer het later opnieuw." }
  };
  var planes = null;

  function lang() { var l = document.documentElement.getAttribute("data-lang"); return T[l] ? l : "en"; }

  function num(n, l) {
    if (typeof n !== "number") return null;
    var s = Number.isInteger(n) ? String(n) : n.toFixed(2), dec = "";
    if (s.indexOf(".") >= 0) { dec = (l === "en" ? "." : ",") + s.split(".")[1]; s = s.split(".")[0]; }
    if (s.length > 3) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, SEP[l] || ",");
    return s + dec;
  }

  function cifras() {
    if (!planes) return;
    var l = lang();
    document.querySelectorAll("[data-plan][data-campo]").forEach(function (el) {
      var p = planes[el.getAttribute("data-plan")];
      var v = p && num(p[el.getAttribute("data-campo")], l);
      if (v !== null && v !== undefined) el.textContent = v;
    });
  }

  // ---------- Contratar ----------

  var css = document.createElement("style");
  css.textContent =
    ".btn.pl-busy{pointer-events:none;opacity:.85}" +
    ".btn.pl-busy::after{content:'';display:inline-block;width:.9em;height:.9em;margin-left:.5em;" +
    "vertical-align:-.12em;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;" +
    "animation:pl-giro .7s linear infinite}" +
    "@keyframes pl-giro{to{transform:rotate(360deg)}}" +
    "@media (prefers-reduced-motion:reduce){.btn.pl-busy::after{animation-duration:2s}}" +
    ".pl-err{margin:.6rem 0 0;font-size:.9em}";
  document.head.appendChild(css);

  function ocupado(b, si) {
    b.classList.toggle("pl-busy", si);
    b.disabled = si;
    if (si) b.setAttribute("aria-busy", "true"); else b.removeAttribute("aria-busy");
  }

  function quitarAvisos() {
    document.querySelectorAll(".pl-err").forEach(function (e) { e.remove(); });
  }

  function aviso(b, clave) {
    var p = document.createElement("p");
    p.className = "pl-err err";
    p.setAttribute("role", "alert");
    p.textContent = T[lang()][clave];
    b.insertAdjacentElement("afterend", p);
  }

  document.addEventListener("click", function (ev) {
    var b = ev.target.closest && ev.target.closest("[data-pagar]");
    if (!b || b.disabled) return;
    ev.preventDefault();
    quitarAvisos();
    ocupado(b, true);
    fetch(API + "/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: b.getAttribute("data-pagar"), lang: lang() }),
      cache: "no-store",
      credentials: "omit"
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, j: j }; });
    }).then(function (res) {
      if (res.status === 200 && res.j && /^https:\/\//.test(res.j.url || "")) {
        location.href = res.j.url;                       // el círculo sigue hasta que carga Stripe
        return;
      }
      ocupado(b, false);
      aviso(b, res.status === 429 ? "rate" : "err");
    }).catch(function () {
      ocupado(b, false);
      aviso(b, "err");
    });
  });

  // Al volver con «Atrás» desde Stripe, la página puede salir de la caché del navegador con el círculo puesto
  window.addEventListener("pageshow", function () {
    document.querySelectorAll(".btn.pl-busy").forEach(function (b) { ocupado(b, false); });
  });

  var s = document.getElementById("langsel");
  if (s) s.addEventListener("change", function () { cifras(); quitarAvisos(); });

  fetch(API + "/billing/plans", { headers: { Accept: "application/json" } })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (j) {
      planes = {};
      (j.planes || []).forEach(function (p) { planes[p.codigo] = p; });
      cifras();
    })
    .catch(function () { /* se quedan las cifras del HTML */ });
})();
