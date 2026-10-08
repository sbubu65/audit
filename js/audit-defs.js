/* ==========================================
   ASSET AUDIT — AUDIT DEFINITIONS (js/audit-defs.js)
   Common Helpers, Laptop, Smartphone, Tablet (V0.8)
   ========================================== */

(function (AA) {
  AA.auditDefs.makeInfoSection = function (example) {
    return {
      id: "info",
      title: "Informasi Audit",
      type: "fields",
      fields: [
        { id: "assetId", label: "Asset ID", placeholder: "Contoh: " + example, required: true },
        { id: "auditor", label: "Nama Auditor", placeholder: "Contoh: Budi", required: true },
        { id: "tanggal", label: "Tanggal Audit", type: "date", required: true }
      ]
    };
  };

  // 1. Laptop Definition
  AA.auditDefs.laptop = {
    id: "laptop", label: "Laptop",
    steps: [
      { id: "identitas", title: "Identitas", sections: [
        AA.auditDefs.makeInfoSection("LAP-001"),
        { id: "laptop", title: "Spesifikasi", type: "fields", fields: [
          { id: "brand", label: "Brand" }, { id: "model", label: "Model" }, { id: "serial", label: "Serial Number" }
        ]}
      ]},
      { id: "fisik", title: "Fisik", sections: [
        { id: "fisik", title: "Cek Fisik", type: "checklist", scored: true, items: [
          { id: "body", label: "Body" }, { id: "layar", label: "Layar" }, { id: "keyboard", label: "Keyboard" },
          { id: "touchpad", label: "Touchpad" }, { id: "wifi", label: "Wi-Fi" }, { id: "battery", label: "Battery" }
        ]}
      ]}
    ]
  };

  // 2. Tablet Definition (V0.8)
  AA.auditDefs.tablet = {
    id: "tablet", label: "Tablet",
    steps: [
      { id: "identitas", title: "Identitas", sections: [
        AA.auditDefs.makeInfoSection("TAB-001"),
        { id: "laptop", title: "Identitas Tablet", type: "fields", fields: [
          { id: "brand", label: "Brand", placeholder: "Apple / Samsung" },
          { id: "model", label: "Model", placeholder: "iPad Air / Tab S" },
          { id: "serial", label: "Serial Number" }
        ]}
      ]},
      { id: "spesifikasi", title: "Spesifikasi", sections: [
        { id: "spec", title: "Spesifikasi Teknis", type: "fields", fields: [
          { id: "os", label: "Operating System", placeholder: "iPadOS 17 / Android" },
          { id: "processor", label: "Processor/Chipset", placeholder: "Apple M1 / Snapdragon" },
          { id: "ram", label: "RAM" },
          { id: "storage", label: "Storage" }
        ]}
      ]},
      { id: "fisik", title: "Cek Fisik & Fitur", sections: [
        { id: "fisik", title: "Pemeriksaan Fisik Tablet", type: "checklist", scored: true, items: [
          { id: "body", label: "Body & Casing" },
          { id: "screen", label: "Layar / Display" },
          { id: "touchscreen", label: "Touchscreen" },
          { id: "camera-front", label: "Kamera Depan" },
          { id: "camera-rear", label: "Kamera Belakang" },
          { id: "speaker", label: "Speaker" },
          { id: "mic", label: "Microphone" },
          { id: "wifi", label: "Wi-Fi" },
          { id: "bluetooth", label: "Bluetooth" },
          { id: "cellular", label: "Cellular Network (SIM)" },
          { id: "gps", label: "GPS" },
          { id: "usb", label: "Port USB / Charging" },
          { id: "battery", label: "Battery" },
          { id: "fingerprint", label: "Fingerprint Scanner" },
          { id: "faceunlock", label: "Face Unlock" },
          { id: "accessories", label: "Accessories (Stylus/Keyboard)" }
        ]}
      ]}
    ]
  };
})(window.AssetAudit);
