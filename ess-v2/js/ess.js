(function () {
  "use strict";

  // ============================================================
  // KONFIGURASI GAJI
  // ============================================================

  const GAJI_POKOK = 3187965;
  const DAILY_RATE = GAJI_POKOK / 25;
  const OVERTIME_RATE = GAJI_POKOK / 173;
  const MEAL_RATE = 11800;

  const JHT = GAJI_POKOK * 0.02;
  const JP = GAJI_POKOK * 0.01;
  const POTONGAN = JHT + JP;

  // ============================================================
  // STATE
  // ============================================================

  let parsedData = [];

  let user = {
    nama: "-",
    id: "-",
    jabatan: "-"
  };

  let fileInput;
  let summaryOutput;
  let tableOutput;

  let manualTanggal;
  let manualJamLembur;
  let manualMenitLembur;
  let manualIndeks;

  let btnAdd;
  let btnReset;

  let filterStart = null;
  let filterEnd = null;
  let displayData = [];

  // ============================================================
  // HELPER
  // ============================================================

  function $(id) {
    return document.getElementById(id);
  }

  function makeId() {
    try {
      if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
      ) {
        return crypto.randomUUID();
      }
    } catch (e) {}

    return "ess-" + Date.now() + "-" +
      Math.random().toString(36).slice(2);
  }

  function saveLocal() {
    try {
      localStorage.setItem(
        "sunfishData",
        JSON.stringify(parsedData)
      );
    } catch (e) {
      console.error("Gagal menyimpan LocalStorage:", e);
    }
  }

  function loadLocal() {
    try {
      const s = localStorage.getItem("sunfishData");

      if (s) {
        const data = JSON.parse(s);

        if (Array.isArray(data)) {
          parsedData = data;
        }
      }
    } catch (e) {
      console.error("Gagal membaca LocalStorage:", e);
      parsedData = [];
    }
  }

  function saveUser() {
    try {
      localStorage.setItem(
        "userInfo",
        JSON.stringify(user)
      );
    } catch (e) {
      console.error("Gagal menyimpan user:", e);
    }
  }

  function loadUser() {
    try {
      const s = localStorage.getItem("userInfo");

      if (s) {
        const u = JSON.parse(s);

        if (u && typeof u === "object") {
          user = {
            nama: u.nama || "-",
            id: u.id || "-",
            jabatan: u.jabatan || "-"
          };
        }
      }
    } catch (e) {
      console.error("Gagal membaca user:", e);
    }
  }

  // ============================================================
  // FORMAT TANGGAL
  // ============================================================

  function parseIndoDate(str) {
    if (!str) return null;

    if (str instanceof Date) {
      return isNaN(str.getTime()) ? null : str;
    }

    str = String(str).trim();

    // DD/MM/YYYY
    let p = str.split("/");

    if (p.length === 3) {
      const d = parseInt(p[0], 10);
      const m = parseInt(p[1], 10);
      const y = parseInt(p[2], 10);

      if (
        !isNaN(d) &&
        !isNaN(m) &&
        !isNaN(y)
      ) {
        const date = new Date(y, m - 1, d);

        if (
          date.getFullYear() === y &&
          date.getMonth() === m - 1 &&
          date.getDate() === d
        ) {
          return date;
        }
      }
    }

    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split("-").map(Number);
      return new Date(y, m - 1, d);
    }

    const fallback = new Date(str);

    return isNaN(fallback.getTime())
      ? null
      : fallback;
  }

  function ddmmyyyy(d) {
    if (!(d instanceof Date) || isNaN(d.getTime())) {
      return "-";
    }

    return (
      String(d.getDate()).padStart(2, "0") +
      "/" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "/" +
      d.getFullYear()
    );
  }

  function formatRupiah(n) {
    return (
      "Rp " +
      Number(Math.round(Number(n) || 0))
        .toLocaleString("id-ID")
    );
  }

  function parseNumber(value) {
    if (value === null || value === undefined) {
      return 0;
    }

    if (typeof value === "number") {
      return isFinite(value) ? value : 0;
    }

    let s = String(value).trim();

    if (!s) return 0;

    s = s.replace(/\s/g, "");

    // Format Indonesia: 1.234,56
    if (
      s.includes(".") &&
      s.includes(",")
    ) {
      s = s.replace(/\./g, "");
      s = s.replace(",", ".");
    } else if (s.includes(",")) {
      s = s.replace(",", ".");
    }

    const n = parseFloat(s);

    return isFinite(n) ? n : 0;
  }

  // ============================================================
  // PERHITUNGAN LEMBUR
  // ============================================================

  function checkOffDay(jam, tipeHari) {
    const ovh = $("ovh");
    const ovt = $("ovt");
    const off = $("off");
    const prs = $("prs");
    const statusPRS = $("statusPRS");

    if (!ovh || !ovt) return;

    jam = Number(jam) || 0;
    tipeHari = String(tipeHari || "").toUpperCase();

    if (jam <= 0) {
      ovh.checked = false;
      ovt.checked = false;

      if (
        tipeHari === "OFF" ||
        tipeHari === "PHOFF"
      ) {
        if (prs) prs.checked = false;
      }

      return;
    }

    if (tipeHari === "PHOFF") {
      ovh.checked = true;
      ovt.checked = false;

      if (off) off.checked = false;
      if (prs) prs.checked = true;
      if (statusPRS) statusPRS.checked = true;

      return;
    }

    if (
      tipeHari === "WD" ||
      tipeHari === "OFF"
    ) {
      ovh.checked = false;
      ovt.checked = true;

      if (prs) prs.checked = true;
      if (off) off.checked = false;
      if (statusPRS) statusPRS.checked = true;

      return;
    }

    ovh.checked = false;
    ovt.checked = false;

    if (off) off.checked = true;
    if (prs) prs.checked = false;
  }

  function hitungIndeksByJam(jam, tipeHari) {
    jam = Number(jam) || 0;
    tipeHari = String(tipeHari || "").toUpperCase();

    checkOffDay(jam, tipeHari);

    if (jam <= 0) {
      return 0;
    }

    // OFF / PHOFF
    if (
      tipeHari === "OFF" ||
      tipeHari === "PHOFF"
    ) {
      if (jam <= 7) {
        return jam * 2;
      }

      return (
        (7 * 2) +
        ((jam - 7) * 3) +
        2
      );
    }

    // WORKING DAY
    if (tipeHari === "WD") {
      if (jam <= 1) {
        return 1.5;
      }

      return (
        1.5 +
        ((jam - 1) * 2)
      );
    }

    return 0;
  }

  // ============================================================
  // STATISTIK
  // ============================================================

  function calculateStats(data) {
    let hariKerja = 0;
    let cuti = 0;
    let absen = 0;
    let off = 0;

    let totalJam = 0;
    let totalIndeks = 0;
    let meal = 0;

    data.forEach(function (r) {
      const tipe = String(
        r["Tipe Hari"] || ""
      ).toUpperCase();

      const status = String(
        r["Status"] || ""
      ).toUpperCase();

      const other = String(
        r["Other Status"] || ""
      ).toUpperCase();

      if (
        (tipe === "WD" && status === "PRS") ||
        (tipe === "PHOFF" && status === "PRS")
      ) {
        hariKerja++;
      }

      if (
        tipe === "OFF" &&
        status === "PRS"
      ) {
        off++;
      }

      if (status === "ABS") {
        absen++;
      }

      if (
        status === "CT" ||
        status === "CS"
      ) {
        cuti++;
      }

      if (
        other.includes("MEAL") ||
        other.includes("PRS_MEAL")
      ) {
        meal++;
      }

      totalJam += parseNumber(
        r["Jam Lembur"]
      );

      totalIndeks += parseNumber(
        r["Indeks Lembur"]
      );
    });

    const BPJS =
      hariKerja > 0
        ? POTONGAN
        : 0;

    const gajiPokokFinal =
      displayData.length >= 30
        ? GAJI_POKOK
        : hariKerja * DAILY_RATE;

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
      meal,
      gaji
    };
  }

  // ============================================================
  // ESCAPE HTML
  // ============================================================

  function escapeHtml(value) {
    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ============================================================
  // SUMMARY
  // ============================================================

  function generateSummaryHtml(
    stats,
    startLabel,
    endLabel
  ) {
    const startDisplay =
      startLabel || "-";

    const endDisplay =
      endLabel || "-";

    const prevBtn =
      `<button id="prevMonthBtn" ` +
      `class="month-shift-btn">‹</button>`;

    const nextBtn =
      `<button id="nextMonthBtn" ` +
      `class="month-shift-btn">›</button>`;

    return `
      <table class="summary-table">

        <tr>
          <th colspan="2">
            <div class="period-wrapper">
              <div class="period-center">

                ${prevBtn}

                <span
                  id="periodStart"
                  class="period-clickable"
                >
                  ${escapeHtml(startDisplay)}
                </span>

                —

                <span
                  id="periodEnd"
                  class="period-clickable"
                >
                  ${escapeHtml(endDisplay)}
                </span>

                ${nextBtn}

              </div>
            </div>
          </th>
        </tr>

        <tr>
          <td>Nama Karyawan</td>
          <td>${escapeHtml(user.nama)}</td>
        </tr>

        <tr>
          <td>NIK / ID</td>
          <td>${escapeHtml(user.id)}</td>
        </tr>

        <tr>
          <td>Posisi / Jabatan</td>
          <td>${escapeHtml(user.jabatan)}</td>
        </tr>

        <tr>
          <td>Hari Kerja</td>
          <td>${stats.hariKerja}</td>
        </tr>

        <tr>
          <td>Cuti</td>
          <td>${stats.cuti}</td>
        </tr>

        <tr>
          <td>Absen</td>
          <td>${stats.absen}</td>
        </tr>

        <tr>
          <td>Jam Lembur</td>
          <td>
            ${stats.totalJam.toFixed(2)} jam
          </td>
        </tr>

        <tr>
          <td>Indeks Lembur</td>
          <td>
            ${stats.totalIndeks.toFixed(2)}
          </td>
        </tr>

        <tr>
          <td>Estimasi Gaji</td>
          <td>
            ${formatRupiah(stats.gaji)}
          </td>
        </tr>

      </table>
    `;
  }

  // ============================================================
  // CLASS BARIS
  // ============================================================

  function getRowClass(row) {
    const t = String(
      row["Tipe Hari"] || ""
    ).toUpperCase();

    const s = String(
      row["Status"] || ""
    ).toUpperCase();

    if (s === "ABS") return "abs";
    if (s === "CT" || s === "CS") return "ct";
    if (t === "PHOFF") return "phoff";
    if (t === "OFF") return "off";
    if (t === "WD") return "wd";

    return "";
  }

  // ============================================================
  // TABLE
  // ============================================================

  function generateTableHtml(data) {
    if (!data || !data.length) {
      return "";
    }

    const headers = Object.keys(
      data[0]
    ).filter(function (k) {
      return k !== "dateObj";
    });

    let html =
      "<div class='table-responsive' " +
      "id='dataTable'>" +
      "<table class='data-table'>" +
      "<thead><tr>";

    headers.forEach(function (h) {
      html +=
        "<th>" +
        escapeHtml(h) +
        "</th>";
    });

    html +=
      "<th>Aksi</th>" +
      "</tr></thead><tbody>";

    data.forEach(function (row, idx) {
      let dataIdx = Number(
        row.__originalIndex
      );

      if (
        !isFinite(dataIdx) ||
        dataIdx < 0
      ) {
        dataIdx = parsedData.findIndex(
          function (r) {
            return (
              r.ID &&
              row.ID &&
              r.ID === row.ID
            );
          }
        );
      }

      if (dataIdx < 0) {
        dataIdx = idx;
      }

      html +=
        `<tr class="${escapeHtml(
          getRowClass(row)
        )}" ` +
        `data-idx="${dataIdx}" ` +
        `data-tanggal="${escapeHtml(
          row["Tanggal"] || ""
        )}">`;

      headers.forEach(function (h) {
        const cellValue =
          row[h] == null
            ? ""
            : row[h];

        html +=
          "<td>" +
          escapeHtml(cellValue) +
          "</td>";
      });

      html +=
        `<td>
          <button
            class="delBtn"
            data-idx="${dataIdx}"
            type="button"
          >
            ❌
          </button>
        </td>`;

      html += "</tr>";
    });

    html +=
      "</tbody></table></div>";

    return html;
  }

  // ============================================================
  // CLICK BARIS
  // ============================================================

  function setupRowClickHandlers() {
    if (!tableOutput) return;

    tableOutput.onclick =
      function (e) {
        const delBtn =
          e.target.closest(".delBtn");

        if (delBtn) {
          return;
        }

        const tr =
          e.target.closest("tr");

        if (
          !tr ||
          !tr.parentElement ||
          tr.parentElement.tagName !== "TBODY"
        ) {
          return;
        }

        const rowIndex =
          Number(tr.dataset.idx);

        const row =
          parsedData[rowIndex];

        if (!row) {
          return;
        }

        const form =
          document.querySelector(
            ".input-form"
          );

        if (form) {
          form.scrollIntoView({
            behavior: "smooth",
            block: "center"
          });
        }

        const tgl =
          row["Tanggal"] || "";

        const tipeHari =
          row["Tipe Hari"] || "WD";

        const menit =
          row["Menit Lembur"] || "0";

        const jam =
          row["Jam Lembur"] || "0";

        const indeks =
          row["Indeks Lembur"] || "0";

        const status =
          row["Status"] || "PRS";

        const otherText =
          row["Other Status"] || "";

        function toInputDateFormat(t) {
          const d = parseIndoDate(t);

          if (!d) return "";

          return (
            d.getFullYear() +
            "-" +
            String(
              d.getMonth() + 1
            ).padStart(2, "0") +
            "-" +
            String(
              d.getDate()
            ).padStart(2, "0")
          );
        }

        if (manualTanggal) {
          manualTanggal.value =
            toInputDateFormat(tgl);
        }

        if (manualJamLembur) {
          manualJamLembur.value =
            parseNumber(jam);
        }

        if (manualMenitLembur) {
          manualMenitLembur.value =
            parseNumber(menit);
        }

        if (manualIndeks) {
          manualIndeks.value =
            parseNumber(indeks)
              .toFixed(2);
        }

        const r1 =
          document.querySelector(
            `input[name="manualTipeHari"][value="${CSS.escape(
              tipeHari
            )}"]`
          );

        if (r1) {
          r1.checked = true;
        }

        const r2 =
          document.querySelector(
            `input[name="manualStatus"][value="${CSS.escape(
              status
            )}"]`
          );

        if (r2) {
          r2.checked = true;
        }

        document
          .querySelectorAll(
            ".other-status"
          )
          .forEach(function (cb) {
            cb.checked = false;
          });

        if (otherText) {
          otherText
            .split(",")
            .forEach(function (o) {
              const value =
                o.trim();

              const c =
                document.querySelector(
                  `.other-status[value="${CSS.escape(
                    value
                  )}"]`
                );

              if (c) {
                c.checked = true;
              }
            });
        }
      };
  }

  // ============================================================
  // DELETE
  // ============================================================

  function attachDeleteButtons() {
    if (!tableOutput) return;

    tableOutput
      .querySelectorAll(".delBtn")
      .forEach(function (btn) {
        btn.onclick = onDeleteRow;
      });
  }

  function onDeleteRow(e) {
    e.stopPropagation();
    e.preventDefault();

    const idx =
      Number(this.dataset.idx);

    if (
      !isFinite(idx) ||
      idx < 0 ||
      idx >= parsedData.length
    ) {
      alert(
        "Gagal menghapus: data tidak ditemukan."
      );
      return;
    }

    deleteRowByIndex(idx);
  }

  function deleteRowByIndex(index) {
    if (
      !confirm(
        "Hapus baris ini?"
      )
    ) {
      return;
    }

    if (
      index < 0 ||
      index >= parsedData.length
    ) {
      alert(
        "Index tidak valid."
      );
      return;
    }

    const deletedRow =
      parsedData[index];

    parsedData.splice(
      index,
      1
    );

    saveLocal();
    refreshUI();

    if (
      window.ESSGoogleSync &&
      typeof window.ESSGoogleSync.deleteRow ===
        "function"
    ) {
      window.ESSGoogleSync.deleteRow(
        deletedRow
      );
    }
  }

  // ============================================================
  // INPUT MANUAL
  // ============================================================

  function addManualEntry() {
    if (!manualTanggal) {
      return;
    }

    const iso =
      manualTanggal.value;

    if (!iso) {
      alert(
        "Tanggal belum diisi."
      );
      return;
    }

    const parts =
      iso.split("-");

    if (parts.length !== 3) {
      alert(
        "Format tanggal tidak valid."
      );
      return;
    }

    const y = parts[0];
    const m = parts[1];
    const d = parts[2];

    const tgl =
      `${d}/${m}/${y}`;

    const jam =
      parseNumber(
        manualJamLembur &&
        manualJamLembur.value
      );

    const menit =
      Math.round(
        jam * 60
      );

    const tipeEl =
      document.querySelector(
        "input[name='manualTipeHari']:checked"
      );

    const statusEl =
      document.querySelector(
        "input[name='manualStatus']:checked"
      );

    if (!tipeEl || !statusEl) {
      alert(
        "Harap pilih Tipe Hari dan Status."
      );
      return;
    }

    const tipe =
      tipeEl.value;

    const status =
      statusEl.value;

    const other =
      Array.from(
        document.querySelectorAll(
          ".other-status:checked"
        )
      )
        .map(function (c) {
          return c.value;
        })
        .join(",");

    const existIndex =
      parsedData.findIndex(
        function (r) {
          return (
            r["Tanggal"] === tgl
          );
        }
      );

    const existing =
      existIndex !== -1
        ? parsedData[existIndex]
        : null;

    const newRow = {
      ID:
        existing &&
        existing.ID
          ? existing.ID
          : makeId(),

      Tanggal: tgl,

      "Tipe Hari": tipe,

      "Menit Lembur":
        menit,

      "Jam Lembur":
        jam.toFixed(2),

      "Indeks Lembur":
        hitungIndeksByJam(
          jam,
          tipe
        ).toFixed(2),

      Status: status,

      "Other Status":
        other
    };

    if (existIndex !== -1) {
      parsedData[existIndex] =
        newRow;
    } else {
      parsedData.push(
        newRow
      );
    }

    saveLocal();
    refreshUI();

    if (
      window.ESSGoogleSync &&
      typeof window.ESSGoogleSync.saveRow ===
        "function"
    ) {
      window.ESSGoogleSync.saveRow(
        newRow
      );
    }
  }

  // ============================================================
  // RESET
  // ============================================================

  function resetData() {
    if (
      !confirm(
        "Hapus semua data?"
      )
    ) {
      return;
    }

    parsedData = [];

    localStorage.removeItem(
      "sunfishData"
    );

    refreshUI();

    if (
      window.ESSGoogleSync &&
      typeof window.ESSGoogleSync.replace ===
        "function"
    ) {
      window.ESSGoogleSync.replace(
        []
      );
    }
  }

  // ============================================================
  // XLSX PARSER
  // ============================================================

  function parseXLSXFile(arrayBuffer) {
    try {
      if (
        typeof XLSX ===
        "undefined"
      ) {
        throw new Error(
          "Library SheetJS (XLSX) belum tersedia."
        );
      }

      const workbook =
        XLSX.read(
          arrayBuffer,
          {
            type: "array",
            cellDates: false
          }
        );

      if (
        !workbook.SheetNames ||
        !workbook.SheetNames.length
      ) {
        throw new Error(
          "Sheet tidak ditemukan."
        );
      }

      const firstSheet =
        workbook.Sheets[
          workbook.SheetNames[0]
        ];

      const rows =
        XLSX.utils.sheet_to_json(
          firstSheet,
          {
            header: 1,
            defval: ""
          }
        );

      let currentDate = null;

      const result = [];

      let userData = {
        nama: "-",
        id: "-",
        jabatan: "-"
      };

      const monthNames = {
        jan: 1,
        january: 1,

        feb: 2,
        february: 2,

        mar: 3,
        march: 3,

        apr: 4,
        april: 4,

        may: 5,

        jun: 6,
        june: 6,

        jul: 7,
        july: 7,

        aug: 8,
        august: 8,

        sep: 9,
        sept: 9,
        september: 9,

        oct: 10,
        october: 10,

        nov: 11,
        november: 11,

        dec: 12,
        december: 12
      };

      function parseESSDate(value) {
        if (
          value === null ||
          value === undefined ||
          value === ""
        ) {
          return null;
        }

        const s =
          String(value)
            .trim();

        // Date : 01 Jan 2026
        const cleaned =
          s
            .replace(/^Date\s*:\s*/i, "")
            .trim();

        const p =
          cleaned.split(
            /\s+/
          );

        if (p.length >= 3) {
          const day =
            parseInt(
              p[0],
              10
            );

          const month =
            monthNames[
              String(
                p[1]
              ).toLowerCase()
            ];

          const year =
            parseInt(
              p[2],
              10
            );

          if (
            !isNaN(day) &&
            month &&
            !isNaN(year)
          ) {
            return (
              String(day).padStart(
                2,
                "0"
              ) +
              "/" +
              String(month).padStart(
                2,
                "0"
              ) +
              "/" +
              year
            );
          }
        }

        // DD/MM/YYYY
        const d =
          parseIndoDate(
            cleaned
          );

        if (d) {
          return ddmmyyyy(d);
        }

        return null;
      }

      for (
        let i = 0;
        i < rows.length;
        i++
      ) {
        const row =
          rows[i];

        if (
          !Array.isArray(row) ||
          row.length === 0
        ) {
          continue;
        }

        const colA =
          String(
            row[0] ?? ""
          ).trim();

        // --------------------------------------------------------
        // DATE HEADER
        // --------------------------------------------------------

        if (
          /^Date\s*:/i.test(
            colA
          )
        ) {
          const date =
            parseESSDate(
              colA
            );

          if (date) {
            currentDate =
              date;
          }

          continue;
        }

        // --------------------------------------------------------
        // DATA BARIS ESS
        // --------------------------------------------------------

        if (
          row.length >= 4 &&
          currentDate
        ) {
          const serial =
            parseNumber(
              row[0]
            );

          /*
           * Format ESS:
           *
           * 0  = Employee / Serial
           * 1  = Employee Name
           * 2  = Employee No
           * 3  = Position
           * ...
           * 15 = Day Type
           * 17 = Overtime Minute
           * 18 = Overtime Index
           * 21 = Status
           * 22 = Other Status
           */

          if (
            serial > 0
          ) {
            const empName =
              String(
                row[1] ?? ""
              ).trim();

            const empNo =
              String(
                row[2] ?? ""
              ).trim();

            const pos =
              String(
                row[3] ?? ""
              ).trim();

            if (empName) {
              userData.nama =
                empName;
            }

            if (empNo) {
              userData.id =
                empNo;
            }

            if (pos) {
              userData.jabatan =
                pos;
            }

            const dayType =
              String(
                row[15] ?? ""
              )
                .trim()
                .toUpperCase();

            const overtimeMinute =
              parseNumber(
                row[17]
              );

            const overtimeIndex =
              parseNumber(
                row[18]
              );

            const status =
              String(
                row[21] ?? ""
              )
                .trim()
                .toUpperCase();

            const otherStatus =
              String(
                row[22] ?? ""
              )
                .trim()
                .toUpperCase();

            const jamLembur =
              overtimeMinute / 60;

            result.push({
              ID: makeId(),

              Tanggal:
                currentDate,

              "Tipe Hari":
                dayType || "WD",

              "Menit Lembur":
                overtimeMinute,

              "Jam Lembur":
                jamLembur.toFixed(2),

              "Indeks Lembur":
                overtimeIndex.toFixed(2),

              Status:
                status || "PRS",

              "Other Status":
                otherStatus || ""
            });
          }
        }
      }

      if (
        userData.nama !== "-"
      ) {
        user =
          userData;

        saveUser();
      }

      return result;

    } catch (e) {
      console.error(
        "Gagal parsing XLSX:",
        e
      );

      return null;
    }
  }

  // ============================================================
  // XLS HTML PARSER
  // ============================================================

  function parseXLS_HTML(
    fileContent
  ) {
    try {
      const doc =
        new DOMParser()
          .parseFromString(
            fileContent,
            "text/html"
          );

      let table =
        doc.querySelector(
          "table.tabGen"
        );

      if (!table) {
        table =
          doc.querySelector(
            "table"
          );
      }

      if (!table) {
        throw new Error(
          "Tabel ESS tidak ditemukan."
        );
      }

      const rows =
        table.querySelectorAll(
          "tbody tr, tr"
        );

      const res = [];

      let userData = {
        nama: "-",
        id: "-",
        jabatan: "-"
      };

      rows.forEach(
        function (r) {
          const td =
            r.querySelectorAll(
              "td"
            );

          if (
            !td ||
            td.length < 23
          ) {
            return;
          }

          const serial =
            parseNumber(
              td[0].textContent
            );

          let date;

          if (
            !isNaN(serial) &&
            serial > 0
          ) {
            const excelDate =
              new Date(
                Date.UTC(
                  1899,
                  11,
                  30
                ) +
                serial *
                  86400000
              );

            date =
              ddmmyyyy(
                new Date(
                  excelDate.getUTCFullYear(),
                  excelDate.getUTCMonth(),
                  excelDate.getUTCDate()
                )
              );
          } else {
            date =
              td[0]
                .textContent
                .trim();
          }

          const empName =
            td[1]
              .textContent
              .trim() || "-";

          const empNo =
            td[2]
              .textContent
              .trim() || "-";

          const pos =
            td[3]
              .textContent
              .trim() || "-";

          if (
            empName !== "-"
          ) {
            userData.nama =
              empName;
          }

          if (
            empNo !== "-"
          ) {
            userData.id =
              empNo;
          }

          if (
            pos !== "-"
          ) {
            userData.jabatan =
              pos;
          }

          const menitLembur =
            parseNumber(
              td[17]
                .textContent
            );

          const jamLembur =
            menitLembur / 60;

          const tipe =
            td[15]
              .textContent
              .trim()
              .toUpperCase();

          const indeks =
            parseNumber(
              td[18]
                .textContent
            );

          const status =
            td[21]
              .textContent
              .trim()
              .toUpperCase();

          const other =
            td[22]
              .textContent
              .trim()
              .toUpperCase();

          res.push({
            ID: makeId(),

            Tanggal:
              date,

            "Tipe Hari":
              tipe || "WD",

            "Menit Lembur":
              menitLembur,

            "Jam Lembur":
              isNaN(jamLembur)
                ? "0.00"
                : jamLembur.toFixed(2),

            "Indeks Lembur":
              indeks.toFixed(2),

            Status:
              status || "PRS",

            "Other Status":
              other || ""
          });
        }
      );

      if (
        userData.nama !== "-"
      ) {
        user =
          userData;

        saveUser();
      }

      return res;

    } catch (e) {
      console.error(
        "Gagal parsing HTML:",
        e
      );

      return null;
    }
  }

  // ============================================================
  // FILE SELECT
  // ============================================================

  function handleFileSelect(evt) {
    const file =
      evt.target.files &&
      evt.target.files[0];

    if (!file) {
      return;
    }

    const filename =
      file.name.toLowerCase();

    if (
      !filename.endsWith(".xls") &&
      !filename.endsWith(".xlsx")
    ) {
      alert(
        "Gunakan file .xls atau .xlsx dari ESS."
      );

      evt.target.value = "";
      return;
    }

    const reader =
      new FileReader();

    if (
      filename.endsWith(".xlsx")
    ) {
      reader.onload =
        function (e) {
          try {
            const arrayBuffer =
              e.target.result;

            const parsed =
              parseXLSXFile(
                arrayBuffer
              );

            if (
              parsed &&
              parsed.length > 0
            ) {
              mergeParsedData(
                parsed
              );

              alert(
                "Data berhasil diimpor! " +
                parsed.length +
                " baris diproses."
              );
            } else {
              alert(
                "Tidak ada data yang ditemukan. Periksa format file ESS."
              );
            }
          } catch (error) {
            console.error(
              error
            );

            alert(
              "Terjadi kesalahan saat membaca file: " +
              error.message
            );
          } finally {
            evt.target.value = "";
          }
        };

      reader.onerror =
        function () {
          alert(
            "Gagal membaca file."
          );

          evt.target.value = "";
        };

      reader.readAsArrayBuffer(
        file
      );

    } else {
      reader.onload =
        function (e) {
          try {
            const content =
              e.target.result;

            const parsed =
              parseXLS_HTML(
                content
              );

            if (
              parsed &&
              parsed.length > 0
            ) {
              mergeParsedData(
                parsed
              );

              alert(
                "Data berhasil diimpor! " +
                parsed.length +
                " baris diproses."
              );
            } else {
              alert(
                "Tidak ada data yang ditemukan. Coba gunakan file .xlsx."
              );
            }
          } catch (error) {
            console.error(
              error
            );

            alert(
              "Terjadi kesalahan saat membaca file: " +
              error.message
            );
          } finally {
            evt.target.value = "";
          }
        };

      reader.onerror =
        function () {
          alert(
            "Gagal membaca file."
          );

          evt.target.value = "";
        };

      reader.readAsText(
        file
      );
    }
  }

  // ============================================================
  // MERGE DATA
  // ============================================================

  function mergeParsedData(
    newData
  ) {
    if (
      !Array.isArray(newData)
    ) {
      return;
    }

    newData.forEach(
      function (row) {
        const tgl =
          row["Tanggal"];

        if (!tgl) {
          return;
        }

        const existing =
          parsedData.findIndex(
            function (x) {
              return (
                x["Tanggal"] ===
                tgl
              );
            }
          );

        if (existing >= 0) {
          if (
            parsedData[existing].ID
          ) {
            row.ID =
              parsedData[
                existing
              ].ID;
          }

          parsedData[existing] =
            row;

        } else {
          row.ID =
            row.ID ||
            makeId();

          parsedData.push(
            row
          );
        }

        if (
          window.ESSGoogleSync &&
          typeof window.ESSGoogleSync.saveRow ===
            "function"
        ) {
          window.ESSGoogleSync.saveRow(
            row
          );
        }
      }
    );

    saveLocal();
    refreshUI();
  }

  // ============================================================
  // TABLE FIX
  // ============================================================

  function fixedTable() {
    setTimeout(
      function () {
        const tbl =
          document.querySelector(
            ".data-table"
          );

        if (tbl) {
          if (
            !tbl.parentElement.classList.contains(
              "table-wrapper"
            )
          ) {
            const wrap =
              document.createElement(
                "div"
              );

            wrap.className =
              "table-wrapper";

            tbl.parentElement.insertBefore(
              wrap,
              tbl
            );

            wrap.appendChild(
              tbl
            );
          }
        }

        const wrap =
          document.querySelector(
            ".table-wrapper"
          );

        if (wrap) {
          wrap.style.cssText =
            `
              width: 100%;
              max-height: 60vh;
              overflow-y: auto;
              overflow-x: auto;
              margin-top: 0;
              border-radius: 5px;
              background: white;
              position: relative;
            `;
        }

        const ths =
          document.querySelectorAll(
            ".data-table th"
          );

        ths.forEach(
          function (th) {
            th.style.position =
              "sticky";

            th.style.top =
              "0";

            th.style.zIndex =
              "10";
          }
        );
      },
      100
    );
  }

  // ============================================================
  // REFRESH UI
  // ============================================================

  function refreshUI() {
    parsedData.forEach(
      function (r, index) {
        r.dateObj =
          parseIndoDate(
            r["Tanggal"]
          );

        r.__originalIndex =
          index;
      }
    );

    parsedData.sort(
      function (a, b) {
        if (
          !a.dateObj &&
          !b.dateObj
        ) {
          return 0;
        }

        if (!a.dateObj) {
          return 1;
        }

        if (!b.dateObj) {
          return -1;
        }

        return (
          a.dateObj -
          b.dateObj
        );
      }
    );

    // Setelah sorting, update index asli
    parsedData.forEach(
      function (r, index) {
        r.__originalIndex =
          index;
      }
    );

    displayData =
      parsedData.slice();

    if (
      filterStart ||
      filterEnd
    ) {
      displayData =
        parsedData.filter(
          function (r) {
            if (!r.dateObj) {
              return false;
            }

            return (
              (!filterStart ||
                r.dateObj >=
                  filterStart) &&
              (!filterEnd ||
                r.dateObj <=
                  filterEnd)
            );
          }
        );
    }

    const stats =
      calculateStats(
        displayData
      );

    const startLabel =
      filterStart
        ? ddmmyyyy(
            filterStart
          )
        : (
            displayData[0] &&
            displayData[0].Tanggal
          ) ||
          "-";

    const endLabel =
      filterEnd
        ? ddmmyyyy(
            filterEnd
          )
        : (
            displayData[
              displayData.length - 1
            ] &&
            displayData[
              displayData.length - 1
            ].Tanggal
          ) ||
          "-";

    if (summaryOutput) {
      summaryOutput.innerHTML =
        generateSummaryHtml(
          stats,
          startLabel,
          endLabel
        );
    }

    if (tableOutput) {
      tableOutput.innerHTML =
        generateTableHtml(
          displayData
        );
    }

    fixedTable();

    setupRowClickHandlers();
    attachDeleteButtons();
    setupPeriodControls();
  }

  // ============================================================
  // PERIOD CONTROL
  // ============================================================

  function setupPeriodControls() {
    const fs =
      $("filterStartInput");

    const fe =
      $("filterEndInput");

    function setInput(
      el,
      d
    ) {
      if (!el) {
        return;
      }

      if (!d) {
        el.value = "";
        return;
      }

      el.value =
        d.getFullYear() +
        "-" +
        String(
          d.getMonth() + 1
        ).padStart(
          2,
          "0"
        ) +
        "-" +
        String(
          d.getDate()
        ).padStart(
          2,
          "0"
        );
    }

    const ps =
      $("periodStart");

    const pe =
      $("periodEnd");

    const prev =
      $("prevMonthBtn");

    const next =
      $("nextMonthBtn");

    if (ps) {
      ps.onclick =
        function () {
          if (!fs) return;

          setInput(
            fs,
            filterStart
          );

          if (
            typeof fs.showPicker ===
            "function"
          ) {
            try {
              fs.showPicker();
            } catch (e) {
              fs.focus();
            }
          } else {
            fs.focus();
          }
        };
    }

    if (pe) {
      pe.onclick =
        function () {
          if (!fe) return;

          setInput(
            fe,
            filterEnd
          );

          if (
            typeof fe.showPicker ===
            "function"
          ) {
            try {
              fe.showPicker();
            } catch (e) {
              fe.focus();
            }
          } else {
            fe.focus();
          }
        };
    }

    if (prev) {
      prev.onclick =
        function () {
          const base =
            filterStart ||
            (
              displayData[0] &&
              displayData[0].dateObj
            ) ||
            new Date();

          const d =
            new Date(
              base.getFullYear(),
              base.getMonth() - 1,
              1
            );

          filterStart =
            new Date(
              d.getFullYear(),
              d.getMonth(),
              1
            );

          filterEnd =
            new Date(
              d.getFullYear(),
              d.getMonth() + 1,
              0
            );

          refreshUI();
        };
    }

    if (next) {
      next.onclick =
        function () {
          const base =
            filterStart ||
            (
              displayData[0] &&
              displayData[0].dateObj
            ) ||
            new Date();

          const d =
            new Date(
              base.getFullYear(),
              base.getMonth() + 1,
              1
            );

          filterStart =
            new Date(
              d.getFullYear(),
              d.getMonth(),
              1
            );

          filterEnd =
            new Date(
              d.getFullYear(),
              d.getMonth() + 1,
              0
            );

          refreshUI();
        };
    }
  }

  // ============================================================
  // INIT
  // ============================================================

  function init() {
    fileInput =
      $("fileInput");

    summaryOutput =
      $("summaryOutput");

    tableOutput =
      $("tableOutput");

    manualTanggal =
      $("manualTanggal");

    manualJamLembur =
      $("manualJamLembur");

    manualMenitLembur =
      $("manualMenitLembur");

    manualIndeks =
      $("manualIndeks");

    btnAdd =
      $("btnAdd");

    btnReset =
      $("btnReset");

    loadLocal();
    loadUser();

    if (fileInput) {
      fileInput.addEventListener(
        "change",
        handleFileSelect
      );
    }

    if (btnAdd) {
      btnAdd.addEventListener(
        "click",
        addManualEntry
      );
    }

    if (btnReset) {
      btnReset.addEventListener(
        "click",
        resetData
      );
    }

    document
      .querySelectorAll(
        'input[name="manualTipeHari"]'
      )
      .forEach(
        function (r) {
          r.addEventListener(
            "change",
            function () {
              const j =
                parseNumber(
                  manualJamLembur &&
                  manualJamLembur.value
                );

              if (manualIndeks) {
                manualIndeks.value =
                  hitungIndeksByJam(
                    j,
                    r.value
                  ).toFixed(2);
              }
            }
          );
        }
      );

    if (manualJamLembur) {
      manualJamLembur.addEventListener(
        "input",
        function () {
          const selected =
            document.querySelector(
              'input[name="manualTipeHari"]:checked'
            );

          const tipe =
            selected
              ? selected.value
              : "WD";

          const j =
            parseNumber(
              manualJamLembur.value
            );

          if (
            manualMenitLembur
          ) {
            manualMenitLembur.value =
              Math.round(
                j * 60
              );
          }

          if (
            manualIndeks
          ) {
            manualIndeks.value =
              hitungIndeksByJam(
                j,
                tipe
              ).toFixed(2);
          }
        }
      );
    }

    const fs =
      $("filterStartInput");

    const fe =
      $("filterEndInput");

    if (fs) {
      fs.addEventListener(
        "change",
        function () {
          if (!fs.value) {
            filterStart = null;
          } else {
            const [
              y,
              m,
              d
            ] =
              fs.value
                .split("-")
                .map(Number);

            filterStart =
              new Date(
                y,
                m - 1,
                d
              );
          }

          refreshUI();
        }
      );
    }

    if (fe) {
      fe.addEventListener(
        "change",
        function () {
          if (!fe.value) {
            filterEnd = null;
          } else {
            const [
              y,
              m,
              d
            ] =
              fe.value
                .split("-")
                .map(Number);

            filterEnd =
              new Date(
                y,
                m - 1,
                d
              );
          }

          refreshUI();
        }
      );
    }

    const loadWrapper =
      $("load-wrapper");

    if (loadWrapper) {
      loadWrapper.style.display =
        "none";
    }

    refreshUI();
  }

  // ============================================================
  // GOOGLE SHEETS SYNC
  // ============================================================

  const GOOGLE_SHEETS_URL =
    "https://script.google.com/macros/s/AKfycbwESrs-vOHhOz0Pglz8uVpLAoRoaaWTLL-Womin4gvwvLUX_9DBSMGoKLP-eEx9DrkX2A/exec";

  const QUEUE_KEY =
    "essPendingQueue";

  const LAST_SYNC_KEY =
    "essLastSync";

  function queueRead() {
    try {
      const q =
        JSON.parse(
          localStorage.getItem(
            QUEUE_KEY
          ) || "[]"
        );

      return Array.isArray(q)
        ? q
        : [];
    } catch (e) {
      return [];
    }
  }

  function queueSave(q) {
    try {
      localStorage.setItem(
        QUEUE_KEY,
        JSON.stringify(
          q || []
        )
      );
    } catch (e) {
      console.error(
        "Gagal menyimpan queue:",
        e
      );
    }
  }

  function normRow(row) {
    const r =
      Object.assign(
        {},
        row || {}
      );

    r.ID =
      r.ID || makeId();

    delete r.dateObj;
    delete r.__originalIndex;

    return r;
  }

  function syncStatus(text) {
    let e =
      $("syncStatus");

    if (!e) {
      e =
        document.createElement(
          "div"
        );

      e.id =
        "syncStatus";

      e.style.cssText =
        `
          margin: 8px 0;
          text-align: center;
          font: 12px Arial;
        `;

      const main =
        document.querySelector(
          "main"
        );

      if (main) {
        main.prepend(e);
      }
    }

    if (e) {
      e.textContent =
        text;
    }
  }

  function googleCall(params) {
    return new Promise(
      function (
        resolve,
        reject
      ) {
        const callbackName =
          "esscb" +
          Date.now() +
          Math.random()
            .toString(36)
            .slice(2);

        const script =
          document.createElement(
            "script"
          );

        let finished =
          false;

        const timer =
          setTimeout(
            function () {
              cleanup();
              reject(
                new Error(
                  "timeout"
                )
              );
            },
            15000
          );

        function cleanup() {
          if (finished) {
            return;
          }

          finished = true;

          clearTimeout(
            timer
          );

          try {
            delete window[
              callbackName
            ];
          } catch (e) {
            window[
              callbackName
            ] = undefined;
          }

          if (
            script &&
            script.parentNode
          ) {
            script.parentNode.removeChild(
              script
            );
          }
        }

        window[
          callbackName
        ] =
          function (response) {
            cleanup();

            if (
              response &&
              response.ok
            ) {
              resolve(
                response
              );
            } else {
              reject(
                new Error(
                  response &&
                  response.error
                    ? response.error
                    : "Gagal"
                )
              );
            }
          };

        params =
          Object.assign(
            {},
            params,
            {
              callback:
                callbackName
            }
          );

        let query;

        try {
          query =
            new URLSearchParams(
              params
            ).toString();
        } catch (e) {
          cleanup();
          reject(e);
          return;
        }

        script.src =
          GOOGLE_SHEETS_URL +
          "?" +
          query;

        script.onerror =
          function () {
            cleanup();

            reject(
              new Error(
                "network"
              )
            );
          };

        document.head.appendChild(
          script
        );
      }
    );
  }

  async function writeSync(
    op,
    data
  ) {
    try {
      await googleCall({
        action: op,
        data:
          JSON.stringify(
            data
          )
      });

      return true;

    } catch (e) {
      console.warn(
        "Google Sync gagal:",
        op,
        e
      );

      return false;
    }
  }

  async function flushQueue() {
    const q =
      queueRead();

    if (!q.length) {
      return true;
    }

    const left = [];

    for (
      const item of q
    ) {
      if (
        !item ||
        !item.op
      ) {
        continue;
      }

      const ok =
        await writeSync(
          item.op,
          item.row
        );

      if (!ok) {
        left.push(
          item
        );
      }
    }

    queueSave(
      left
    );

    return (
      left.length === 0
    );
  }

  async function syncFromGoogle() {
    if (
      !navigator.onLine
    ) {
      syncStatus(
        "⚠ Offline — data lokal digunakan"
      );

      return;
    }

    try {
      syncStatus(
        "⟳ Sinkronisasi..."
      );

      const queueOK =
        await flushQueue();

      if (!queueOK) {
        throw new Error(
          "queue"
        );
      }

      const response =
        await googleCall({
          action: "sync"
        });

      if (
        response &&
        Array.isArray(
          response.rows
        )
      ) {
        parsedData =
          response.rows.map(
            normRow
          );

        saveLocal();

        refreshUI();
      }

      localStorage.setItem(
        LAST_SYNC_KEY,
        new Date().toISOString()
      );

      syncStatus(
        "✓ Tersinkron"
      );

    } catch (e) {
      console.warn(
        "Sync Google gagal:",
        e
      );

      if (
        navigator.onLine
      ) {
        syncStatus(
          "⚠ Sync gagal — data lokal tetap digunakan"
        );
      } else {
        syncStatus(
          "⚠ Offline — data lokal digunakan"
        );
      }
    }
  }

  // ============================================================
  // PUBLIC GOOGLE SYNC API
  // ============================================================

  window.ESSGoogleSync = {

    saveRow: function (row) {
      const r =
        normRow(row);

      if (
        !navigator.onLine
      ) {
        queueSave(
          [
            ...queueRead(),
            {
              op: "upsert",
              row: r
            }
          ]
        );

        return;
      }

      writeSync(
        "upsert",
        r
      ).then(
        function (ok) {
          if (!ok) {
            queueSave(
              [
                ...queueRead(),
                {
                  op: "upsert",
                  row: r
                }
              ]
            );
          }
        }
      );
    },

    deleteRow: function (row) {
      const r =
        normRow(row);

      if (
        !navigator.onLine
      ) {
        queueSave(
          [
            ...queueRead(),
            {
              op: "delete",
              row: r
            }
          ]
        );

        return;
      }

      writeSync(
        "delete",
        r
      ).then(
        function (ok) {
          if (!ok) {
            queueSave(
              [
                ...queueRead(),
                {
                  op: "delete",
                  row: r
                }
              ]
            );
          }
        }
      );
    },

    replace: function (rows) {
      const data =
        (rows || []).map(
          normRow
        );

      if (
        !navigator.onLine
      ) {
        queueSave(
          [
            ...queueRead(),
            {
              op: "replace",
              row: data
            }
          ]
        );

        return;
      }

      writeSync(
        "replace",
        data
      ).then(
        function (ok) {
          if (!ok) {
            queueSave(
              [
                ...queueRead(),
                {
                  op: "replace",
                  row: data
                }
              ]
            );
          }
        }
      );
    },

    sync:
      syncFromGoogle
  };

  // ============================================================
  // AUTO SYNC
  // ============================================================

  window.addEventListener(
    "online",
    function () {
      syncFromGoogle();
    }
  );

  window.addEventListener(
    "focus",
    function () {
      syncFromGoogle();
    }
  );

  document.addEventListener(
    "visibilitychange",
    function () {
      if (
        !document.hidden
      ) {
        syncFromGoogle();
      }
    }
  );

  setInterval(
    function () {
      if (
        navigator.onLine
      ) {
        syncFromGoogle();
      }
    },
    60000
  );

  // ============================================================
  // START
  // ============================================================

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      function () {
        init();
        syncFromGoogle();
      }
    );
  } else {
    init();
    syncFromGoogle();
  }

})();
