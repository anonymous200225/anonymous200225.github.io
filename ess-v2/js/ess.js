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
      return 1.5 + (jam - 1) * 2;
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
    let gajiPokokFinal = (displayData && displayData.length >= 30) ? GAJI_POKOK : (hariKerja * DAILY_RATE);

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

      const tgl = td[0].textContent.trim();
      const tipeHari = td[1].textContent.trim();
      const menit = td[2].textContent.trim();
      const jam = td[3].textContent.trim();
      const indeks = td[4].textContent.trim();
      const status = td[5].textContent.trim();
      const otherText = td[6].textContent.trim();

      function toInputDateFormat(t) {
        const d = parseIndoDate(t);
        if (!d) return "";
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }

      manualTanggal.value = toInputDateFormat(tgl);
      manualJamLembur.value = jam;
      manualMenitLembur.value = menit;
      manualIndeks.value = indeks.replace(",", ".");

      const r1 = document.querySelector(`input[name="manualTipeHari"][value="${tipeHari}"]`);
      if (r1) r1.checked = true;

      const r2 = document.querySelector(`input[name="manualStatus"][value="${status}"]`);
      if (r2) r2.checked = true;

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
    delBtns.forEach(btn => {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
    });

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
      const deletedRow = parsedData[index];
      parsedData.splice(index, 1);
      saveLocal();
      refreshUI();
      if (window.ESSGoogleSync) window.ESSGoogleSync.deleteRow(deletedRow);
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

    if (!tipe || !status) {
      alert("Harap pilih Tipe Hari dan Status");
      return;
    }

    const existIndex = parsedData.findIndex(r => r["Tanggal"] === tgl);
    const newRow = {
      "ID": (existIndex !== -1 && parsedData[existIndex]["ID"]) ? parsedData[existIndex]["ID"] : (crypto.randomUUID ? crypto.randomUUID() : "ess-"+Date.now()+Math.random()),
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
    if (window.ESSGoogleSync) window.ESSGoogleSync.saveRow(newRow);
  }

  function resetData() {
    if (!confirm("Hapus semua data?")) return;
    parsedData = [];
    localStorage.removeItem("sunfishData");
    refreshUI();
    if (window.ESSGoogleSync) window.ESSGoogleSync.replace([]);
  }

  // ========== PARSING .XLSX DENGAN SHEETJS ==========
  function parseXLSXFile(arrayBuffer) {
    try {
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      let currentDate = null;
      let result = [];
      let userData = { nama: '-', id: '-', jabatan: '-' };

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const colA = (row[0] || '').toString().trim();

        // Deteksi baris "Date : "
        if (colA.startsWith('Date : ')) {
          const dateStr = colA.replace('Date : ', '').trim();
          const parts = dateStr.split(' ');
          if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const monthIndex = monthNames.indexOf(parts[1]);
            if (monthIndex !== -1) {
              const month = String(monthIndex + 1).padStart(2, '0');
              const year = parts[2];
              currentDate = `${day}/${month}/${year}`;
            } else {
              // fallback: coba parse langsung
              const d = new Date(dateStr);
              if (!isNaN(d)) {
                currentDate = ddmmyyyy(d);
              }
            }
          }
          continue;
        }

        // Ambil info user dari baris header (Employee, Employee No, Position)
        // Biasanya ada di baris dengan header, tapi kita bisa ambil dari data pertama
        if (row.length >= 4 && !isNaN(parseInt(colA)) && parseInt(colA) > 0 && currentDate) {
          const empName = (row[1] || '').toString().trim();
          const empNo = (row[2] || '').toString().trim();
          const pos = (row[3] || '').toString().trim();
          if (empName) userData.nama = empName;
          if (empNo) userData.id = empNo;
          if (pos) userData.jabatan = pos;

          const dayType = (row[15] || '').toString().trim().toUpperCase();
          const overtimeMinute = parseFloat(row[17] || 0);
          const overtimeIndex = parseFloat(row[18] || 0);
          const status = (row[21] || '').toString().trim().toUpperCase();
          const otherStatus = (row[22] || '').toString().trim().toUpperCase();

          const jamLembur = overtimeMinute / 60;

          result.push({
            "Tanggal": currentDate,
            "Tipe Hari": dayType || "WD",
            "Menit Lembur": overtimeMinute.toString(),
            "Jam Lembur": jamLembur.toFixed(2),
            "Indeks Lembur": overtimeIndex.toString(),
            "Status": status || "PRS",
            "Other Status": otherStatus || ""
          });
        }
      }

      // Update user info jika ditemukan
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

  // ========== PARSING .XLS (HTML) dengan DOMParser (fallback) ==========
  function parseXLS_HTML(fileContent) {
    try {
      const doc = new DOMParser().parseFromString(fileContent, "text/html");
      const table = doc.querySelector("table.tabGen");
      if (!table) {
        throw new Error("Tabel tabGen tidak ditemukan.");
      }
      const rows = table.querySelectorAll("tbody tr");
      const res = [];
      let userData = { nama: '-', id: '-', jabatan: '-' };

      rows.forEach(r => {
        const td = r.querySelectorAll("td");
        if (!td || td.length < 23) return;
        const serial = parseFloat(td[0].textContent.trim());
        let date;
        if (!isNaN(serial)) {
          const excelDate = new Date((serial - 25569) * 86400 * 1000);
          date = excelDate.toLocaleDateString("id-ID");
        } else {
          date = td[0].textContent.trim();
        }
        const empName = td[1].textContent.trim() || '-';
        const empNo = td[2].textContent.trim() || '-';
        const pos = td[3].textContent.trim() || '-';
        if (empName !== '-') userData.nama = empName;
        if (empNo !== '-') userData.id = empNo;
        if (pos !== '-') userData.jabatan = pos;

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

  // ========== HANDLE FILE SELECT ==========
  function handleFileSelect(evt) {
    const file = evt.target.files[0];
    if (!file) return;

    const ext = file.name.toLowerCase();
    if (!ext.endsWith(".xls") && !ext.endsWith(".xlsx")) {
      return alert("Gunakan file .xls atau .xlsx dari ESS");
    }

    const reader = new FileReader();

    if (ext.endsWith(".xlsx")) {
      // Baca sebagai ArrayBuffer untuk SheetJS
      reader.onload = function(e) {
        try {
          const arrayBuffer = e.target.result;
          const parsed = parseXLSXFile(arrayBuffer);
          if (parsed && parsed.length > 0) {
            mergeParsedData(parsed);
            alert(`Data berhasil diimpor! ${parsed.length} baris ditambahkan.`);
          } else {
            alert("Tidak ada data yang ditemukan. Periksa format file.");
          }
        } catch (error) {
          alert("Terjadi kesalahan saat membaca file: " + error.message);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // .xls -> coba dengan DOMParser (HTML)
      reader.onload = function(e) {
        try {
          const content = e.target.result;
          const parsed = parseXLS_HTML(content);
          if (parsed && parsed.length > 0) {
            mergeParsedData(parsed);
            alert(`Data berhasil diimpor! ${parsed.length} baris ditambahkan.`);
          } else {
            alert("Tidak ada data yang ditemukan. Coba gunakan file .xlsx.");
          }
        } catch (error) {
          alert("Terjadi kesalahan saat membaca file: " + error.message);
        }
      };
      reader.readAsText(file);
    }
  }

  function mergeParsedData(newData) {
    newData.forEach(row => {
      const tgl = row["Tanggal"];
      if (!tgl) return;

      const existing = parsedData.findIndex(x => x["Tanggal"] === tgl);
      if (existing >= 0) {
        // Timpa data lama dengan yang baru (biar update)
        if (parsedData[existing]["ID"]) row["ID"] = parsedData[existing]["ID"];
        parsedData[existing] = row;
      } else {
        row["ID"] = row["ID"] || (crypto.randomUUID ? crypto.randomUUID() : "ess-"+Date.now()+Math.random());
        parsedData.push(row);
      }
      if (window.ESSGoogleSync) window.ESSGoogleSync.saveRow(row);
    });

    saveLocal();
    refreshUI();
  }

  // ========== UI REFRESH ==========
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

      const ths = document.querySelectorAll(".data-table th");
      ths.forEach(th => {
        th.style.position = "sticky";
        th.style.top = "0";
        th.style.zIndex = "10";
      });
    }, 100);
  }

  function refreshUI() {
    parsedData.forEach(r => {
      r.dateObj = parseIndoDate(r["Tanggal"]);
    });

    parsedData.sort((a, b) => {
      if (!a.dateObj || !b.dateObj) return 0;
      return a.dateObj - b.dateObj;
    });

    displayData = parsedData.slice();

    if (filterStart || filterEnd) {
      displayData = parsedData.filter(r => {
        if (!r.dateObj) return false;
        if (filterSta
\n/* ===== GOOGLE SHEETS SYNC BRIDGE ===== */\n(function(){\nconst URL="https://script.google.com/macros/s/AKfycbwESrs-vOHhOz0Pglz8uVpLAoRoaaWTLL-Womin4gvwvLUX_9DBSMGoKLP-eEx9DrkX2A/exec", Q="essPendingQueue", LAST="essLastSync";\nconst $q=()=>{try{return JSON.parse(localStorage.getItem(Q)||"[]")}catch(e){return[]}};\nconst saveQ=q=>localStorage.setItem(Q,JSON.stringify(q));\nconst id=()=>crypto.randomUUID?crypto.randomUUID():"ess-"+Date.now()+"-"+Math.random().toString(36).slice(2);\nconst norm=r=>{r=Object.assign({},r);r.ID=r.ID||id();delete r.dateObj;return r};\nfunction stat(t){let e=document.getElementById("syncStatus");if(!e){e=document.createElement("div");e.id="syncStatus";e.style.cssText="margin:8px 0;text-align:center;font:12px Arial";document.querySelector("main")?.prepend(e)}if(e)e.textContent=t}\nfunction call(params){return new Promise((ok,no)=>{if(URL.includes("GANTI_DENGAN"))return no(Error("URL belum diatur"));let cb="esscb"+Date.now()+Math.random().toString(36).slice(2),s=document.createElement("script"),to=setTimeout(()=>{clean();no(Error("timeout"))},15000);function clean(){clearTimeout(to);delete window[cb];s.remove()}window[cb]=x=>{clean();x&&x.ok?ok(x):no(Error(x&&x.error||"gagal"))};params.callback=cb;s.src=URL+(URL.includes("?")?"&":"?")+new URLSearchParams(params);s.onerror=()=>{clean();no(Error("network"))};document.head.appendChild(s)})}\nasync function sync(){try{stat("⟳ Sinkronisasi...");await flush();let r=await call({action:"sync"});if(typeof parsedData!=="undefined"&&!$q().length){parsedData=(r.rows||[]).map(norm);saveLocal();refreshUI()}localStorage.setItem(LAST,new Date().toISOString());stat("✓ Tersinkron")}catch(e){stat(URL.includes("GANTI_DENGAN")?"⚙ Atur URL Google Apps Script":"⚠ Sync gagal/offline")}}\nasync function write(op,row){try{await call({action:op,data:JSON.stringify(row)});return true}catch(e){return false}}\nasync function flush(){let q=$q(),left=[];for(let x of q)if(!(await write(x.op,x.row)))left.push(x);saveQ(left)}\nfunction enqueue(op,row){let q=$q();q.push({op,row:norm(row)});saveQ(q)}\nwindow.ESSGoogleSync={saveRow:r=>{r=norm(r);if(!navigator.onLine||!URL||URL.includes("GANTI_DENGAN"))enqueue("upsert",r);else write("upsert",r).then(x=>{if(!x)enqueue("upsert",r)})},deleteRow:r=>{r=norm(r);if(!navigator.onLine||URL.includes("GANTI_DENGAN"))enqueue("delete",r);else write("delete",r).then(x=>{if(!x)enqueue("delete",r)})},replace:rows=>{if(!navigator.onLine||URL.includes("GANTI_DENGAN"))enqueue("replace",rows);else write("replace",rows).then(x=>{if(!x)enqueue("replace",rows)})},sync};\naddEventListener("online",sync);addEventListener("focus",sync);document.addEventListener("visibilitychange",()=>!document.hidden&&sync());setInterval(sync,60000);setTimeout(sync,500);\n})();\n
