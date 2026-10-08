/* ==========================================
   ASSET AUDIT — CORE (js/core.js)
   Config, Version, Utilities, Scoring, Icons, Router
   ========================================== */

// 1. Namespace & Config
window.AssetAudit = {
  config: {
    appName: "Asset Audit",
    version: "V0.8",
    defaultRoute: "dashboard",
    api: {
      API_URL: "https://script.google.com/macros/s/AKfycbyXaf04tKSXxVC3pHwNz3lvwSqI97fZcpzBy4Vdo-Gi3pqNG5ygmvKXtpmEvH9ijN6-/exec",
      timeoutMs: 20000
    },
    routes: [
      { id: "dashboard",    label: "Dashboard",      icon: "dashboard" },
      { id: "mulai-audit",  label: "Mulai Audit",    icon: "audit" },
      { id: "riwayat",      label: "Riwayat Audit",  icon: "history" },
      { id: "audit-laptop", label: "Audit Laptop",   hidden: true, navParent: "mulai-audit" },
      { id: "audit-tablet", label: "Audit Tablet",   hidden: true, navParent: "mulai-audit" },
      { id: "audit-selesai", label: "Audit Selesai", hidden: true, navParent: "mulai-audit" },
      { id: "hasil-audit",   label: "Detail Hasil Audit", hidden: true, navParent: "riwayat" }
    ],
    deviceTypes: [
      { id: "laptop",     label: "Laptop",     icon: "laptop",     auditRoute: "audit-laptop" },
      { id: "smartphone", label: "Smartphone", icon: "smartphone" },
      { id: "tablet",     label: "Tablet",     icon: "tablet",     auditRoute: "audit-tablet" },
      { id: "imac",       label: "iMac",       icon: "imac" }
    ]
  },
  utils: {},
  components: {},
  auditDefs: {},
  pages: {},
  data: {}
};

// 2. DOM Utilities
window.AssetAudit.utils.escapeHtml = function (value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

// 3. Date Utilities
(function (AA) {
  AA.utils.todayISO = function () {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  };
  AA.utils.formatDateID = function (iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    return m ? m[3] + "/" + m[2] + "/" + m[1] : (iso || "");
  };
})(window.AssetAudit);

// 4. Scoring Utility
(function (AA) {
  var CATEGORIES = [
    { min: 80, label: "Baik",         tone: "baik" },
    { min: 60, label: "Cukup",        tone: "cukup" },
    { min: 40, label: "Rusak Ringan", tone: "ringan" },
    { min: 0,  label: "Rusak Berat",  tone: "berat" }
  ];
  var UNRATED = { label: "Belum dapat dinilai", tone: "unrated" };

  function categoryByCounts(ok, counted) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (ok * 100 >= CATEGORIES[i].min * counted) return CATEGORIES[i];
    }
    return CATEGORIES[CATEGORIES.length - 1];
  }

  function categoryByHundredths(h) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (h >= CATEGORIES[i].min * 100) return CATEGORIES[i];
    }
    return CATEGORIES[CATEGORIES.length - 1];
  }

  function formatPercent(val) {
    if (val == null || val === UNRATED.label) return "—";
    return typeof val === "number" ? val.toFixed(2) + "%" : String(val);
  }

  function calculate(ok, notOk, na, unanswered) {
    ok = ok || 0; notOk = notOk || 0; na = na || 0; unanswered = unanswered || 0;
    var counted = ok + notOk;
    var total = counted + na + unanswered;
    if (counted === 0) {
      return { rated: false, score: null, scoreText: UNRATED.label, condition: UNRATED.label, tone: UNRATED.tone, total: total, ok: ok, notOk: notOk, na: na, counted: counted, unanswered: unanswered };
    }
    var exact = (ok * 10000) / counted;
    var h = Math.round(exact);
    var cat = categoryByCounts(ok, counted);
    if (categoryByHundredths(h) !== cat) h = Math.floor(exact);
    var score = h / 100;
    return { rated: true, score: score, scoreText: score.toFixed(2) + "%", condition: cat.label, tone: cat.tone, total: total, ok: ok, notOk: notOk, na: na, counted: counted, unanswered: unanswered };
  }

  function eachScoredItem(def, data, fn) {
    if (!def || !def.steps) return;
    def.steps.forEach(function (step) {
      step.sections.forEach(function (sec) {
        if (!sec.scored) return;
        var secData = (data && data[sec.id]) || {};
        (sec.items || []).forEach(function (item) {
          var entry = secData[item.id];
          fn(sec, item, typeof entry === "object" && entry ? entry : { status: entry || "" });
        });
      });
    });
  }

  function evaluate(def, data) {
    var ok = 0, notOk = 0, na = 0, unanswered = 0;
    eachScoredItem(def, data, function (sec, item, entry) {
      if (entry.status === "OK") ok++;
      else if (entry.status === "Tidak OK") notOk++;
      else if (entry.status === "N/A") na++;
      else unanswered++;
    });
    return calculate(ok, notOk, na, unanswered);
  }

  function listByStatus(def, data, status) {
    var out = [];
    eachScoredItem(def, data, function (sec, item, entry) {
      if (entry.status !== status) return;
      out.push({ label: item.label, section: sec.title, note: status === "Tidak OK" ? String(entry.note || "").trim() : "" });
    });
    return out;
  }

  function forRecord(rec) {
    var s = rec && rec.scoring;
    if (s && typeof s.ok === "number") return calculate(s.ok, s.notOk, s.na, 0);
    var def = rec && AA.auditDefs && AA.auditDefs[rec.deviceType];
    return def ? evaluate(def, rec.data) : calculate(0, 0, 0, 0);
  }

  AA.scoring = {
    categories: CATEGORIES,
    unratedLabel: UNRATED.label,
    formatPercent: formatPercent,
    calculate: calculate,
    evaluate: evaluate,
    listByStatus: listByStatus,
    forRecord: forRecord
  };
})(window.AssetAudit);

