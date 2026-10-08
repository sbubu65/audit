/* ==========================================
   ASSET AUDIT — PAGES & INITIALIZATION (js/pages.js)
   Dashboard, Start Audit, History, Audit Pages, App Entry
   ========================================== */

(function (AA) {
  var esc = AA.utils.escapeHtml;

  // 1. Dashboard Page
  AA.pages["dashboard"] = {
    title: "Dashboard",
    render: function (container) {
      var list = AA.storage.list();
      var total = list.length;
      var sumScore = 0, ratedCount = 0;
      list.forEach(function (r) {
        var s = r.scoring || AA.scoring.forRecord(r);
        if (s && s.rated) { sumScore += s.score; ratedCount++; }
      });
      var avg = ratedCount > 0 ? sumScore / ratedCount : "—";

      container.innerHTML =
        '<div class="page-head"><h1>Dashboard</h1><p>Ringkasan audit perangkat perusahaan.</p></div>' +
        '<div class="stat-grid">' +
          AA.components.statCard({ label: "Total Audit", value: total }) +
          AA.components.statCard({ label: "Rata-rata Nilai", value: AA.scoring.formatPercent(avg) }) +
        '</div>' +
        '<div class="section-action" style="margin-top:20px"><a class="btn btn--block" href="#/mulai-audit">Mulai Audit</a></div>';
    }
  };

  // 2. Mulai Audit Page
  AA.pages["mulai-audit"] = {
    title: "Mulai Audit",
    render: function (container) {
      var options = AA.config.deviceTypes.map(function (d) {
        return '<label class="device-option"><input type="radio" name="device-type" value="' + esc(d.id) + '"> ' + esc(d.label) + '</label>';
      }).join("");

      container.innerHTML =
        '<div class="page-head"><h1>Mulai Audit</h1><p>Pilih jenis perangkat.</p></div>' +
        '<div class="device-grid">' + options + '</div>' +
        '<div class="start-action" style="margin-top:20px"><button type="button" class="btn btn--block" id="start-btn" disabled>Mulai Audit</button></div>';

      var btn = container.querySelector("#start-btn");
      var selected = null;
      container.querySelectorAll('input[name="device-type"]').forEach(function (inp) {
        inp.addEventListener("change", function () {
          selected = AA.config.deviceTypes.filter(function (d) { return d.id === inp.value; })[0];
          btn.disabled = false;
        });
      });

      btn.addEventListener("click", function () {
        if (!selected || !selected.auditRoute) { alert("Audit untuk jenis perangkat ini belum tersedia."); return; }
        AA.draft.reset(selected.id);
        location.hash = "#/" + selected.auditRoute;
      });
    }
  };

  // 3. Riwayat Page
  AA.pages["riwayat"] = {
    title: "Riwayat Audit",
    render: function (container) {
      var rows = AA.storage.list();
var cols = [
        { key: "auditId", label: "ID Audit" },
        { key: "deviceLabel", label: "Device" },
        { 
          key: "createdAt", 
          label: "Tanggal", 
          render: function (r) { 
            // Tambahkan fallback jika createdAt kosong
            var dateStr = r.createdAt || r.savedAt || r.tanggal || ""; 
            return dateStr ? AA.utils.formatDateID(dateStr.substring(0, 10)) : "-"; 
          } 
        },
        { key: "syncStatus", label: "Status", render: function (r) { return AA.sync.isSynced(r) ? "Tersinkron" : "Belum Sinkron"; } }
      ];
      container.innerHTML =
        '<div class="page-head"><h1>Riwayat Audit</h1></div>' +
        AA.components.dataTable(cols, rows, { rowHref: function (r) { return "#/hasil-audit/" + r.id; } });
      
      container.querySelectorAll("tr[data-href]").forEach(function (tr) {
        tr.addEventListener("click", function () { location.hash = tr.getAttribute("data-href"); });
      });
    }
  };

  // 4. Audit Pages
  AA.pages["audit-laptop"] = { title: "Audit Laptop", render: function (c) { AA.components.auditWizard(c, AA.auditDefs.laptop); } };
  AA.pages["audit-tablet"] = { title: "Audit Tablet", render: function (c) { AA.components.auditWizard(c, AA.auditDefs.tablet); } };
  AA.pages["audit-selesai"] = { title: "Audit Selesai", render: function (c, ctx) { AA.components.auditResult.mount(c, ctx.param); } };
  AA.pages["hasil-audit"] = { title: "Detail Audit", render: function (c, ctx) { AA.components.auditResult.mount(c, ctx.param); } };
})(window.AssetAudit);

// ==========================================
// INITIALIZATION (App Entry)
// ==========================================
document.addEventListener("DOMContentLoaded", function () {
  var AA = window.AssetAudit;
  document.getElementById("app-name").textContent = AA.config.appName;
  document.getElementById("app-version").textContent = AA.config.version;
  
  AA.router.start(document.getElementById("app"), document.getElementById("main-nav"));
  AA.sync.startAuto();
});
