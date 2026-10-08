/* ==========================================
   ASSET AUDIT — DATA ENGINE (js/data-engine.js)
   Storage, Drafts, API Communication, Sync, History Cache
   ========================================== */

// 1. Storage & Memory Draft
(function (AA) {
  var KEY = "assetAudit.audits.v1";
  var memory = [];
  function createdOf(rec) { return rec.createdAt || rec.savedAt || ""; }
  function read() {
    try { var raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : []; }
    catch (e) { return memory; }
  }
  function write(list) {
    memory = list;
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; }
    catch (e) { return false; }
  }

  AA.storage = {
    list: function () {
      return read().slice().sort(function (a, b) { return createdOf(a) < createdOf(b) ? 1 : -1; });
    },
    get: function (id) {
      return read().filter(function (r) { return r.id === id || r.auditId === id; })[0] || null;
    },
    add: function (rec) {
      var list = read(); list.unshift(rec); write(list); return rec;
    },
    update: function (id, patch) {
      var list = read();
      var rec = list.filter(function (r) { return r.id === id; })[0];
      if (!rec) return null;
      for (var k in patch) { rec[k] = patch[k]; }
      write(list); return rec;
    }
  };

  var drafts = {};
  AA.draft = {
    reset: function (deviceId) {
      drafts[deviceId] = { deviceId: deviceId, step: 0, data: { info: { tanggal: AA.utils.todayISO() } } };
      return drafts[deviceId];
    },
    ensure: function (deviceId) { return drafts[deviceId] || this.reset(deviceId); },
    clear: function (deviceId) { delete drafts[deviceId]; }
  };
})(window.AssetAudit);

// 2. API & Row Mapping
(function (AA) {
  var MSG_FAIL = "Gagal menyimpan ke Spreadsheet. Data audit tetap tersimpan di perangkat ini.";
  var MSG_NOT_CONFIGURED = "Koneksi ke Spreadsheet belum diatur. Data audit tetap tersimpan di perangkat ini.";

  var LICENSE_COLUMNS = {
    windows:   { status: "windowsStatus",   extra: "windowsVersion", note: "windowsNote" },
    office:    { status: "officeStatus",    extra: "officeVersion",  note: "officeNote" },
    antivirus: { status: "antivirusStatus", extra: "antivirusName",  note: "antivirusNote" }
  };

  function isConfigured() {
    var url = AA.config.api && AA.config.api.API_URL;
    return !!url && url.indexOf("PASTE_") < 0;
  }

  function newAuditId(d) {
    d = d || new Date();
    var pad = function (n) { return String(n).padStart(2, "0"); };
    var ymd = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
    var rnd = Math.random().toString(36).substring(2, 8).toUpperCase();
    return "AUD-" + ymd + "-" + rnd;
  }

  function buildPayload(rec) {
    var data = rec.data || {};
    var info = data.info || {};
    var laptop = data.laptop || {};
    var spec = data.spec || {};
    var p = {
      auditId: rec.auditId || newAuditId(new Date(rec.createdAt)),
      assetId: info.assetId || rec.assetId || "",
      deviceType: rec.deviceLabel || rec.deviceType || "Laptop",
      auditor: info.auditor || rec.auditor || "",
      auditDate: info.tanggal || rec.tanggal || AA.utils.todayISO(),
      brand: laptop.brand || spec.brand || "",
      model: laptop.model || spec.model || "",
      serialNumber: laptop.serial || spec.serial || "",
      processor: spec.processor || "",
      ram: spec.ram || "",
      storage: spec.storage || "",
      operatingSystem: spec.os || "",
      gpu: spec.gpu || "",
      createdAt: rec.createdAt || new Date().toISOString()
    };
    var checklist = {};
    if (data.fisik) {
      Object.keys(data.fisik).forEach(function (k) {
        var v = data.fisik[k];
        checklist[k] = typeof v === "object" && v ? v.status || "" : String(v || "");
      });
    }
    p.checklistResult = checklist;
    if (data.lisensi) {
      Object.keys(LICENSE_COLUMNS).forEach(function (id) {
        var col = LICENSE_COLUMNS[id];
        var item = data.lisensi[id] || {};
        p[col.status] = item.status || "N/A";
        p[col.extra] = item.extra || "";
        p[col.note] = item.note || "";
      });
    }
    return p;
  }

  function send(rec) {
    if (!isConfigured()) return Promise.resolve({ ok: false, reason: "not-configured", message: MSG_NOT_CONFIGURED });
    var payload = buildPayload(rec);
    return fetch(AA.config.api.API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    }).then(function (res) { return res.json(); })
      .then(function (json) { return { ok: !!json.success, duplicate: !!json.duplicate, message: json.message }; })
      .catch(function () { return { ok: false, message: MSG_FAIL }; });
  }

  function fetchList() {
    if (!isConfigured()) return Promise.resolve({ ok: false, rows: [] });
    return fetch(AA.config.api.API_URL + "?action=list")
      .then(function (res) { return res.json(); })
      .then(function (json) { return { ok: !!json.success, rows: json.data || [] }; })
      .catch(function () { return { ok: false, rows: [] }; });
  }

  function fetchById(auditId) {
    if (!isConfigured()) return Promise.resolve({ ok: false, row: null });
    return fetch(AA.config.api.API_URL + "?action=get&auditId=" + encodeURIComponent(auditId))
      .then(function (res) { return res.json(); })
      .then(function (json) { return { ok: !!json.success, row: json.data || null }; })
      .catch(function () { return { ok: false, row: null }; });
  }

  AA.api = {
    isConfigured: isConfigured,
    newAuditId: newAuditId,
    send: send,
    fetchList: fetchList,
    fetchById: fetchById
  };
})(window.AssetAudit);

// 3. Sync Engine
(function (AA) {
  var running = false;
  function isSynced(rec) { return !!rec && rec.syncStatus === "synced"; }

  function push(id) {
    var rec = AA.storage.get(id);
    if (!rec) return Promise.resolve({ ok: false });
    if (!rec.auditId) {
      rec = AA.storage.update(id, { auditId: AA.api.newAuditId(new Date(rec.createdAt)) });
    }
    return AA.api.send(rec).then(function (res) {
      if (res.ok) AA.storage.update(id, { syncStatus: "synced" });
      else AA.storage.update(id, { syncStatus: "failed" });
      return res;
    });
  }

  function syncAll() {
    if (running || !AA.api.isConfigured() || !navigator.onLine) return Promise.resolve();
    var queue = AA.storage.list().filter(function (r) { return !isSynced(r); });
    if (!queue.length) return Promise.resolve();
    running = true;
    var chain = Promise.resolve();
    queue.forEach(function (r) {
      chain = chain.then(function () { return push(r.id); });
    });
    return chain.then(function () { running = false; }, function () { running = false; });
  }

  function startAuto() {
    syncAll();
    window.addEventListener("online", syncAll);
    setInterval(syncAll, 30000);
  }

  AA.sync = { isSynced: isSynced, push: push, syncAll: syncAll, startAuto: startAuto };
})(window.AssetAudit);

// 4. History Source
(function (AA) {
  var cache = [];
  function refresh() {
    return AA.api.fetchList().then(function (res) {
      if (res.ok) cache = res.rows;
      return res;
    });
  }
  function getRecord(id) {
    var local = AA.storage.get(id);
    if (local) return local;
    return cache.filter(function (r) { return r.auditId === id; })[0] || null;
  }
  AA.history = { refresh: refresh, getRecord: getRecord, fetchRecord: AA.api.fetchById };
})(window.AssetAudit);