// 5. Icons Component
(function (AA) {
  var paths = {
    dashboard:  '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    audit:      '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    history:    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    laptop:     '<rect x="4" y="5" width="16" height="11" rx="2"/><path d="M2 20h20"/>',
    smartphone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    tablet:     '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M11 18h2"/>',
    imac:       '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>'
  };
  AA.components.icon = function (name) {
    var p = paths[name] || paths.laptop;
    return '<svg class="icon icon--' + AA.utils.escapeHtml(name) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  };
})(window.AssetAudit);

// 6. Router
(function (AA) {
  var container, nav;
  function parseHash() {
    var parts = location.hash.replace(/^#\/?/, "").split("/");
    var id = parts[0];
    var known = AA.config.routes.some(function (r) { return r.id === id; });
    return known ? { id: id, param: parts[1] || null } : { id: AA.config.defaultRoute, param: null };
  }
  function findRoute(id) {
    return AA.config.routes.filter(function (r) { return r.id === id; })[0];
  }
  function renderNav(activeId) {
    var active = findRoute(activeId);
    var activeMenu = active.navParent || active.id;
    nav.innerHTML = AA.config.routes.filter(function (r) { return !r.hidden; }).map(function (r) {
      var current = r.id === activeMenu ? ' aria-current="page"' : "";
      return '<a class="nav__link" href="#/' + r.id + '"' + current + '>' +
               AA.components.icon(r.icon) + '<span>' + r.label + '</span></a>';
    }).join("");
  }
  function navigate(keepScroll) {
    var route = parseHash();
    var page = AA.pages[route.id];
    if (!page) return;
    renderNav(route.id);
    page.render(container, { param: route.param });
    document.title = page.title + " · " + AA.config.appName + " " + AA.config.version;
    if (keepScroll !== true) window.scrollTo(0, 0);
  }

  AA.router = {
    start: function (c, n) {
      container = c; nav = n;
      window.addEventListener("hashchange", function () { navigate(false); });
      navigate(false);
    },
    refresh: function () { navigate(true); }
  };
})(window.AssetAudit);
