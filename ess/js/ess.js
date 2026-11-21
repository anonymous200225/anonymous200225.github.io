(function() {
  const GAJI_POKOK = 3187965;
  const DAILY_RATE = GAJI_POKOK / 25;
  const OVERTIME_RATE = GAJI_POKOK / 173;
  const MEAL_RATE = 11800;
  const JHT = GAJI_POKOK * 0.02;
  const JP = GAJI_POKOK * 0.01;
  const POTONGAN = JHT + JP;

  let parsedData = [];

  let user = {
    nama: '-',
    id: '-',
    jabatan: '-'
  };

  let fileInput, summaryOutput, tableOutput;
  let manualTanggal, manualJamLembur, manualMenitLembur, manualIndeks;
  let btnAdd, btnReset;
  let tipeHariRadios, statusRadios;

  let filterStart = null;
  let filterEnd = null;
  let displayData = null;

  function $(id) {
    return document.getElementById(id);
  }

  // ==============================
  // LOCAL STORAGE
  // ==============================

  function saveLocal() {
    localStorage.setItem("sunfishData", JSON.stringify(parsedData));
  }

  function loadLocal() {
    try {
      const s = localStorage.getItem("sunfishData");
      if (s) parsedData = JSON.parse(s);
    } catch (e) {
      console.error("Gagal membaca data lokal:", e);
      parsedData = [];
    }
  }

  function saveUser() {
    localStorage.setItem("userInfo", JSON.stringify(user));
  }

  function loadUser() {
    try {
      const u = localStorage.getItem("userInfo");
      if (u) user = JSON.parse(u);
    } catch (e) {
      console.error("Gagal membaca informasi user:", e);
    }
  }

  // ==============================
  // DATE FUNCTIONS
  // ==============================

  function parseIndoDate(str) {
    if (!str) return null;

    const p = str.split('/');
    if (p.length !== 3) return null;

    const d = parseInt(p[0], 10);
    const m = parseInt(p[1], 10);
    const y = parseInt(p[2], 10);

    const date = new Date(y, m - 1, d);

    if (
      date.getFullYear() !== y ||
      date.getMonth() !== m - 1 ||
      date.getDate() !== d
    ) return null;

    date.setHours(0, 0, 0, 0);
    return date;
  }

  function ddmmyyyy(d) {
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  }

  function formatInputDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function formatRupiah(n) {
    return "Rp " + Number(Math.round(n || 0)).toLocaleString("id-ID");
  }

  // ==============================
  // OVERTIME CALCULATION
  // ==============================

  function checkOffDay(jam, tipeHari) {
    const ovh = $('ovh');
    const ovt = $('ovt');
    const off = $('off');
    const prs = $('prs');
    const statusPRS = $('statusPRS');

    if (!ovh || !ovt) return;

    if (!jam || Number(jam) <= 0) {
      ovh.checked = false;
      ovt.checked = false;

      if (tipeHari === "OFF" || tipeHari === "PHOFF") {
        if (prs) prs.checked = false;
      }

    } else if (tipeHari === "PHOFF") {
      ovh.checked = true;
      ovt.checked = false;

      if (off) off.checked = false;
      if (prs) prs.checked = true;
      if (statusPRS) statusPRS.checked = true;

    } else if (tipeHari === "WD" || tipeHari === "OFF") {
      ovh.checked = false;
      ovt.checked = true;

      if (prs) prs.checked = true;
      if (off) off.checked = false;
      if (statusPRS) statusPRS.checked = true;

    } else {
      ovh.checked = false;
      ovt.checked = false;

      if (off) off.checked = true;
      if (prs) prs.checked = false;
    }
  }

  function hitungIndeksByJam(jam, tipeHari) {
    jam = Number(jam) || 0;

    checkOffDay(jam, tipeHari);

    if (jam <= 0) return 0;

    if (tipeHari === "OFF" || tipeHari === "PHOFF") {
      if (jam <= 7) return jam * 2;

      return (7 * 2) + (jam - 7) * 3 + 2;

    } else if (tipeHari === "WD") {
      if (jam <= 1) return 1.5;

      return 1.5 + (jam - 1) * 2;
    }

    return 0;
  }

  // ==============================
  // STATISTICS
  // ==============================

  function calculateStats(data) {
    let hariKerja = 0;
    let cuti = 0;
    let absen = 0;
    let off = 0;
    let totalJam = 0;
    let totalIndeks = 0;
    let meal = 0;

    data.forEach(r => {
      const tipe = (r["Tipe Hari"] || "").toUpperCase();
      const status = (r["Status"] || "").toUpperCase();
      const other = (r["Other Status"] || "").toUpperCase();

      if (
        (tipe === "WD" && status === "PRS") ||
        (tipe === "PHOFF" && status === "PRS")
      ) hariKerja++;

      if (tipe === "OFF" && status === "PRS") off++;

      if (status === "ABS") absen++;

      if (status === "CT" || status === "CS") cuti++;

      if (
        other.includes("MEAL") ||
        other.includes("PRS_MEAL")
      ) meal++;

      totalJam += parseFloat(
        (r["Jam Lembur"] || "0").toString().replace(",", ".")
      ) || 0;

      totalIndeks += parseFloat(
        (r["Indeks Lembur"] || "0").toString().replace(",", ".")
      ) || 0;
    });

    const BPJS = hariKerja > 0 ? POTONGAN : 0;

    const gajiPokokFinal =
      (data.length >= 30)
        ? GAJI_POKOK
        : (hariKerja * DAILY_RATE);

    const gaji =
      gajiPokokFinal +
      (totalIndeks * OVERTIME_RATE) +
      (meal * MEAL_RATE) -
      BPJS;

    return {
      hariKerja,
      cuti,
      absen,
      off,
      totalJam,
      totalIndeks,
      gaji
    };
  }

  // ==============================
  // SUMMARY HTML
  // ==============================

  function generateSummaryHtml(stats, startLabel, endLabel) {
    return `
      <table class="summary-table">

        <tr>
          <th colspan="2">
            <div class="period-wrapper">
              <div class="period-center">

                <button id="prevMonthBtn" class="month-shift-btn">‹</button>

                <span id="periodStart" class="period-clickable">
                  ${startLabel || '-'}
                </span>

                —

                <span id="periodEnd" class="period-clickable">
                  ${endLabel || '-'}
                </span>

                <button id="nextMonthBtn" class="month-shift-btn">›</button>

              </div>
            </div>
          </th>
        </tr>

        <tr><td>Nama Karyawan</td><td>${user.nama}</td></tr>
        <tr><td>NIK / ID</td><td>${user.id}</td></tr>
        <tr><td>Posisi / Jabatan</td><td>${user.jabatan}</td></tr>
        <tr><td>Hari Kerja</td><td>${stats.hariKerja}</td></tr>
        <tr><td>Cuti</td><td>${stats.cuti}</td></tr>
        <tr><td>Absen</td><td>${stats.absen}</td></tr>
        <tr><td>Jam Lembur</td><td>${stats.totalJam.toFixed(2)} jam</td></tr>
        <tr><td>Indeks Lembur</td><td>${stats.totalIndeks.toFixed(2)}</td></tr>
        <tr><td>Estimasi Gaji</td><td>${formatRupiah(stats.gaji)}</td></tr>

      </table>
    `;
  }

  // ==============================
  // TABLE
  // ==============================

  function getRowClass(row) {
    const t = (row["Tipe Hari"] || "").toUpperCase();
    const s = (row["Status"] || "").toUpperCase();

    if (s === "ABS") return "abs";
    if (s === "CT" || s === "CS") return "ct";
    if (t === "PHOFF") return "phoff";
    if (t === "OFF") return "off";
    if (t === "WD") return "wd";

    return "";
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[c]);
  }

  function generateTableHtml(data) {
    if (!data.length) return "";

    const headers = Object.keys(data[0]).filter(k => k !== "dateObj");

    let html = `
      <div class="table-responsive" id="dataTable">
        <table class="data-table">
          <thead>
            <tr>
    `;

    headers.forEach(h => {
      html += `<th>${escapeHTML(h)}</th>`;
    });

    html += `<th>Aksi</th></tr></thead><tbody>`;

    data.forEach((row, idx) => {
      const dataIdx = parsedData.indexOf(row);

      html += `
        <tr class="${getRowClass(row)}"
            data-idx="${dataIdx}"
            data-tanggal="${escapeHTML(row["Tanggal"])}">
      `;

      headers.forEach(h => {
        html += `<td>${escapeHTML(row[h])}</td>`;
      });

      html += `
        <td>
          <button class="delBtn" data-idx="${dataIdx}">❌</button>
        </td>
        </tr>
      `;
    });

    html += `</tbody></table></div>`;

    return html;
  }

  // ==============================
  // ROW CLICK / EDIT
  // ==============================

  function setupRowClickHandlers() {
    tableOutput.onclick = function(e) {
      const delBtn = e.target.closest('.delBtn');

      if (delBtn) return;

      const tr = e.target.closest("tr");

      if (!tr || tr.parentElement.tagName !== 'TBODY') return;

      const dataIdx = Number(tr.dataset.idx);
      const row = parsedData[dataIdx];

      if (!row) return;

      document.querySelector(".input-form")?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

      const tgl = row["Tanggal"];

      const d = parseIndoDate(tgl);

      if (d) {
        manualTanggal.value = formatInputDate(d);
      }

      manualJamLembur.value = row["Jam Lembur"] || "0";
      manualMenitLembur.value = row["Menit Lembur"] || "0";
      manualIndeks.value = row["Indeks Lembur"] || "0";

      const r1 = document.querySelector(
        `input[name="manualTipeHari"][value="${row["Tipe Hari"]}"]`
      );

      if (r1) r1.checked = true;

      const r2 = document.querySelector(
        `input[name="manualStatus"][value="${row["Status"]}"]`
      );

      if (r2) r2.checked = true;

      document.querySelectorAll(".other-status").forEach(cb => {
        cb.checked = false;
      });

      (row["Other Status"] || "").split(",").forEach(o => {
        const c = document.querySelector(
          `.other-status[value="${o.trim()}"]`
        );

        if (c) c.checked = true;
      });
    };
  }

  function attachDeleteButtons() {
    tableOutput.querySelectorAll('.delBtn').forEach(btn => {
      btn.onclick = onDeleteRow;
    });
  }

  function onDeleteRow(e) {
    e.stopPropagation();
    e.preventDefault();

    const idx = Number(this.dataset.idx);

    deleteRowByIndex(idx);
  }

  function deleteRowByIndex(index) {
    if (!confirm("Hapus baris ini?")) return;

    if (index >= 0 && index < parsedData.length) {
      parsedData.splice(index, 1);

      saveLocal();
      refreshUI();

    } else {
      alert("Index tidak valid.");
    }
  }

  // ==============================
  // MANUAL ENTRY
  // ==============================

  function addManualEntry() {
    const iso = manualTanggal.value;

    if (!iso) {
      alert("Tanggal belum diisi.");
      return;
    }

    const [y, m, d] = iso.split("-");

    const tgl = `${d}/${m}/${y}`;

    const jam = parseFloat(manualJamLembur.value) || 0;
    const menit = Math.round(jam * 60);

    const tipeInput = document.querySelector(
      "input[name='manualTipeHari']:checked"
    );

    const statusInput = document.querySelector(
      "input[name='manualStatus']:checked"
    );

    if (!tipeInput || !statusInput) {
      alert("Harap pilih Tipe Hari dan Status.");
      return;
    }

    const tipe = tipeInput.value;
    const status = statusInput.value;

    const other = Array.from(
      document.querySelectorAll(".other-status:checked")
    ).map(c => c.value).join(",");

    const existIndex = parsedData.findIndex(
      r => r["Tanggal"] === tgl
    );

    const newRow = {
      "Tanggal": tgl,
      "Tipe Hari": tipe,
      "Menit Lembur": menit,
      "Jam Lembur": jam.toFixed(2),
      "Indeks Lembur": hitungIndeksByJam(jam, tipe).toFixed(2),
      "Status": status,
      "Other Status": other
    };

    if (existIndex !== -1) {
      parsedData[existIndex] = newRow;
    } else {
      parsedData.push(newRow);
    }

    saveLocal();
    refreshUI();
  }

  function resetData() {
    if (!confirm("Hapus semua data?")) return;

    parsedData = [];

    localStorage.removeItem("sunfishData");

    refreshUI();
  }

  // ==============================
  // XLSX PARSER
  // ==============================

  function parseXLSXFile(arrayBuffer) {
    try {
      const workbook = XLSX.read(arrayBuffer, {
        type: 'array',
        cellDates: false
      });

      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

      const rows = XLSX.utils.sheet_to_json(firstSheet, {
        header: 1,
        defval: ""
      });

      let currentDate = null;
      let result = [];

      let userData = {
        nama: '-',
        id: '-',
        jabatan: '-'
      };

      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr',
        'May', 'Jun', 'Jul', 'Aug',
        'Sep', 'Oct', 'Nov', 'Dec'
      ];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        if (!row || row.length === 0) continue;

        const colA = String(row[0] || "").trim();

        if (colA.startsWith('Date : ')) {
          const dateStr = colA.replace('Date : ', '').trim();
          const parts = dateStr.split(' ');

          if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const monthIndex = monthNames.indexOf(parts[1]);

            if (monthIndex !== -1) {
              const month = String(monthIndex + 1).padStart(2, '0');

              currentDate = `${day}/${month}/${parts[2]}`;

            } else {
              const d = new Date(dateStr);

              if (!isNaN(d.getTime())) {
                currentDate = ddmmyyyy(d);
              }
            }
          }

          continue;
        }

        const serial = Number(row[0]);

        if (
          row.length >= 4 &&
          Number.isInteger(serial) &&
          serial > 0 &&
          currentDate
        ) {
          const empName = String(row[1] || '').trim();
          const empNo = String(row[2] || '').trim();
          const pos = String(row[3] || '').trim();

          if (empName) userData.nama = empName;
          if (empNo) userData.id = empNo;
          if (pos) userData.jabatan = pos;

          const dayType = String(row[15] || '').trim().toUpperCase();

          const overtimeMinute = Number(row[17]) || 0;
          const overtimeIndex = Number(
            String(row[18] || 0).replace(",", ".")
          ) || 0;

          const status = String(row[23] || '').trim().toUpperCase();
          const otherStatus = String(row[24] || '').trim().toUpperCase();

          result.push({
            "Tanggal": currentDate,
            "Tipe Hari": dayType || "WD",
            "Menit Lembur": overtimeMinute.toString(),
            "Jam Lembur": (overtimeMinute / 60).toFixed(2),
            "Indeks Lembur": overtimeIndex.toFixed(2),
            "Status": status || "PRS",
            "Other Status": otherStatus
          });
        }
      }

      if (userData.nama !== '-') {
        user = userData;
        saveUser();
      }

      return result;

    } catch (e) {
      console.error("Gagal parsing XLSX:", e);
      return null;
    }
  }

  // ==============================
  // XLS HTML PARSER
  // ==============================

  function parseXLS_HTML(fileContent) {
    try {
      const doc = new DOMParser().parseFromString(
        fileContent,
        "text/html"
      );

      const table = doc.querySelector("table.tabGen");

      if (!table) {
        throw new Error("Tabel tabGen tidak ditemukan.");
      }

      const rows = table.querySelectorAll("tbody tr");

      const res = [];

      let userData = {
        nama: '-',
        id: '-',
        jabatan: '-'
      };

      rows.forEach(r => {
        const td = r.querySelectorAll("td");

        if (!td || td.length < 23) return;

        const serial = parseFloat(td[0].textContent.trim());

        let date;

        if (!isNaN(serial)) {
          const excelDate = new Date(
            Date.UTC(1899, 11, 30) + serial * 86400000
          );

          date = ddmmyyyy(excelDate);

        } else {
          date = td[0].textContent.trim();
        }

        const empName = td[1].textContent.trim() || '-';
        const empNo = td[2].textContent.trim() || '-';
        const pos = td[3].textContent.trim() || '-';

        if (empName !== '-') userData.nama = empName;
        if (empNo !== '-') userData.id = empNo;
        if (pos !== '-') userData.jabatan = pos;

        const menitLembur = td[17].textContent.trim();

        const jamLembur =
          (parseFloat(menitLembur.replace(",", ".")) || 0) / 60;

        res.push({
          "Tanggal": date,
          "Tipe Hari": td[15].textContent.trim().toUpperCase(),
          "Menit Lembur": menitLembur,
          "Jam Lembur": jamLembur.toFixed(2),
          "Indeks Lembur": td[18].textContent.trim(),
          "Status": td[23].textContent.trim().toUpperCase(),
          "Other Status": td[24].textContent.trim().toUpperCase()
        });
      });

      if (userData.nama !== '-') {
        user = userData;
        saveUser();
      }

      return res;

    } catch (e) {
      console.error("Gagal parsing HTML:", e);
      return null;
    }
  }

  // ==============================
  // FILE IMPORT
  // ==============================

  function handleFileSelect(evt) {
    const file = evt.target.files[0];

    if (!file) return;

    const ext = file.name.toLowerCase();

    if (!ext.endsWith(".xls") && !ext.endsWith(".xlsx")) {
      alert("Gunakan file .xls atau .xlsx dari ESS.");
      return;
    }

    const reader = new FileReader();

    if (ext.endsWith(".xlsx")) {
      reader.onload = function(e) {
        const parsed = parseXLSXFile(e.target.result);

        if (parsed && parsed.length > 0) {
          mergeParsedData(parsed);

          alert(`Data berhasil diimpor! ${parsed.length} baris diproses.`);
        } else {
          alert("Tidak ada data yang ditemukan. Periksa format file.");
        }
      };

      reader.readAsArrayBuffer(file);

    } else {
      reader.onload = function(e) {
        const parsed = parseXLS_HTML(e.target.result);

        if (parsed && parsed.length > 0) {
          mergeParsedData(parsed);

          alert(`Data berhasil diimpor! ${parsed.length} baris diproses.`);
        } else {
          alert("Tidak ada data yang ditemukan. Coba gunakan file .xlsx.");
        }
      };

      reader.readAsText(file);
    }

    evt.target.value = "";
  }

  function mergeParsedData(newData) {
    newData.forEach(row => {
      const tgl = row["Tanggal"];

      if (!tgl || !parseIndoDate(tgl)) return;

      const existing = parsedData.findIndex(
        x => x["Tanggal"] === tgl
      );

      if (existing >= 0) {
        parsedData[existing] = row;
      } else {
        parsedData.push(row);
      }
    });

    saveLocal();
    refreshUI();
  }

  // ==============================
  // TABLE STYLE
  // ==============================

  function fixedTable() {
    setTimeout(() => {
      const tbl = document.querySelector(".data-table");

      if (tbl) {
        if (!tbl.parentElement.classList.contains("table-wrapper")) {
          const wrap = document.createElement("div");

          wrap.className = "table-wrapper";

          tbl.parentElement.insertBefore(wrap, tbl);
          wrap.appendChild(tbl);
        }
      }

      const wrap = document.querySelector(".table-wrapper");

      if (wrap) {
        wrap.style.cssText = `
          width: 100%;
          max-height: 60vh;
          overflow-y: auto;
          overflow-x: auto;
          margin-top: 0px;
          border-radius: 5px;
          background: white;
          position: relative;
        `;
      }

      document.querySelectorAll(".data-table th").forEach(th => {
        th.style.position = "sticky";
        th.style.top = "0";
        th.style.zIndex = "10";
      });

    }, 100);
  }

  // ==============================
  // REFRESH UI
  // ==============================

  function refreshUI() {

    parsedData.forEach(r => {
      r.dateObj = parseIndoDate(r["Tanggal"]);
    });

    parsedData.sort((a, b) => {
      if (!a.dateObj || !b.dateObj) return 0;
      return a.dateObj - b.dateObj;
    });

    displayData = parsedData.slice();

    // FILTER TANGGAL
    if (filterStart || filterEnd) {
      displayData = parsedData.filter(r => {
        if (!r.dateObj) return false;

        const tanggal = r.dateObj.getTime();

        if (filterStart) {
          const awal = new Date(filterStart);
          awal.setHours(0, 0, 0, 0);

          if (tanggal < awal.getTime()) return false;
        }

        if (filterEnd) {
          const akhir = new Date(filterEnd);
          akhir.setHours(23, 59, 59, 999);

          if (tanggal > akhir.getTime()) return false;
        }

        return true;
      });
    }

    tableOutput.innerHTML = generateTableHtml(displayData);

    setupRowClickHandlers();
    attachDeleteButtons();

    if (displayData.length) {
      const stats = calculateStats(displayData);

      const startLabel = displayData[0]["Tanggal"];
      const endLabel = displayData[displayData.length - 1]["Tanggal"];

      summaryOutput.innerHTML = generateSummaryHtml(
        stats,
        startLabel,
        endLabel
      );

    } else {
      const stats = calculateStats([]);

      const startLabel = filterStart
        ? ddmmyyyy(filterStart)
        : '-';

      const endLabel = filterEnd
        ? ddmmyyyy(filterEnd)
        : '-';

      summaryOutput.innerHTML = generateSummaryHtml(
        stats,
        startLabel,
        endLabel
      );
    }

    saveLocal();

    attachPeriodHandlers();
    fixedTable();
  }

  // ==============================
  // STATUS HANDLERS
  // ==============================

  function updateOtherStatus(tipeHari) {
    document.querySelectorAll('.other-status').forEach(cb => {
      cb.checked = false;
    });

    if (tipeHari === 'WD') {
      $('eai').checked = true;
      $('prs').checked = true;
      $('prsmeal').checked = true;
      $('statusPRS').checked = true;
    }
  }

  function updateStatus(status) {
    document.querySelectorAll('.other-status').forEach(cb => {
      cb.checked = false;
    });

    if (status === 'PRS' && $('tipeHariWD').checked === true) {
      $('eai').checked = true;
      $('prs').checked = true;
      $('prsmeal').checked = true;

    } else if (status === 'ABS') {
      $('tipeHariWD').checked = true;
      $('abs').checked = true;

    } else if (status === 'OFF') {
      $('tipeHariOFF').checked = true;
      $('off').checked = true;

    } else if (status === 'CT') {
      $('tipeHariWD').checked = true;
      $('ct').checked = true;
    }
  }

  // ==============================
  // PERIOD HANDLERS
  // ==============================

  function attachPeriodHandlers() {
    const startSpan = $('periodStart');
    const endSpan = $('periodEnd');

    const prev = $('prevMonthBtn');
    const next = $('nextMonthBtn');

    if (prev) prev.onclick = () => shiftMonth(-1);
    if (next) next.onclick = () => shiftMonth(1);

    if (startSpan) startSpan.onclick = onStartClick;
    if (endSpan) endSpan.onclick = onEndClick;
  }

  function shiftMonth(offset) {
    if (!filterStart || !filterEnd) {
      if (!parsedData.length) return;

      const dates = parsedData
        .map(r => parseIndoDate(r["Tanggal"]))
        .filter(Boolean)
        .sort((a, b) => a - b);

      if (!dates.length) return;

      filterStart = new Date(
        dates[0].getFullYear(),
        dates[0].getMonth(),
        dates[0].getDate()
      );

      filterEnd = new Date(
        dates[dates.length - 1].getFullYear(),
        dates[dates.length - 1].getMonth(),
        dates[dates.length - 1].getDate()
      );
    }

    function shiftDate(date, amount) {
      const result = new Date(date);
      const day = result.getDate();

      result.setDate(1);
      result.setMonth(result.getMonth() + amount);

      const lastDay = new Date(
        result.getFullYear(),
        result.getMonth() + 1,
        0
      ).getDate();

      result.setDate(Math.min(day, lastDay));

      return result;
    }

    filterStart = shiftDate(filterStart, offset);
    filterEnd = shiftDate(filterEnd, offset);

    localStorage.setItem(
      "filterStart",
      formatInputDate(filterStart)
    );

    localStorage.setItem(
      "filterEnd",
      formatInputDate(filterEnd)
    );

    if ($('filterStartInput')) {
      $('filterStartInput').value = formatInputDate(filterStart);
    }

    if ($('filterEndInput')) {
      $('filterEndInput').value = formatInputDate(filterEnd);
    }

    refreshUI();
  }

  function onStartClick() {
    const input = $('filterStartInput');

    if (!input) return;

    const txt = $('periodStart').innerText.trim();
    const p = txt.split('/');

    if (p.length === 3) {
      input.value = `${p[2]}-${p[1]}-${p[0]}`;
    }

    input.click();
  }

  function onEndClick() {
    const input = $('filterEndInput');

    if (!input) return;

    const txt = $('periodEnd').innerText.trim();
    const p = txt.split('/');

    if (p.length === 3) {
      input.value = `${p[2]}-${p[1]}-${p[0]}`;
    }

    input.click();
  }

  // ==============================
  // INITIALIZATION
  // ==============================

  document.addEventListener('DOMContentLoaded', () => {

    fileInput = $('fileInput');
    summaryOutput = $('summaryOutput');
    tableOutput = $('tableOutput');

    manualTanggal = $('manualTanggal');
    manualJamLembur = $('manualJamLembur');
    manualMenitLembur = $('manualMenitLembur');
    manualIndeks = $('manualIndeks');

    btnAdd = $('btnAdd');
    btnReset = $('btnReset');

    tipeHariRadios = document.querySelectorAll(
      'input[name="manualTipeHari"]'
    );

    statusRadios = document.querySelectorAll(
      'input[name="manualStatus"]'
    );

    loadLocal();
    loadUser();

    const fs = localStorage.getItem('filterStart');
    const fe = localStorage.getItem('filterEnd');

    if (fs) {
      const p = fs.split('-');

      filterStart = new Date(
        Number(p[0]),
        Number(p[1]) - 1,
        Number(p[2])
      );

      $('filterStartInput').value = fs;
    }

    if (fe) {
      const p = fe.split('-');

      filterEnd = new Date(
        Number(p[0]),
        Number(p[1]) - 1,
        Number(p[2])
      );

      $('filterEndInput').value = fe;
    }

    const now = new Date();

    manualTanggal.value = formatInputDate(now);

    fileInput.addEventListener('change', handleFileSelect);

    manualJamLembur.addEventListener('input', () => {
      const jam = parseFloat(manualJamLembur.value) || 0;

      manualMenitLembur.value = Math.round(jam * 60);

      const tipe = document.querySelector(
        "input[name='manualTipeHari']:checked"
      )?.value;

      manualIndeks.value = hitungIndeksByJam(
        jam,
        tipe
      ).toFixed(2);
    });

    manualMenitLembur.addEventListener('input', () => {
      const menit = parseFloat(manualMenitLembur.value) || 0;
      const jam = menit / 60;

      manualJamLembur.value = jam.toFixed(2);

      const tipe = document.querySelector(
        "input[name='manualTipeHari']:checked"
      )?.value;

      manualIndeks.value = hitungIndeksByJam(
        jam,
        tipe
      ).toFixed(2);
    });

    btnAdd.addEventListener('click', e => {
      e.preventDefault();
      addManualEntry();
    });

    btnReset.addEventListener('click', e => {
      e.preventDefault();
      resetData();
    });

    tipeHariRadios.forEach(r => {
      r.addEventListener('change', () => {
        if (r.checked) {
          updateOtherStatus(r.value);

          const jam = parseFloat(manualJamLembur.value) || 0;

          manualIndeks.value = hitungIndeksByJam(
            jam,
            r.value
          ).toFixed(2);
        }
      });
    });

    statusRadios.forEach(r => {
      r.addEventListener('change', () => {
        if (r.checked) updateStatus(r.value);
      });
    });

    const filterStartInput = $('filterStartInput');
    const filterEndInput = $('filterEndInput');

    if (filterStartInput) {
      filterStartInput.addEventListener('change', e => {
        const v = e.target.value;

        if (!v) {
          filterStart = null;
          localStorage.removeItem('filterStart');

          refreshUI();
          return;
        }

        const p = v.split('-');

        filterStart = new Date(
          Number(p[0]),
          Number(p[1]) - 1,
          Number(p[2])
        );

        localStorage.setItem('filterStart', v);

        refreshUI();
      });
    }

    if (filterEndInput) {
      filterEndInput.addEventListener('change', e => {
        const v = e.target.value;

        if (!v) {
          filterEnd = null;
          localStorage.removeItem('filterEnd');

          refreshUI();
          return;
        }

        const p = v.split('-');

        filterEnd = new Date(
          Number(p[0]),
          Number(p[1]) - 1,
          Number(p[2])
        );

        localStorage.setItem('filterEnd', v);

        refreshUI();
      });
    }

    manualTanggal.addEventListener('change', function() {
      if (!this.value) return;

      const selectedDate = new Date(this.value + "T00:00:00");
      const dayOfWeek = selectedDate.getDay();

      if (dayOfWeek === 0) {
        updateStatus("OFF");

        document.querySelector(
          'input[name="manualStatus"][value="OFF"]'
        ).checked = true;

        document.querySelector(
          'input[name="manualTipeHari"][value="OFF"]'
        ).checked = true;

      } else {
        updateStatus("WD");
        updateOtherStatus("WD");

        document.querySelector(
          'input[name="manualStatus"][value="PRS"]'
        ).checked = true;

        document.querySelector(
          'input[name="manualTipeHari"][value="WD"]'
        ).checked = true;
      }

      const jam = parseFloat(manualJamLembur.value) || 0;

      const tipe = document.querySelector(
        "input[name='manualTipeHari']:checked"
      ).value;

      manualIndeks.value = hitungIndeksByJam(
        jam,
        tipe
      ).toFixed(2);
    });

    manualTanggal.dispatchEvent(new Event("change"));

    setTimeout(() => {
      const loader = $('load-wrapper');

      if (loader) loader.style.display = "none";

      refreshUI();

    }, 300);

  });

  // ==============================
  // GLOBAL APP ACCESS
  // ==============================

  window._app = {
    refreshUI,
    saveLocal,
    loadLocal,
    parsedData,
    calculateStats,
    hitungIndeksByJam
  };

})();
