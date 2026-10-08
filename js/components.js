/* ==========================================
   ASSET AUDIT — UI COMPONENTS (js/components.js)
   StatCard, DataTable, ScoreCard, Review, Result, Wizard
   ========================================== */

(function (AA) {
  var esc = AA.utils.escapeHtml;

  // StatCard
  AA.components.statCard = function (opts) {
    var tone = opts.tone ? " stat-card--" + esc(opts.tone) : "";
    return '<div class="stat-card' + tone + '"><p class="stat-card__label">' + esc(opts.label) + '</p><p class="stat-card__value">' + esc(opts.value) + '</p></div>';
  };

  // DataTable
  AA.components.dataTable = function (columns, rows, opts) {
    opts = opts || {};
    var head = columns.map(function (c) { return '<th scope="col">' + esc(c.label) + '</th>'; }).join("");
    var body = rows.map(function (row) {
      var cells = columns.map(function (c) {
        var content = c.render ? c.render(row) : esc(row[c.key]);
        return '<td data-label="' + esc(c.label) + '">' + content + '</td>';
      }).join("");
      var href = opts.rowHref ? opts.rowHref(row) : "";
      var attrs = href ? ' class="is-clickable" data-href="' + esc(href) + '"' : "";
      return "<tr" + attrs + ">" + cells + "</tr>";
    }).join("");
    return '<div class="table-wrap"><table class="data-table"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>';
  };

  // ScoreCard
  AA.components.scoreCard = {
    render: function (result, opts) {
      var hero = opts && opts.hero ? " score-card--hero" : "";
      var val = result.rated ? result.scoreText : "—";
      return '<div class="score-card' + hero + '" data-tone="' + esc(result.tone) + '">' +
               '<div class="score-card__top"><div><p class="score-card__label">NILAI AUDIT</p><p class="score-card__value">' + esc(val) + '</p></div>' +
               '<p class="score-card__cond">' + esc(result.condition.toUpperCase()) + '</p></div>' +
               '<div class="score-bar"><span style="width:' + (result.rated ? result.score : 0) + '%"></span></div>' +
               '<p class="score-card__counts">OK: ' + result.ok + ' · Tidak OK: ' + result.notOk + ' · N/A: ' + result.na + '</p>' +
             '</div>';
    }
  };

  // Audit Wizard Component
  AA.components.auditWizard = function (container, def) {
    var draft = AA.draft.ensure(def.id);
    var stepIdx = draft.step || 0;

    function renderStep() {
      var isReview = stepIdx === def.steps.length;
      var html = '<div class="wizard"><div class="wizard-head"><h1>Audit ' + esc(def.label) + '</h1>';
      
      if (isReview) {
        var res = AA.scoring.evaluate(def, draft.data);
        html += '<p>Review hasil audit sebelum dikirim.</p></div>';
        html += AA.components.scoreCard.render(res, { hero: true });
        html += '<div class="wizard-actions"><button type="button" class="btn" id="btn-back">Edit Isian</button><button type="button" class="btn btn--primary" id="btn-submit">Submit Audit</button></div></div>';
      } else {
        var step = def.steps[stepIdx];
        html += '<p>Langkah ' + (stepIdx + 1) + ' dari ' + def.steps.length + ': ' + esc(step.title) + '</p></div>';
        
        step.sections.forEach(function (sec) {
          html += '<section class="card"><h2>' + esc(sec.title) + '</h2>';
          if (sec.type === "fields") {
            sec.fields.forEach(function (f) {
              var val = (draft.data[sec.id] && draft.data[sec.id][f.id]) || "";
              html += '<div class="field"><label>' + esc(f.label) + '</label><input type="text" data-sec="' + sec.id + '" data-field="' + f.id + '" value="' + esc(val) + '" placeholder="' + esc(f.placeholder || "") + '"></div>';
            });
          } else if (sec.type === "checklist" || sec.type === "license") {
            sec.items.forEach(function (item) {
              var entry = (draft.data[sec.id] && draft.data[sec.id][item.id]) || { status: "" };
              var st = typeof entry === "object" ? entry.status : entry;
              html += '<div class="checklist-item"><p>' + esc(item.label) + '</p><div class="status-options">';
              ["OK", "Tidak OK", "N/A"].forEach(function (s) {
                var chk = st === s ? " checked" : "";
                html += '<label><input type="radio" name="' + sec.id + '_' + item.id + '" value="' + s + '" data-sec="' + sec.id + '" data-item="' + item.id + '"' + chk + '> ' + s + '</label>';
              });
              html += '</div></div>';
            });
          }
          html += '</section>';
        });

        html += '<div class="wizard-actions">';
        if (stepIdx > 0) html += '<button type="button" class="btn" id="btn-back">Kembali</button>';
        html += '<button type="button" class="btn btn--primary" id="btn-next">' + (stepIdx === def.steps.length - 1 ? "Review Audit" : "Lanjut") + '</button></div></div>';
      }

      container.innerHTML = html;

      // Event Listeners
      container.querySelectorAll('input[type="text"]').forEach(function (inp) {
        inp.addEventListener("input", function () {
          var sec = inp.getAttribute("data-sec"), field = inp.getAttribute("data-field");
          draft.data[sec] = draft.data[sec] || {};
          draft.data[sec][field] = inp.value;
        });
      });

      container.querySelectorAll('input[type="radio"]').forEach(function (rad) {
        rad.addEventListener("change", function () {
          var sec = rad.getAttribute("data-sec"), item = rad.getAttribute("data-item");
          draft.data[sec] = draft.data[sec] || {};
          draft.data[sec][item] = { status: rad.value };
        });
      });

      var btnNext = container.querySelector("#btn-next");
      if (btnNext) btnNext.addEventListener("click", function () { stepIdx++; draft.step = stepIdx; renderStep(); });

      var btnBack = container.querySelector("#btn-back");
      if (btnBack) btnBack.addEventListener("click", function () { stepIdx--; draft.step = stepIdx; renderStep(); });

      var btnSubmit = container.querySelector("#btn-submit");
      if (btnSubmit) btnSubmit.addEventListener("click", function () {
        var res = AA.scoring.evaluate(def, draft.data);
        var rec = {
          id: "AUD-" + Date.now(),
          auditId: AA.api.newAuditId(),
          deviceType: def.id,
          deviceLabel: def.label,
          data: draft.data,
          scoring: res,
          createdAt: new Date().toISOString(),
          syncStatus: "pending"
        };
        AA.storage.add(rec);
        AA.draft.clear(def.id);
        AA.sync.push(rec.id).then(function () {
          location.hash = "#/audit-selesai/" + rec.id;
        });
      });
    }

    renderStep();
  };

  // Result Component
  AA.components.auditResult = {
    mount: function (container, id) {
      var rec = AA.history.getRecord(id);
      if (!rec) { container.innerHTML = '<p class="notice">Audit tidak ditemukan.</p>'; return; }
      var res = rec.scoring || AA.scoring.forRecord(rec);
      container.innerHTML =
        '<div class="page-head"><h1>Hasil Audit</h1><p>ID: ' + esc(rec.auditId || rec.id) + '</p></div>' +
        AA.components.scoreCard.render(res, { hero: true }) +
        '<div class="section-action"><a class="btn btn--block" href="#/riwayat">Kembali ke Riwayat</a></div>';
    }
  };
})(window.AssetAudit);
