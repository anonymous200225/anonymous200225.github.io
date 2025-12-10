(function() {
  const GAJI_POKOK = 3039805
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

  function saveLocal() {
    localStorage.setItem("sunfishData", JSON.stringify(parsedData));
  }

  function loadLocal() {
    const s = localStorage.getItem("sunfishData");
    if (s) parsedData = JSON.parse(s);
  }

  function saveUser() {
    localStorage.setItem("userInfo", JSON.stringify(user));
  }

  function loadUser() {
    const u = localStorage.getItem("userInfo");
    if (u) user = JSON.parse(u);
  }

  function parseIndoDate(str) {
    if (!str) return null;
    const p = str.split('/');
    if (p.length !== 3) return null;
    return new Date(parseInt(p[2], 10), parseInt(p[1], 10) - 1, parseInt(p[0], 10));
  }

  function ddmmyyyy(d) {
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  }

  function formatRupiah(n) {
    return "Rp " + Number(Math.round(n || 0)).toLocaleString("id-ID");
  }

  function checkOffDay(jam, tipeHari) {
    const ovh = document.getElementById('ovh');
    const ovt = document.getElementById('ovt');
    const off = document.getElementById('off');
    const prs = document.getElementById('prs');
    const statusPRS = document.getElementById('statusPRS');

    if (!ovh || !ovt) return;

    if (!jam || Number(jam) <= 0) {
      ovh.checked = false;
      ovt.checked = false;
      if (tipeHari === "OFF" || tipeHari === "PHOFF") prs.checked = false;
    } else if (tipeHari === "PHOFF") {
      ovh.checked = true;
      ovt.checked = false;
      off.checked = false;
      prs.checked = true;
      statusPRS.checked = true;
    } else if (tipeHari === "WD" || tipeHari === "OFF") {
      ovh.checked = false;
      ovt.checked = true;
      prs.checked = true;
      off.checked = false;
      statusPRS.checked = true;
    } else {
      ovh.checked = false;
      ovt.checked = false;
      off.checked = true;
      prs.checked = false;
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
      if (jam <= 7) return 1.5 + (jam - 1) * 2;
      return 1.5 + (6 * 2) + ((jam - 7) * 3) + 2;
    }
    return 0;
  }


  function calculateStats(data) {
    let hariKerja = 0,
      cuti = 0,
      absen = 0,
      off = 0,
      totalJam = 0,
      totalIndeks = 0,
      meal = 0;
    data.forEach(r => {
      const tipe = (r["Tipe Hari"] || "").toUpperCase();
      const status = (r["Status"] || "").toUpperCase();
      const other = (r["Other Status"] || "").toUpperCase();
      if ((tipe === "WD" && status === "PRS") || (tipe === "PHOFF" && status === "PRS")) hariKerja++;
      if (tipe === "OFF" && status === "PRS") off++;
      if (status === "ABS") absen++;
      if (status === "CT" || status === "CS") cuti++;
      if (other.includes("MEAL") || other.includes("PRS_MEAL")) meal++;
      totalJam += parseFloat((r["Jam Lembur"] || "0").toString().replace(",", ".")) || 0;
      totalIndeks += parseFloat((r["Indeks Lembur"] || "0").toString().replace(",", ".")) || 0;
    });

    let BPJS = Number(hariKerja) > 0 ? POTONGAN : 0;
    let gajiPokokFinal = (hariKerja > 25) ? GAJI_POKOK : (hariKerja * DAILY_RATE);

    let gaji = gajiPokokFinal +
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

  function generateSummaryHtml(stats, startLabel, endLabel) {
    const startDisplay = startLabel || '-';
    const endDisplay = endLabel || '-';

    const prevBtn = `<button id="prevMonthBtn" class="month-shift-btn">‹</button>`;
    const nextBtn = `<button id="nextMonthBtn" class="month-shift-btn">›</button>`;

    return `
        <table class="summary-table">
          <tr>
            <th colspan="2">
              <div class="period-wrapper">
                <div class="period-center">
                  ${prevBtn}
                  <span id="periodStart" class="period-clickable">${startDisplay}</span>
                  —
                  <span id="periodEnd" class="period-clickable">${endDisplay}</span>
                  ${nextBtn}
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

  function generateTableHtml(data) {
    if (!data.length) return "";

    const headers = Object.keys(data[0]).filter(k => k !== "dateObj");
    let html = "<div class='table-responsive' id='dataTable'><table class='data-table'><thead><tr>";
    headers.forEach(h => html += `<th>${h}</th>`);
    html += "<th>Aksi</th></tr></thead><tbody>";

    data.forEach((row, idx) => {
      // Cari index asli di parsedData berdasarkan tanggal
      const originalIndex = parsedData.findIndex(r => r["Tanggal"] === row["Tanggal"]);
      const dataIdx = originalIndex !== -1 ? originalIndex : idx;

      html += `<tr class="${getRowClass(row)}" data-idx="${dataIdx}" data-tanggal="${row["Tanggal"]}">`;
      headers.forEach(h => {
        const cellValue = row[h] == null ? "" : row[h];
        html += `<td>${cellValue}</td>`;
      });
      html += `<td><button class="delBtn" data-idx="${dataIdx}">❌</button></td></tr>`;
    });

    html += "</tbody></table></div>";
    return html;
  }

  function setupRowClickHandlers() {
    tableOutput.addEventListener("click", function(e) {
      const delBtn = e.target.closest('.delBtn');
      if (delBtn) {
        // Jangan proses edit jika klik tombol hapus
        e.stopPropagation();
        return;
      }

      const tr = e.target.closest("tr");
      if (!tr || !tr.parentElement || tr.parentElement.tagName !== 'TBODY') return;

      const td = tr.querySelectorAll("td");
      if (td.length < 1) return;

      document.querySelector(".input-form").scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

      // DATA DARI TABEL
      const tgl = td[0].textContent.trim();
      const tipeHari = td[1].textContent.trim();
      const menit = td[2].textContent.trim();
      const jam = td[3].textContent.trim();
      const indeks = td[4].textContent.trim();
      const status = td[5].textContent.trim();
      const otherText = td[6].textContent.trim();

      // FORMAT TANGGAL UNTUK INPUT
      function toInputDateFormat(t) {
        const d = parseIndoDate(t);
        if (!d) return "";
        // Format ke YYYY-MM-DD
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }

      // === SET KE FORM ===
      manualTanggal.value = toInputDateFormat(tgl);
      manualJamLembur.value = jam;
      manualMenitLembur.value = menit;
      manualIndeks.value = indeks.replace(",", ".");

      // RADIO TIPE HARI
      const r1 = document.querySelector(`input[name="manualTipeHari"][value="${tipeHari}"]`);
      if (r1) r1.checked = true;

      // RADIO STATUS
      const r2 = document.querySelector(`input[name="manualStatus"][value="${status}"]`);
      if (r2) r2.checked = true;

      // CHECKBOX OTHER STATUS
      document.querySelectorAll(".other-status").forEach(cb => cb.checked = false);

      if (otherText !== "") {
        otherText.split(",").forEach(o => {
          const c = document.querySelector(`.other-status[value="${o.trim()}"]`);
          if (c) c.checked = true;
        });
      }
    });
  }

  function attachDeleteButtons() {
    const delBtns = tableOutput.querySelectorAll('.delBtn');

    // Hapus semua event listener lama
    delBtns.forEach(btn => {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
    });

    // Tambahkan event listener baru ke semua tombol hapus
    const newDelBtns = tableOutput.querySelectorAll('.delBtn');
    newDelBtns.forEach(btn => {
      btn.addEventListener('click', onDeleteRow);
    });
  }

  function onDeleteRow(e) {
    e.stopPropagation();
    e.preventDefault();

    const idx = Number(this.dataset.idx);
    if (isNaN(idx)) {
      // Coba cari berdasarkan tanggal jika index tidak valid
      const row = this.closest('tr');
      if (row && row.dataset.tanggal) {
        const tanggal = row.dataset.tanggal;
        const foundIndex = parsedData.findIndex(r => r["Tanggal"] === tanggal);
        if (foundIndex !== -1) {
          deleteRowByIndex(foundIndex);
          return;
        }
      }
      alert("Gagal menghapus: Data tidak ditemukan");
      return;
    }

    deleteRowByIndex(idx);
  }

  function deleteRowByIndex(index) {
    if (!confirm("Hapus baris ini?")) return;

    if (index >= 0 && index < parsedData.length) {
      parsedData.splice(index, 1);
      saveLocal();
      refreshUI();
    } else {
      alert("Index tidak valid. Refresh halaman dan coba lagi.");
    }
  }

  function addManualEntry() {
    const iso = manualTanggal.value;
    if (!iso) return alert("Tanggal belum diisi.");
    const [y, m, d] = iso.split("-");
    const tgl = `${d}/${m}/${y}`;
    const jam = parseFloat(manualJamLembur.value) || 0;
    const menit = Math.round(jam * 60);
    const tipe = document.querySelector("input[name='manualTipeHari']:checked").value;
    const status = document.querySelector("input[name='manualStatus']:checked").value;
    const other = Array.from(
      document.querySelectorAll(".other-status:checked")
    ).map(c => c.value).join(",");

    // Pastikan ada data yang dipilih
    if (!tipe || !status) {
      alert("Harap pilih Tipe Hari dan Status");
      return;
    }

    const existIndex = parsedData.findIndex(r => r["Tanggal"] === tgl);
    const newRow = {
      "Tanggal": tgl,
      "Tipe Hari": tipe,
      "Menit Lembur": menit,
      "Jam Lembur": Number(jam).toFixed(2),
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

  function handleFileSelect(evt) {
    const file = evt.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xls")) return alert("Gunakan file .xls dari ESS");
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const doc = new DOMParser().parseFromString(e.target.result, "text/html");
        const table = doc.querySelector("table.tabGen");
        if (!table) return alert("Tabel tabGen tidak ditemukan.");
        const rows = table.querySelectorAll("tbody tr");
        const res = [];
        rows.forEach(r => {
          const td = r.querySelectorAll("td");
          if (!td || td.length < 23) return;
          const serial = parseFloat(td[0].textContent.trim());
          let date;
          if (!isNaN(serial)) {
            // Convert Excel serial date
            const excelDate = new Date((serial - 25569) * 86400 * 1000);
            date = excelDate.toLocaleDateString("id-ID");
          } else {
            date = td[0].textContent.trim();
          }
          user = {
            nama: td[1].textContent.trim() || '-',
            id: td[2].textContent.trim() || '-',
            jabatan: td[3].textContent.trim() || '-'
          };
          saveUser();

          // Parse jam lembur
          const menitLembur = (td[17].textContent || '').trim();
          const jamLembur = parseFloat(menitLembur) / 60;

          res.push({
            "Tanggal": date,
            "Tipe Hari": (td[15].textContent || '').trim().toUpperCase(),
            "Menit Lembur": menitLembur,
            "Jam Lembur": isNaN(jamLembur) ? "0.00" : jamLembur.toFixed(2),
            "Indeks Lembur": (td[18].textContent || '').trim(),
            "Status": (td[21].textContent || '').trim().toUpperCase(),
            "Other Status": (td[22].textContent || '').trim().toUpperCase()
          });
        });

        res.forEach(row => {
          const tgl = row["Tanggal"];
          if (!tgl) return;

          const existing = parsedData.findIndex(x => x["Tanggal"] === tgl);

          if (existing >= 0) {
            parsedData[existing] = row;
          } else {
            parsedData.push(row);
          }
        });

        saveLocal();
        refreshUI();
        alert(`Data berhasil diimpor! ${res.length} baris ditambahkan.`);
      } catch (error) {
        alert("Terjadi kesalahan saat membaca file: " + error.message);
      }
    };
    reader.readAsText(file);
  }


  function fixedTable() {
    // Tunggu sebentar untuk memastikan tabel sudah dibuat
    setTimeout(() => {
      const tbl = document.querySelector(".data-table");

      if (tbl) {
        // Pastikan tabel memiliki wrapper
        if (!tbl.parentElement.classList.contains("table-wrapper")) {
          const wrap = document.createElement("div");
          wrap.className = "table-wrapper";
          tbl.parentElement.insertBefore(wrap, tbl);
          wrap.appendChild(tbl);
        }
      }

      // Style wrapper
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

      // Sticky header
      const ths = document.querySelectorAll(".data-table th");
      ths.forEach(th => {
        th.style.position = "sticky";
        th.style.top = "0";
        th.style.zIndex = "10";
      });
    }, 100);

  }

  function refreshUI() {
    // Tambahkan dateObj untuk sorting
    parsedData.forEach(r => {
      r.dateObj = parseIndoDate(r["Tanggal"]);
    });

    // Sort by date
    parsedData.sort((a, b) => {
      if (!a.dateObj || !b.dateObj) return 0;
      return a.dateObj - b.dateObj;
    });

    displayData = parsedData.slice();

    if (filterStart || filterEnd) {
      displayData = parsedData.filter(r => {
        if (!r.dateObj) return false;
        if (filterStart && r.dateObj < filterStart) return false;
        if (filterEnd && r.dateObj > filterEnd) return false;
        return true;
      });
    }

    tableOutput.innerHTML = generateTableHtml(displayData);


    // Setup event handlers
    setupRowClickHandlers();
    attachDeleteButtons();

    if (displayData.length) {
      const stats = calculateStats(displayData);
      const startLabel = displayData[0]["Tanggal"];
      const endLabel = displayData[displayData.length - 1]["Tanggal"];
      summaryOutput.innerHTML = generateSummaryHtml(stats, startLabel, endLabel);
    } else {
      const stats = calculateStats([]);
      const startLabel = (filterStart) ? ddmmyyyy(filterStart) : (parsedData[0] ? parsedData[0]["Tanggal"] : '-');
      const endLabel = (filterEnd) ? ddmmyyyy(filterEnd) : (parsedData[parsedData.length - 1] ? parsedData[parsedData.length - 1]["Tanggal"] : '-');
      summaryOutput.innerHTML = generateSummaryHtml(stats, startLabel, endLabel);
    }

    saveLocal();
    attachPeriodHandlers();
    fixedTable();
  }

  function updateOtherStatus(tipeHari) {
    const checkboxes = document.querySelectorAll('.other-status');
    checkboxes.forEach(cb => cb.checked = false);
    if (tipeHari === 'WD') {
      $('eai').checked = true;
      $('prs').checked = true;
      $('prsmeal').checked = true;
      $('statusPRS').checked = true;
    }
  }

  function updateStatus(status) {
    const checkboxes = document.querySelectorAll('.other-status');
    checkboxes.forEach(cb => cb.checked = false);
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

  function attachPeriodHandlers() {
    const startSpan = document.getElementById('periodStart');
    const endSpan = document.getElementById('periodEnd');

    const prev = document.getElementById("prevMonthBtn");
    const next = document.getElementById("nextMonthBtn");

    if (prev) {
      prev.onclick = () => shiftMonth(-1);
    }
    if (next) {
      next.onclick = () => shiftMonth(+1);
    }

    if (startSpan) {
      startSpan.onclick = onStartClick;
    }
    if (endSpan) {
      endSpan.onclick = onEndClick;
    }
  }

  function shiftMonth(offset) {
    if (!filterStart || !filterEnd) {
      if (!parsedData || !parsedData.length) return;
      parsedData.forEach(r => {
        r.dateObj = parseIndoDate(r["Tanggal"]);
      });
      parsedData.sort((a, b) => (a.dateObj && b.dateObj) ? a.dateObj - b.dateObj : 0);
      const first = parsedData[0];
      const last = parsedData[parsedData.length - 1];
      if (!first || !last) return;
      filterStart = first.dateObj ? new Date(first.dateObj) : parseIndoDate(first["Tanggal"]);
      filterEnd = last.dateObj ? new Date(last.dateObj) : parseIndoDate(last["Tanggal"]);
    }

    const s = new Date(filterStart);
    const e = new Date(filterEnd);

    s.setMonth(s.getMonth() + offset);
    e.setMonth(e.getMonth() + offset);

    filterStart = s;
    filterEnd = e;

    try {
      localStorage.setItem("filterStart", formatInputDate(s));
      localStorage.setItem("filterEnd", formatInputDate(e));
    } catch (err) {}

    const fsi = $('filterStartInput');
    const fei = $('filterEndInput');
    if (fsi) fsi.value = formatInputDate(s);
    if (fei) fei.value = formatInputDate(e);

    refreshUI();
  }

  function formatInputDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function onStartClick() {
    const input = $('filterStartInput');
    if (!input) return;

    const txt = document.getElementById('periodStart').innerText.trim();
    const p = txt.split('/');

    if (p.length === 3) {
      input.value = `${p[2]}-${p[1]}-${p[0]}`;
    }

    input.click();
  }

  function onEndClick() {
    const input = $('filterEndInput');
    if (!input) return;

    const txt = document.getElementById('periodEnd').innerText.trim();
    const p = txt.split('/');

    if (p.length === 3) {
      input.value = `${p[2]}-${p[1]}-${p[0]}`;
    }

    input.click();
  }

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
    tipeHariRadios = document.querySelectorAll('input[name="manualTipeHari"]');
    statusRadios = document.querySelectorAll('input[name="manualStatus"]');

    loadLocal();
    loadUser();

    // Load filter dari localStorage
    const fs = localStorage.getItem('filterStart');
    const fe = localStorage.getItem('filterEnd');

    if (fs) {
      const p = fs.split("-");
      filterStart = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
      $('filterStartInput').value = fs;
    }

    if (fe) {
      const p = fe.split("-");
      filterEnd = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
      $('filterEndInput').value = fe;
    }

    // Set tanggal default ke hari ini
    const now = new Date();
    manualTanggal.value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

    fileInput.addEventListener('change', handleFileSelect);

    manualJamLembur.addEventListener('input', () => {
      const jam = parseFloat(manualJamLembur.value) || 0;
      manualMenitLembur.value = Math.round(jam * 60);
      const tipe = document.querySelector("input[name='manualTipeHari']:checked").value;
      manualIndeks.value = hitungIndeksByJam(jam, tipe).toFixed(2);
    });

    manualMenitLembur.addEventListener('input', () => {
      const menit = parseFloat(manualMenitLembur.value) || 0;
      const jam = menit / 60;
      manualJamLembur.value = jam.toFixed(2);
      const tipe = document.querySelector("input[name='manualTipeHari']:checked").value;
      manualIndeks.value = hitungIndeksByJam(jam, tipe).toFixed(2);
    });

    btnAdd.addEventListener('click', (e) => {
      e.preventDefault();
      addManualEntry();
    });

    btnReset.addEventListener('click', (e) => {
      e.preventDefault();
      resetData();
    });

    tipeHariRadios.forEach(r => r.addEventListener('change', () => {
      if (r.checked) updateOtherStatus(r.value);
    }));

    statusRadios.forEach(r => r.addEventListener('change', () => {
      if (r.checked) updateStatus(r.value);
    }));

    const filterStartInput = $('filterStartInput');
    const filterEndInput = $('filterEndInput');

    if (filterStartInput) filterStartInput.addEventListener('change', (e) => {
      const v = e.target.value;

      if (!v) {
        filterStart = null;
        localStorage.removeItem('filterStart');
        refreshUI();
        return;
      }

      const parts = v.split('-');
      filterStart = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      localStorage.setItem('filterStart', v);
      refreshUI();
    });

    if (filterEndInput) filterEndInput.addEventListener('change', (e) => {
      const v = e.target.value;

      if (!v) {
        filterEnd = null;
        localStorage.removeItem('filterEnd');
        refreshUI();
        return;
      }

      const parts = v.split('-');
      filterEnd = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      localStorage.setItem('filterEnd', v);
      refreshUI();
    });

    // Auto-set hari berdasarkan tanggal
    manualTanggal.addEventListener("change", function() {
      const selectedDate = new Date(this.value);
      const dayOfWeek = selectedDate.getDay(); // 0 = Minggu, 1 = Senin, etc.

      if (dayOfWeek === 0) { // Minggu
        updateStatus("OFF");
        document.querySelector('input[name="manualStatus"][value="OFF"]').checked = true;
        document.querySelector('input[name="manualTipeHari"][value="OFF"]').checked = true;
      } else {
        updateStatus("WD");
        updateOtherStatus("WD");
        document.querySelector('input[name="manualStatus"][value="PRS"]').checked = true;
        document.querySelector('input[name="manualTipeHari"][value="WD"]').checked = true;
      }

      // Update indeks jika ada jam lembur
      const jam = parseFloat(manualJamLembur.value) || 0;
      const tipe = document.querySelector("input[name='manualTipeHari']:checked").value;
      manualIndeks.value = hitungIndeksByJam(jam, tipe).toFixed(2);
    });

    // Jalankan event secara manual saat halaman pertama kali dibuka
    manualTanggal.dispatchEvent(new Event("change"));

    setTimeout(() => {
      document.getElementById("load-wrapper").style.display = "none";
      refreshUI();
    }, 300);
  });

  window._app = {
    refreshUI,
    saveLocal,
    loadLocal,
    parsedData
  };

})();

// === PATCH SCROLL + FIXED HEADER ===
document.addEventListener("DOMContentLoaded", () => {

});
