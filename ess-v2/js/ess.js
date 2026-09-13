(function() {

  // ============================================================
  // KONFIGURASI PERHITUNGAN
  // ============================================================

  const GAJI_POKOK = 3187965;
  const DAILY_RATE = GAJI_POKOK / 25;
  const OVERTIME_RATE = GAJI_POKOK / 173;
  const MEAL_RATE = 11800;

  const JHT = GAJI_POKOK * 0.02;
  const JP = GAJI_POKOK * 0.01;
  const POTONGAN = JHT + JP;


  // ============================================================
  // DATA UTAMA
  // ============================================================

  let parsedData = [];

  let user = {
    nama: '-',
    id: '-',
    jabatan: '-'
  };


  // ============================================================
  // ELEMENT UI
  // ============================================================

  let fileInput;
  let summaryOutput;
  let tableOutput;

  let manualTanggal;
  let manualJamLembur;
  let manualMenitLembur;
  let manualIndeks;

  let btnAdd;
  let btnReset;

  let tipeHariRadios;
  let statusRadios;

  let filterStart = null;
  let filterEnd = null;

  let displayData = null;


  // ============================================================
  // HELPER
  // ============================================================

  function $(id) {
    return document.getElementById(id);
  }


  // ============================================================
  // LOCAL STORAGE
  // ============================================================

  function saveLocal() {
    localStorage.setItem(
      "sunfishData",
      JSON.stringify(parsedData)
    );
  }


  function loadLocal() {
    try {
      const s = localStorage.getItem("sunfishData");

      if (s) {
        parsedData = JSON.parse(s);

        if (!Array.isArray(parsedData)) {
          parsedData = [];
        }
      }
    } catch (e) {
      console.error("Gagal membaca data lokal:", e);
      parsedData = [];
    }
  }


  function saveUser() {
    localStorage.setItem(
      "userInfo",
      JSON.stringify(user)
    );
  }


  function loadUser() {
    try {
      const u = localStorage.getItem("userInfo");

      if (u) {
        const parsedUser = JSON.parse(u);

        if (parsedUser && typeof parsedUser === "object") {
          user = Object.assign(
            {
              nama: '-',
              id: '-',
              jabatan: '-'
            },
            parsedUser
          );
        }
      }
    } catch (e) {
      console.error("Gagal membaca user:", e);
    }
  }


  // ============================================================
  // TANGGAL
  // ============================================================

  function parseIndoDate(str) {

    if (!str) return null;

    const p = String(str).split('/');

    if (p.length !== 3) return null;

    const d = parseInt(p[0], 10);
    const m = parseInt(p[1], 10);
    const y = parseInt(p[2], 10);

    if (
      isNaN(d) ||
      isNaN(m) ||
      isNaN(y)
    ) {
      return null;
    }

    return new Date(
      y,
      m - 1,
      d
    );
  }


  function ddmmyyyy(d) {

    if (!d || isNaN(d.getTime())) {
      return '-';
    }

    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }


  function formatInputDate(d) {

    if (!d || isNaN(d.getTime())) {
      return '';
    }

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }


  function formatRupiah(n) {

    return "Rp " +
      Number(
        Math.round(n || 0)
      ).toLocaleString("id-ID");
  }


  // ============================================================
  // LOGIKA OFF DAY / OVERTIME
  // ============================================================

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

      if (
        (tipeHari === "OFF" ||
         tipeHari === "PHOFF") &&
        prs
      ) {
        prs.checked = false;
      }

    } else if (tipeHari === "PHOFF") {

      ovh.checked = true;
      ovt.checked = false;

      if (off) {
        off.checked = false;
      }

      if (prs) {
        prs.checked = true;
      }

      if (statusPRS) {
        statusPRS.checked = true;
      }

    } else if (
      tipeHari === "WD" ||
      tipeHari === "OFF"
    ) {

      ovh.checked = false;
      ovt.checked = true;

      if (prs) {
        prs.checked = true;
      }

      if (off) {
        off.checked = false;
      }

      if (statusPRS) {
        statusPRS.checked = true;
      }

    } else {

      ovh.checked = false;
      ovt.checked = false;

      if (off) {
        off.checked = true;
      }

      if (prs) {
        prs.checked = false;
      }
    }
  }


  function hitungIndeksByJam(jam, tipeHari) {

    jam = Number(jam) || 0;

    checkOffDay(
      jam,
      tipeHari
    );

    if (jam <= 0) {
      return 0;
    }


    if (
      tipeHari === "OFF" ||
      tipeHari === "PHOFF"
    ) {

      if (jam <= 7) {
        return jam * 2;
      }

      return (
        (7 * 2) +
        (jam - 7) * 3 +
        2
      );
    }


    if (tipeHari === "WD") {

      if (jam <= 1) {
        return 1.5;
      }

      return (
        1.5 +
        (jam - 1) * 2
      );
    }


    return 0;
  }


  // ============================================================
  // PERHITUNGAN SUMMARY
  // ============================================================

  function calculateStats(data) {

    let hariKerja = 0;
    let cuti = 0;
    let absen = 0;
    let off = 0;

    let totalJam = 0;
    let totalIndeks = 0;
    let meal = 0;


    data.forEach(r => {

      const tipe =
        (r["Tipe Hari"] || "")
          .toUpperCase();

      const status =
        (r["Status"] || "")
          .toUpperCase();

      const other =
        (r["Other Status"] || "")
          .toUpperCase();


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


      totalJam +=
        parseFloat(
          String(
            r["Jam Lembur"] || "0"
          ).replace(",", ".")
        ) || 0;


      totalIndeks +=
        parseFloat(
          String(
            r["Indeks Lembur"] || "0"
          ).replace(",", ".")
        ) || 0;

    });


    const BPJS =
      Number(hariKerja) > 0
        ? POTONGAN
        : 0;


    const gajiPokokFinal =
      (
        displayData &&
        displayData.length >= 30
      )
        ? GAJI_POKOK
        : (
          hariKerja *
          DAILY_RATE
        );


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


  // ============================================================
  // SUMMARY HTML
  // ============================================================

  function generateSummaryHtml(
    stats,
    startLabel,
    endLabel
  ) {

    const startDisplay =
      startLabel || '-';

    const endDisplay =
      endLabel || '-';


    const prevBtn =
      `<button id="prevMonthBtn" class="month-shift-btn">‹</button>`;

    const nextBtn =
      `<button id="nextMonthBtn" class="month-shift-btn">›</button>`;


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
                >${startDisplay}</span>

                —

                <span
                  id="periodEnd"
                  class="period-clickable"
                >${endDisplay}</span>

                ${nextBtn}

              </div>

            </div>

          </th>
        </tr>


        <tr>
          <td>Nama Karyawan</td>
          <td>${user.nama}</td>
        </tr>

        <tr>
          <td>NIK / ID</td>
          <td>${user.id}</td>
        </tr>

        <tr>
          <td>Posisi / Jabatan</td>
          <td>${user.jabatan}</td>
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
          <td>${stats.totalJam.toFixed(2)} jam</td>
        </tr>

        <tr>
          <td>Indeks Lembur</td>
          <td>${stats.totalIndeks.toFixed(2)}</td>
        </tr>

        <tr>
          <td>Estimasi Gaji</td>
          <td>${formatRupiah(stats.gaji)}</td>
        </tr>

      </table>
    `;
  }


  // ============================================================
  // WARNA / CLASS TABEL
  // ============================================================

  function getRowClass(row) {

    const t =
      (row["Tipe Hari"] || "")
        .toUpperCase();

    const s =
      (row["Status"] || "")
        .toUpperCase();


    if (s === "ABS") {
      return "abs";
    }

    if (
      s === "CT" ||
      s === "CS"
    ) {
      return "ct";
    }

    if (t === "PHOFF") {
      return "phoff";
    }

    if (t === "OFF") {
      return "off";
    }

    if (t === "WD") {
      return "wd";
    }

    return "";
  }


  // ============================================================
  // TABEL DATA
  // ============================================================

  function generateTableHtml(data) {

    if (!data || !data.length) {
      return "";
    }


    const headers =
      Object.keys(data[0])
        .filter(k => k !== "dateObj");


    let html =
      "<div class='table-responsive' id='dataTable'>" +
      "<table class='data-table'>" +
      "<thead><tr>";


    headers.forEach(h => {
      html += `<th>${h}</th>`;
    });


    html +=
      "<th>Aksi</th>" +
      "</tr></thead><tbody>";


    data.forEach((row, idx) => {

      const originalIndex =
        parsedData.findIndex(
          r =>
            r["Tanggal"] ===
            row["Tanggal"]
        );


      const dataIdx =
        originalIndex !== -1
          ? originalIndex
          : idx;


      html += `
        <tr
          class="${getRowClass(row)}"
          data-idx="${dataIdx}"
          data-tanggal="${row["Tanggal"]}"
        >
      `;


      headers.forEach(h => {

        const cellValue =
          row[h] == null
            ? ""
            : row[h];

        html +=
          `<td>${cellValue}</td>`;
      });


      html += `
          <td>
            <button
              class="delBtn"
              data-idx="${dataIdx}"
            >❌</button>
          </td>
        </tr>
      `;
    });


    html +=
      "</tbody></table></div>";


    return html;
  }


  // ============================================================
  // KLIK BARIS TABEL
  // ============================================================

  function setupRowClickHandlers() {

    if (!tableOutput) return;


    tableOutput.onclick =
      function(e) {

        const delBtn =
          e.target.closest('.delBtn');


        if (delBtn) {

          e.stopPropagation();

          return;
        }


        const tr =
          e.target.closest("tr");


        if (
          !tr ||
          !tr.parentElement ||
          tr.parentElement.tagName !== 'TBODY'
        ) {
          return;
        }


        const td =
          tr.querySelectorAll("td");


        if (td.length < 1) {
          return;
        }


        const inputForm =
          document.querySelector(
            ".input-form"
          );


        if (inputForm) {

          inputForm.scrollIntoView({
            behavior: "smooth",
            block: "center"
          });
        }


        const tgl =
          td[0].textContent.trim();

        const tipeHari =
          td[1].textContent.trim();

        const menit =
          td[2].textContent.trim();

        const jam =
          td[3].textContent.trim();

        const indeks =
          td[4].textContent.trim();

        const status =
          td[5].textContent.trim();

        const otherText =
          td[6].textContent.trim();


        function toInputDateFormat(t) {

          const d =
            parseIndoDate(t);

          if (!d) {
            return "";
          }


          return formatInputDate(d);
        }


        manualTanggal.value =
          toInputDateFormat(tgl);

        manualJamLembur.value =
          jam;

        manualMenitLembur.value =
          menit;

        manualIndeks.value =
          indeks.replace(",", ".");


        const r1 =
          document.querySelector(
            `input[name="manualTipeHari"][value="${tipeHari}"]`
          );

        if (r1) {
          r1.checked = true;
        }


        const r2 =
          document.querySelector(
            `input[name="manualStatus"][value="${status}"]`
          );

        if (r2) {
          r2.checked = true;
        }


        document
          .querySelectorAll(".other-status")
          .forEach(cb => {
            cb.checked = false;
          });


        if (otherText !== "") {

          otherText
            .split(",")
            .forEach(o => {

              const value =
                o.trim();

              const c =
                document.querySelector(
                  `.other-status[value="${value}"]`
                );

              if (c) {
                c.checked = true;
              }
            });
        }
      };
  }


  // ============================================================
  // TOMBOL DELETE
  // ============================================================

  function attachDeleteButtons() {

    if (!tableOutput) return;


    const delBtns =
      tableOutput.querySelectorAll(
        '.delBtn'
      );


    delBtns.forEach(btn => {

      const newBtn =
        btn.cloneNode(true);

      btn.parentNode.replaceChild(
        newBtn,
        btn
      );
    });


    const newDelBtns =
      tableOutput.querySelectorAll(
        '.delBtn'
      );


    newDelBtns.forEach(btn => {

      btn.addEventListener(
        'click',
        onDeleteRow
      );
    });
  }


  function onDeleteRow(e) {

    e.stopPropagation();
    e.preventDefault();


    const idx =
      Number(this.dataset.idx);


    if (isNaN(idx)) {

      const row =
        this.closest('tr');


      if (
        row &&
        row.dataset.tanggal
      ) {

        const tanggal =
          row.dataset.tanggal;


        const foundIndex =
          parsedData.findIndex(
            r =>
              r["Tanggal"] ===
              tanggal
          );


        if (foundIndex !== -1) {

          deleteRowByIndex(
            foundIndex
          );

          return;
        }
      }


      alert(
        "Gagal menghapus: Data tidak ditemukan"
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
      index >= 0 &&
      index < parsedData.length
    ) {

      // Simpan row sebelum dihapus.
      // ID tetap INTERNAL dan dipakai
      // untuk delete Google Sheets.
      const deletedRow =
        parsedData[index];


      parsedData.splice(
        index,
        1
      );


      saveLocal();

      refreshUI();


      if (
        window.ESSGoogleSync
      ) {

        window.ESSGoogleSync
          .deleteRow(
            deletedRow
          );
      }

    } else {

      alert(
        "Index tidak valid. Refresh halaman dan coba lagi."
      );
    }
  }


  // ============================================================
  // TAMBAH / UPDATE DATA MANUAL
  // ============================================================

  function addManualEntry() {

    const iso =
      manualTanggal.value;


    if (!iso) {

      alert(
        "Tanggal belum diisi."
      );

      return;
    }


    const [y, m, d] =
      iso.split("-");


    const tgl =
      `${d}/${m}/${y}`;


    const jam =
      parseFloat(
        manualJamLembur.value
      ) || 0;


    const menit =
      Math.round(
        jam * 60
      );


    const tipeElement =
      document.querySelector(
        "input[name='manualTipeHari']:checked"
      );


    const statusElement =
      document.querySelector(
        "input[name='manualStatus']:checked"
      );


    const tipe =
      tipeElement
        ? tipeElement.value
        : "";


    const status =
      statusElement
        ? statusElement.value
        : "";


    const other =
      Array.from(
        document.querySelectorAll(
          ".other-status:checked"
        )
      )
      .map(c => c.value)
      .join(",");


    if (!tipe || !status) {

      alert(
        "Harap pilih Tipe Hari dan Status"
      );

      return;
    }


    const existIndex =
      parsedData.findIndex(
        r =>
          r["Tanggal"] === tgl
      );


    // ========================================================
    // ID HANYA INTERNAL.
    // TIDAK ADA FIELD ID DI FORM.
    // ========================================================

    let rowID = "";


    if (
      existIndex !== -1 &&
      parsedData[existIndex] &&
      parsedData[existIndex]["ID"]
    ) {

      rowID =
        parsedData[existIndex]["ID"];

    } else {

      rowID =
        makeInternalID();
    }


    const newRow = {

      "ID": rowID,

      "Tanggal": tgl,

      "Tipe Hari": tipe,

      "Menit Lembur": menit,

      "Jam Lembur":
        Number(jam).toFixed(2),

      "Indeks Lembur":
        hitungIndeksByJam(
          jam,
          tipe
        ).toFixed(2),

      "Status": status,

      "Other Status": other
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
      window.ESSGoogleSync
    ) {

      window.ESSGoogleSync
        .saveRow(newRow);
    }
  }


  // ============================================================
  // RESET SEMUA DATA
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
      window.ESSGoogleSync
    ) {

      window.ESSGoogleSync
        .replace([]);
    }
  }


  // ============================================================
  // ID INTERNAL
  // ============================================================

  function makeInternalID() {

    if (
      typeof crypto !== "undefined" &&
      crypto.randomUUID
    ) {

      return crypto.randomUUID();
    }


    return (
      "ess-" +
      Date.now() +
      "-" +
      Math.random()
        .toString(36)
        .slice(2)
    );
  }


  // ============================================================
  // PARSING XLSX DENGAN SHEETJS
  // ============================================================

  function parseXLSXFile(
    arrayBuffer
  ) {

    try {

      const workbook =
        XLSX.read(
          arrayBuffer,
          {
            type: 'array'
          }
        );


      const firstSheet =
        workbook.Sheets[
          workbook.SheetNames[0]
        ];


      const rows =
        XLSX.utils.sheet_to_json(
          firstSheet,
          {
            header: 1
          }
        );


      let currentDate = null;

      let result = [];

      let userData = {
        nama: '-',
        id: '-',
        jabatan: '-'
      };


      const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec'
      ];


      for (
        let i = 0;
        i < rows.length;
        i++
      ) {

        const row =
          rows[i];


        if (
          !row ||
          row.length === 0
        ) {
          continue;
        }


        const colA =
          (
            row[0] || ''
          )
          .toString()
          .trim();


        // ------------------------------------------------------
        // Date : 01 Jan 2026
        // ------------------------------------------------------

        if (
          colA.startsWith(
            'Date : '
          )
        ) {

          const dateStr =
            colA
              .replace(
                'Date : ',
                ''
              )
              .trim();


          const parts =
            dateStr.split(' ');


          if (
            parts.length === 3
          ) {

            const day =
              parts[0]
                .padStart(
                  2,
                  '0'
                );


            const monthIndex =
              monthNames.indexOf(
                parts[1]
              );


            if (
              monthIndex !== -1
            ) {

              const month =
                String(
                  monthIndex + 1
                ).padStart(
                  2,
                  '0'
                );


              const year =
                parts[2];


              currentDate =
                `${day}/${month}/${year}`;

            } else {

              const d =
                new Date(
                  dateStr
                );


              if (
                !isNaN(
                  d.getTime()
                )
              ) {

                currentDate =
                  ddmmyyyy(d);
              }
            }
          }


          continue;
        }


        // ------------------------------------------------------
        // DATA KARYAWAN
        // ------------------------------------------------------

        if (
          row.length >= 4 &&
          !isNaN(
            parseInt(
              colA
            )
          ) &&
          parseInt(
            colA
          ) > 0 &&
          currentDate
        ) {

          const empName =
            (
              row[1] || ''
            )
            .toString()
            .trim();


          const empNo =
            (
              row[2] || ''
            )
            .toString()
            .trim();


          const pos =
            (
              row[3] || ''
            )
            .toString()
            .trim();


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
            (
              row[15] || ''
            )
            .toString()
            .trim()
            .toUpperCase();


          const overtimeMinute =
            parseFloat(
              row[17] || 0
            );


          const overtimeIndex =
            parseFloat(
              row[18] || 0
            );


          const status =
            (
              row[21] || ''
            )
            .toString()
            .trim()
            .toUpperCase();


          const otherStatus =
            (
              row[22] || ''
            )
            .toString()
            .trim()
            .toUpperCase();


          const jamLembur =
            overtimeMinute / 60;


          result.push({

            "Tanggal":
              currentDate,

            "Tipe Hari":
              dayType || "WD",

            "Menit Lembur":
              overtimeMinute.toString(),

            "Jam Lembur":
              jamLembur.toFixed(2),

            "Indeks Lembur":
              overtimeIndex.toString(),

            "Status":
              status || "PRS",

            "Other Status":
              otherStatus || ""
          });
        }
      }


      if (
        userData.nama !== '-'
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
  // PARSING XLS HTML
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


      const table =
        doc.querySelector(
          "table.tabGen"
        );


      if (!table) {

        throw new Error(
          "Tabel tabGen tidak ditemukan."
        );
      }


      const rows =
        table.querySelectorAll(
          "tbody tr"
        );


      const res = [];


      let userData = {
        nama: '-',
        id: '-',
        jabatan: '-'
      };


      rows.forEach(r => {

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
          parseFloat(
            td[0]
              .textContent
              .trim()
          );


        let date;


        if (
          !isNaN(serial)
        ) {

          const excelDate =
            new Date(
              (
                serial -
                25569
              ) *
              86400 *
              1000
            );


          date =
            excelDate.toLocaleDateString(
              "id-ID"
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
            .trim() || '-';


        const empNo =
          td[2]
            .textContent
            .trim() || '-';


        const pos =
          td[3]
            .textContent
            .trim() || '-';


        if (
          empName !== '-'
        ) {
          userData.nama =
            empName;
        }


        if (
          empNo !== '-'
        ) {
          userData.id =
            empNo;
        }


        if (
          pos !== '-'
        ) {
          userData.jabatan =
            pos;
        }


        const menitLembur =
          (
            td[17]
              .textContent || ''
          )
          .trim();


        const jamLembur =
          parseFloat(
            menitLembur
          ) / 60;


        res.push({

          "Tanggal":
            date,

          "Tipe Hari":
            (
              td[15]
                .textContent || ''
            )
            .trim()
            .toUpperCase(),

          "Menit Lembur":
            menitLembur,

          "Jam Lembur":
            isNaN(jamLembur)
              ? "0.00"
              : jamLembur.toFixed(2),

          "Indeks Lembur":
            (
              td[18]
                .textContent || ''
            )
            .trim(),

          "Status":
            (
              td[21]
                .textContent || ''
            )
            .trim()
            .toUpperCase(),

          "Other Status":
            (
              td[22]
                .textContent || ''
            )
            .trim()
            .toUpperCase()
        });
      });


      if (
        userData.nama !== '-'
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
  // HANDLE FILE SELECT
  // ============================================================

  function handleFileSelect(evt) {

    const file =
      evt.target.files[0];


    if (!file) {
      return;
    }


    const ext =
      file.name.toLowerCase();


    if (
      !ext.endsWith(".xls") &&
      !ext.endsWith(".xlsx")
    ) {

      alert(
        "Gunakan file .xls atau .xlsx dari ESS"
      );

      return;
    }


    const reader =
      new FileReader();


    // ========================================================
    // XLSX
    // ========================================================

    if (
      ext.endsWith(".xlsx")
    ) {

      reader.onload =
        function(e) {

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
                `Data berhasil diimpor! ${parsed.length} baris ditambahkan.`
              );

            } else {

              alert(
                "Tidak ada data yang ditemukan. Periksa format file."
              );
            }

          } catch (error) {

            alert(
              "Terjadi kesalahan saat membaca file: " +
              error.message
            );
          }
        };


      reader.readAsArrayBuffer(
        file
      );


    // ========================================================
    // XLS
    // ========================================================

    } else {

      reader.onload =
        function(e) {

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
                `Data berhasil diimpor! ${parsed.length} baris ditambahkan.`
              );

            } else {

              alert(
                "Tidak ada data yang ditemukan. Coba gunakan file .xlsx."
              );
            }

          } catch (error) {

            alert(
              "Terjadi kesalahan saat membaca file: " +
              error.message
            );
          }
        };


      reader.readAsText(
        file
      );
    }
  }


  // ============================================================
  // MERGE IMPORT DATA
  // ============================================================

  function mergeParsedData(
    newData
  ) {

    newData.forEach(row => {

      const tgl =
        row["Tanggal"];


      if (!tgl) {
        return;
      }


      const existing =
        parsedData.findIndex(
          x =>
            x["Tanggal"] === tgl
        );


      if (existing >= 0) {

        // Pertahankan ID internal
        // dari data lama.
        if (
          parsedData[existing]["ID"]
        ) {

          row["ID"] =
            parsedData[existing]["ID"];
        }


        parsedData[existing] =
          row;

      } else {

        // Buat ID internal.
        row["ID"] =
          row["ID"] ||
          makeInternalID();


        parsedData.push(
          row
        );
      }


      if (
        window.ESSGoogleSync
      ) {

        window.ESSGoogleSync
          .saveRow(row);
      }
    });


    saveLocal();

    refreshUI();
  }


  // ============================================================
  // FIXED TABLE
  // ============================================================

  function fixedTable() {

    setTimeout(() => {

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


          tbl.parentElement
            .insertBefore(
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


      const ths =
        document.querySelectorAll(
          ".data-table th"
        );


      ths.forEach(th => {

        th.style.position =
          "sticky";

        th.style.top =
          "0";

        th.style.zIndex =
          "10";
      });

    }, 100);
  }


  // ============================================================
  // REFRESH UI
  // ============================================================

  function refreshUI() {

    parsedData.forEach(r => {

      r.dateObj =
        parseIndoDate(
          r["Tanggal"]
        );
    });


    parsedData.sort(
      (a, b) => {

        if (
          !a.dateObj ||
          !b.dateObj
        ) {
          return 0;
        }

        return (
          a.dateObj -
          b.dateObj
        );
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
          r => {

            if (!r.dateObj) {
              return false;
            }


            if (
              filterStart &&
              r.dateObj <
              filterStart
            ) {
              return false;
            }


            if (
              filterEnd &&
              r.dateObj >
              filterEnd
            ) {
              return false;
            }


            return true;
          }
        );
    }


    if (tableOutput) {

      tableOutput.innerHTML =
        generateTableHtml(
          displayData
        );


      setupRowClickHandlers();

      attachDeleteButtons();
    }


    const stats =
      calculateStats(
        displayData
      );


    if (
      displayData.length
    ) {

      const startLabel =
        displayData[0]["Tanggal"];

      const endLabel =
        displayData[
          displayData.length - 1
        ]["Tanggal"];


      if (summaryOutput) {

        summaryOutput.innerHTML =
          generateSummaryHtml(
            stats,
            startLabel,
            endLabel
          );
      }

    } else {

      const startLabel =
        filterStart
          ? ddmmyyyy(filterStart)
          : (
            parsedData[0]
              ? parsedData[0]["Tanggal"]
              : '-'
          );


      const endLabel =
        filterEnd
          ? ddmmyyyy(filterEnd)
          : (
            parsedData[
              parsedData.length - 1
            ]
              ? parsedData[
                  parsedData.length - 1
                ]["Tanggal"]
              : '-'
          );


      if (summaryOutput) {

        summaryOutput.innerHTML =
          generateSummaryHtml(
            stats,
            startLabel,
            endLabel
          );
      }
    }


    saveLocal();

    attachPeriodHandlers();

    fixedTable();
  }


  // ============================================================
  // OTHER STATUS
  // ============================================================

  function updateOtherStatus(
    tipeHari
  ) {

    const checkboxes =
      document.querySelectorAll(
        '.other-status'
      );


    checkboxes.forEach(
      cb => cb.checked = false
    );


    if (
      tipeHari === 'WD'
    ) {

      if ($('eai')) {
        $('eai').checked = true;
      }

      if ($('prs')) {
        $('prs').checked = true;
      }

      if ($('prsmeal')) {
        $('prsmeal').checked = true;
      }

      if ($('statusPRS')) {
        $('statusPRS').checked = true;
      }
    }
  }


  // ============================================================
  // STATUS
  // ============================================================

  function updateStatus(
    status
  ) {

    const checkboxes =
      document.querySelectorAll(
        '.other-status'
      );


    checkboxes.forEach(
      cb => cb.checked = false
    );


    if (
      status === 'PRS' &&
      $('tipeHariWD') &&
      $('tipeHariWD').checked === true
    ) {

      if ($('eai')) {
        $('eai').checked = true;
      }

      if ($('prs')) {
        $('prs').checked = true;
      }

      if ($('prsmeal')) {
        $('prsmeal').checked = true;
      }

    } else if (
      status === 'ABS'
    ) {

      if ($('tipeHariWD')) {
        $('tipeHariWD').checked = true;
      }

      if ($('abs')) {
        $('abs').checked = true;
      }

    } else if (
      status === 'OFF'
    ) {

      if ($('tipeHariOFF')) {
        $('tipeHariOFF').checked = true;
      }

      if ($('off')) {
        $('off').checked = true;
      }

    } else if (
      status === 'CT'
    ) {

      if ($('tipeHariWD')) {
        $('tipeHariWD').checked = true;
      }

      if ($('ct')) {
        $('ct').checked = true;
      }
    }
  }


  // ============================================================
  // PERIOD HANDLERS
  // ============================================================

  function attachPeriodHandlers() {

    const startSpan =
      document.getElementById(
        'periodStart'
      );

    const endSpan =
      document.getElementById(
        'periodEnd'
      );


    const prev =
      document.getElementById(
        "prevMonthBtn"
      );

    const next =
      document.getElementById(
        "nextMonthBtn"
      );


    if (prev) {

      prev.onclick =
        () => shiftMonth(-1);
    }


    if (next) {

      next.onclick =
        () => shiftMonth(+1);
    }


    if (startSpan) {

      startSpan.onclick =
        onStartClick;
    }


    if (endSpan) {

      endSpan.onclick =
        onEndClick;
    }
  }


  function shiftMonth(
    offset
  ) {

    if (
      !filterStart ||
      !filterEnd
    ) {

      if (
        !parsedData ||
        !parsedData.length
      ) {
        return;
      }


      parsedData.forEach(
        r => {

          r.dateObj =
            parseIndoDate(
              r["Tanggal"]
            );
        }
      );


      parsedData.sort(
        (a, b) =>
          (
            a.dateObj &&
            b.dateObj
          )
            ? a.dateObj -
              b.dateObj
            : 0
      );


      const first =
        parsedData[0];

      const last =
        parsedData[
          parsedData.length - 1
        ];


      if (!first || !last) {
        return;
      }


      filterStart =
        first.dateObj
          ? new Date(
              first.dateObj
            )
          : parseIndoDate(
              first["Tanggal"]
            );


      filterEnd =
        last.dateObj
          ? new Date(
              last.dateObj
            )
          : parseIndoDate(
              last["Tanggal"]
            );
    }


    const s =
      new Date(
        filterStart
      );

    const e =
      new Date(
        filterEnd
      );


    s.setMonth(
      s.getMonth() +
      offset
    );

    e.setMonth(
      e.getMonth() +
      offset
    );


    filterStart =
      s;

    filterEnd =
      e;


    try {

      localStorage.setItem(
        "filterStart",
        formatInputDate(s)
      );

      localStorage.setItem(
        "filterEnd",
        formatInputDate(e)
      );

    } catch (err) {}


    const fsi =
      $('filterStartInput');

    const fei =
      $('filterEndInput');


    if (fsi) {
      fsi.value =
        formatInputDate(s);
    }


    if (fei) {
      fei.value =
        formatInputDate(e);
    }


    refreshUI();
  }


  // ============================================================
  // KLIK PERIODE
  // ============================================================

  function onStartClick() {

    const input =
      $('filterStartInput');


    if (!input) {
      return;
    }


    const span =
      document.getElementById(
        'periodStart'
      );


    if (!span) {
      return;
    }


    const txt =
      span.innerText.trim();


    const p =
      txt.split('/');


    if (
      p.length === 3
    ) {

      input.value =
        `${p[2]}-${p[1]}-${p[0]}`;
    }


    if (
      input.showPicker
    ) {

      try {
        input.showPicker();
        return;
      } catch (e) {}
    }


    input.click();
  }


  function onEndClick() {

    const input =
      $('filterEndInput');


    if (!input) {
      return;
    }


    const span =
      document.getElementById(
        'periodEnd'
      );


    if (!span) {
      return;
    }


    const txt =
      span.innerText.trim();


    const p =
      txt.split('/');


    if (
      p.length === 3
    ) {

      input.value =
        `${p[2]}-${p[1]}-${p[0]}`;
    }


    if (
      input.showPicker
    ) {

      try {
        input.showPicker();
        return;
      } catch (e) {}
    }


    input.click();
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


  let syncPromise = null;


  function syncStatus(text) {

    let el =
      document.getElementById(
        "syncStatus"
      );


    if (!el) {

      el =
        document.createElement(
          "div"
        );


      el.id =
        "syncStatus";


      el.style.cssText =
        "margin:8px 0;text-align:center;font:12px Arial";


      const main =
        document.querySelector(
          "main"
        );


      if (main) {

        main.prepend(el);

      } else {

        document.body.prepend(el);
      }
    }


    el.textContent =
      text;
  }


  function queueRead() {

    try {

      return JSON.parse(
        localStorage.getItem(
          QUEUE_KEY
        ) || "[]"
      );

    } catch (e) {

      return [];
    }
  }


  function queueSave(q) {

    localStorage.setItem(
      QUEUE_KEY,
      JSON.stringify(q)
    );
  }


  // ============================================================
  // NORMALISASI ROW UNTUK GOOGLE SHEETS
  //
  // ID tetap INTERNAL.
  // Tidak pernah membuat input ID.
  // ============================================================

  function normalizeSyncRow(
    row
  ) {

    const r =
      Object.assign(
        {},
        row || {}
      );


    if (!r.ID) {
      r.ID =
        makeInternalID();
    }


    // Informasi karyawan.
    if (
      !r.Nama ||
      r.Nama === "-"
    ) {
      r.Nama =
        user.nama || "";
    }


    if (
      !r.NIK ||
      r.NIK === "-"
    ) {
      r.NIK =
        user.id || "";
    }


    if (
      !r.Jabatan ||
      r.Jabatan === "-"
    ) {
      r.Jabatan =
        user.jabatan || "";
    }


    // Properti internal UI
    // tidak dikirim.
    delete r.dateObj;
    delete r.__originalIndex;


    // UpdatedAt dibuat oleh
    // Code.gs.
    delete r.UpdatedAt;


    return r;
  }


  // ============================================================
  // GET / JSONP
  //
  // HANYA untuk membaca/sync.
  // ============================================================

  function googleGet(
    params
  ) {

    return new Promise(
      (resolve, reject) => {

        const callbackName =
          "esscb_" +
          Date.now() +
          "_" +
          Math.random()
            .toString(36)
            .slice(2);


        const script =
          document.createElement(
            "script"
          );


        let finished = false;


        const timer =
          setTimeout(
            () => {

              cleanup();

              reject(
                new Error(
                  "Timeout sinkronisasi"
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
            script.parentNode
          ) {

            script.parentNode
              .removeChild(
                script
              );
          }
        }


        window[
          callbackName
        ] =
          function(result) {

            cleanup();


            if (
              result &&
              result.success !== false
            ) {

              resolve(result);

            } else {

              reject(
                new Error(
                  (
                    result &&
                    result.error
                  ) ||
                  "Gagal mengambil data Google Sheets"
                )
              );
            }
          };


        script.onerror =
          function() {

            cleanup();

            reject(
              new Error(
                "Network error"
              )
            );
          };


        const query =
          Object.assign(
            {},
            params || {},
            {
              callback:
                callbackName
            }
          );


        script.src =
          GOOGLE_SHEETS_URL +
          "?" +
          new URLSearchParams(
            query
          ).toString();


        document.head.appendChild(
          script
        );
      }
    );
  }


  // ============================================================
  // POST
  //
  // Cocok dengan:
  //
  // doPost(e)
  // e.parameter.data
  //
  // ============================================================

  async function googlePost(
    action,
    payload
  ) {

    const body =
      Object.assign(
        {
          action:
            action
        },
        payload || {}
      );


    const response =
      await fetch(
        GOOGLE_SHEETS_URL,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded;charset=UTF-8"
          },

          body:
            new URLSearchParams({
              data:
                JSON.stringify(
                  body
                )
            }).toString()
        }
      );


    if (!response.ok) {

      throw new Error(
        "HTTP " +
        response.status
      );
    }


    const result =
      await response.json();


    if (
      !result ||
      result.success === false
    ) {

      throw new Error(
        (
          result &&
          result.error
        ) ||
        "Google Sheets gagal memproses data"
      );
    }


    return result;
  }


  // ============================================================
  // WRITE SYNC
  // ============================================================

  async function writeSync(
    operation,
    data
  ) {

    // ----------------------------------------------------------
    // UPSERT
    // ----------------------------------------------------------

    if (
      operation === "upsert"
    ) {

      const row =
        normalizeSyncRow(
          data
        );


      await googlePost(
        "upsert",
        {
          rows: [row]
        }
      );


      return true;
    }


    // ----------------------------------------------------------
    // DELETE
    // ----------------------------------------------------------

    if (
      operation === "delete"
    ) {

      const id =
        String(
          (
            data &&
            data.ID
          ) || ""
        );


      if (!id) {

        throw new Error(
          "ID data untuk penghapusan kosong"
        );
      }


      await googlePost(
        "delete",
        {
          ids: [id]
        }
      );


      return true;
    }


    // ----------------------------------------------------------
    // REPLACE
    // ----------------------------------------------------------

    if (
      operation === "replace"
    ) {

      const rows =
        Array.isArray(data)
          ? data
          : [];


      await googlePost(
        "replace",
        {
          rows:
            rows.map(
              normalizeSyncRow
            )
        }
      );


      return true;
    }


    throw new Error(
      "Operasi sync tidak dikenal: " +
      operation
    );
  }


  // ============================================================
  // FLUSH QUEUE
  // ============================================================

  async function flushQueue() {

    const queue =
      queueRead();


    if (!queue.length) {
      return true;
    }


    const remaining = [];


    for (
      const item of queue
    ) {

      if (
        !item ||
        !item.op
      ) {
        continue;
      }


      try {

        if (
          item.op ===
          "replace"
        ) {

          await writeSync(
            "replace",
            Array.isArray(
              item.row
            )
              ? item.row
              : []
          );

        } else {

          await writeSync(
            item.op,
            item.row
          );
        }

      } catch (e) {

        console.error(
          "ESS queue:",
          e
        );


        remaining.push(
          item
        );
      }
    }


    queueSave(
      remaining
    );


    return (
      remaining.length === 0
    );
  }


  // ============================================================
  // SYNC DARI GOOGLE
  // ============================================================

  async function syncFromGoogle() {

    if (syncPromise) {
      return syncPromise;
    }


    syncPromise =
      (async () => {

        try {

          if (!navigator.onLine) {

            syncStatus(
              "⚠ Offline — data lokal digunakan"
            );

            return;
          }


          syncStatus(
            "⟳ Sinkronisasi..."
          );


          // Kirim queue terlebih
          // dahulu.
          if (
            !(await flushQueue())
          ) {

            throw new Error(
              "Masih ada data dalam queue"
            );
          }


          // GET/JSONP hanya
          // untuk membaca.
          const result =
            await googleGet({
              action:
                "sync"
            });


          const rows =
            Array.isArray(
              result.rows
            )
              ? result.rows
              : [];


          parsedData =
            rows.map(
              normalizeSyncRow
            );


          // Informasi user dari
          // server bila tersedia.
          const userRow =
            parsedData.find(
              r =>
                r.Nama ||
                r.NIK ||
                r.Jabatan
            );


          if (userRow) {

            if (
              userRow.Nama
            ) {

              user.nama =
                String(
                  userRow.Nama
                );
            }


            if (
              userRow.NIK
            ) {

              user.id =
                String(
                  userRow.NIK
                );
            }


            if (
              userRow.Jabatan
            ) {

              user.jabatan =
                String(
                  userRow.Jabatan
                );
            }


            saveUser();
          }


          saveLocal();

          refreshUI();


          localStorage.setItem(
            LAST_SYNC_KEY,
            new Date().toISOString()
          );


          syncStatus(
            "✓ Tersinkron"
          );


        } catch (e) {

          console.warn(
            "Google Sheets sync gagal:",
            e
          );


          syncStatus(
            navigator.onLine
              ? "⚠ Sync gagal — data lokal tetap digunakan"
              : "⚠ Offline — data lokal digunakan"
          );


        } finally {

          syncPromise =
            null;
        }

      })();


    return syncPromise;
  }


  // ============================================================
  // GOOGLE SYNC API
  // ============================================================

  window.ESSGoogleSync = {

    // ----------------------------------------------------------
    // SAVE / UPDATE
    // ----------------------------------------------------------

    saveRow: function(row) {

      const normalized =
        normalizeSyncRow(
          row
        );


      const item = {
        op:
          "upsert",

        row:
          normalized
      };


      if (
        !navigator.onLine
      ) {

        queueSave([
          ...queueRead(),
          item
        ]);

        return;
      }


      writeSync(
        "upsert",
        normalized
      )
      .catch(
        function(e) {

          console.warn(
            "ESS saveRow gagal:",
            e
          );


          queueSave([
            ...queueRead(),
            item
          ]);
        }
      );
    },


    // ----------------------------------------------------------
    // DELETE
    // ----------------------------------------------------------

    deleteRow: function(row) {

      const id =
        String(
          (
            row &&
            row.ID
          ) || ""
        );


      if (!id) {

        console.error(
          "ESS deleteRow: ID tidak ditemukan",
          row
        );

        return;
      }


      const deleteData = {
        ID:
          id
      };


      const item = {
        op:
          "delete",

        row:
          deleteData
      };


      if (
        !navigator.onLine
      ) {

        queueSave([
          ...queueRead(),
          item
        ]);

        return;
      }


      writeSync(
        "delete",
        deleteData
      )
      .catch(
        function(e) {

          console.warn(
            "ESS deleteRow gagal:",
            e
          );


          queueSave([
            ...queueRead(),
            item
          ]);
        }
      );
    },


    // ----------------------------------------------------------
    // REPLACE
    // ----------------------------------------------------------

    replace: function(rows) {

      const data =
        Array.isArray(rows)
          ? rows.map(
              normalizeSyncRow
            )
          : [];


      const item = {
        op:
          "replace",

        row:
          data
      };


      if (
        !navigator.onLine
      ) {

        queueSave([
          ...queueRead(),
          item
        ]);

        return;
      }


      writeSync(
        "replace",
        data
      )
      .catch(
        function(e) {

          console.warn(
            "ESS replace gagal:",
            e
          );


          queueSave([
            ...queueRead(),
            item
          ]);
        }
      );
    },


    // ----------------------------------------------------------
    // MANUAL SYNC
    // ----------------------------------------------------------

    sync:
      syncFromGoogle
  };


  // ============================================================
  // AUTO SYNC
  // ============================================================

  window.addEventListener(
    "online",
    function() {
      syncFromGoogle();
    }
  );


  window.addEventListener(
    "focus",
    function() {
      syncFromGoogle();
    }
  );


  document.addEventListener(
    "visibilitychange",
    function() {

      if (
        !document.hidden
      ) {

        syncFromGoogle();
      }
    }
  );


  setInterval(
    function() {

      if (
        navigator.onLine
      ) {

        syncFromGoogle();
      }

    },
    60000
  );


  // ============================================================
  // INITIALIZATION
  // ============================================================

  document.addEventListener(
    'DOMContentLoaded',
    () => {

      fileInput =
        $('fileInput');

      summaryOutput =
        $('summaryOutput');

      tableOutput =
        $('tableOutput');


      manualTanggal =
        $('manualTanggal');

      manualJamLembur =
        $('manualJamLembur');

      manualMenitLembur =
        $('manualMenitLembur');

      manualIndeks =
        $('manualIndeks');


      btnAdd =
        $('btnAdd');

      btnReset =
        $('btnReset');


      tipeHariRadios =
        document.querySelectorAll(
          'input[name="manualTipeHari"]'
        );


      statusRadios =
        document.querySelectorAll(
          'input[name="manualStatus"]'
        );


      loadLocal();

      loadUser();


      // --------------------------------------------------------
      // LOAD FILTER
      // --------------------------------------------------------

      const fs =
        localStorage.getItem(
          'filterStart'
        );

      const fe =
        localStorage.getItem(
          'filterEnd'
        );


      if (fs) {

        const p =
          fs.split("-");


        filterStart =
          new Date(
            parseInt(
              p[0],
              10
            ),
            parseInt(
              p[1],
              10
            ) - 1,
            parseInt(
              p[2],
              10
            )
          );


        const input =
          $('filterStartInput');


        if (input) {
          input.value =
            fs;
        }
      }


      if (fe) {

        const p =
          fe.split("-");


        filterEnd =
          new Date(
            parseInt(
              p[0],
              10
            ),
            parseInt(
              p[1],
              10
            ) - 1,
            parseInt(
              p[2],
              10
            )
          );


        const input =
          $('filterEndInput');


        if (input) {
          input.value =
            fe;
        }
      }


      // --------------------------------------------------------
      // TANGGAL DEFAULT
      // --------------------------------------------------------

      if (manualTanggal) {

        const now =
          new Date();


        manualTanggal.value =
          formatInputDate(
            now
          );
      }


      // --------------------------------------------------------
      // FILE INPUT
      // --------------------------------------------------------

      if (fileInput) {

        fileInput.addEventListener(
          'change',
          handleFileSelect
        );
      }


      // --------------------------------------------------------
      // JAM LEMBUR
      // --------------------------------------------------------

      if (manualJamLembur) {

        manualJamLembur.addEventListener(
          'input',
          () => {

            const jam =
              parseFloat(
                manualJamLembur.value
              ) || 0;


            if (
              manualMenitLembur
            ) {

              manualMenitLembur.value =
                Math.round(
                  jam * 60
                );
            }


            const tipeElement =
              document.querySelector(
                "input[name='manualTipeHari']:checked"
              );


            const tipe =
              tipeElement
                ? tipeElement.value
                : "WD";


            if (
              manualIndeks
            ) {

              manualIndeks.value =
                hitungIndeksByJam(
                  jam,
                  tipe
                ).toFixed(2);
            }
          }
        );
      }


      // --------------------------------------------------------
      // MENIT LEMBUR
      // --------------------------------------------------------

      if (manualMenitLembur) {

        manualMenitLembur.addEventListener(
          'input',
          () => {

            const menit =
              parseFloat(
                manualMenitLembur.value
              ) || 0;


            const jam =
              menit / 60;


            if (
              manualJamLembur
            ) {

              manualJamLembur.value =
                jam.toFixed(2);
            }


            const tipeElement =
              document.querySelector(
                "input[name='manualTipeHari']:checked"
              );


            const tipe =
              tipeElement
                ? tipeElement.value
                : "WD";


            if (
              manualIndeks
            ) {

              manualIndeks.value =
                hitungIndeksByJam(
                  jam,
                  tipe
                ).toFixed(2);
            }
          }
        );
      }


      // --------------------------------------------------------
      // BUTTON ADD
      // --------------------------------------------------------

      if (btnAdd) {

        btnAdd.addEventListener(
          'click',
          e => {

            e.preventDefault();

            addManualEntry();
          }
        );
      }


      // --------------------------------------------------------
      // BUTTON RESET
      // --------------------------------------------------------

      if (btnReset) {

        btnReset.addEventListener(
          'click',
          e => {

            e.preventDefault();

            resetData();
          }
        );
      }


      // --------------------------------------------------------
      // TIPE HARI
      // --------------------------------------------------------

      tipeHariRadios.forEach(
        r => {

          r.addEventListener(
            'change',
            () => {

              if (r.checked) {

                updateOtherStatus(
                  r.value
                );


                const jam =
                  parseFloat(
                    manualJamLembur
                      ? manualJamLembur.value
                      : 0
                  ) || 0;


                if (
                  manualIndeks
                ) {

                  manualIndeks.value =
                    hitungIndeksByJam(
                      jam,
                      r.value
                    ).toFixed(2);
                }
              }
            }
          );
        }
      );


      // --------------------------------------------------------
      // STATUS
      // --------------------------------------------------------

      statusRadios.forEach(
        r => {

          r.addEventListener(
            'change',
            () => {

              if (r.checked) {

                updateStatus(
                  r.value
                );
              }
            }
          );
        }
      );


      // --------------------------------------------------------
      // FILTER START
      // --------------------------------------------------------

      const filterStartInput =
        $('filterStartInput');


      if (
        filterStartInput
      ) {

        filterStartInput.addEventListener(
          'change',
          e => {

            const v =
              e.target.value;


            if (!v) {

              filterStart =
                null;


              localStorage.removeItem(
                'filterStart'
              );


              refreshUI();

              return;
            }


            const parts =
              v.split('-');


            filterStart =
              new Date(
                parseInt(
                  parts[0],
                  10
                ),
                parseInt(
                  parts[1],
                  10
                ) - 1,
                parseInt(
                  parts[2],
                  10
                )
              );


            localStorage.setItem(
              'filterStart',
              v
            );


            refreshUI();
          }
        );
      }


      // --------------------------------------------------------
      // FILTER END
      // --------------------------------------------------------

      const filterEndInput =
        $('filterEndInput');


      if (
        filterEndInput
      ) {

        filterEndInput.addEventListener(
          'change',
          e => {

            const v =
              e.target.value;


            if (!v) {

              filterEnd =
                null;


              localStorage.removeItem(
                'filterEnd'
              );


              refreshUI();

              return;
            }


            const parts =
              v.split('-');


            filterEnd =
              new Date(
                parseInt(
                  parts[0],
                  10
                ),
                parseInt(
                  parts[1],
                  10
                ) - 1,
                parseInt(
                  parts[2],
                  10
                )
              );


            localStorage.setItem(
              'filterEnd',
              v
            );


            refreshUI();
          }
        );
      }


      // --------------------------------------------------------
      // AUTO SET HARI BERDASARKAN TANGGAL
      // --------------------------------------------------------

      if (manualTanggal) {

        manualTanggal.addEventListener(
          "change",
          function() {

            const selectedDate =
              new Date(
                this.value
              );


            const dayOfWeek =
              selectedDate.getDay();


            if (
              dayOfWeek === 0
            ) {

              updateStatus(
                "OFF"
              );


              const statusOFF =
                document.querySelector(
                  'input[name="manualStatus"][value="OFF"]'
                );


              if (statusOFF) {
                statusOFF.checked =
                  true;
              }


              const tipeOFF =
                document.querySelector(
                  'input[name="manualTipeHari"][value="OFF"]'
                );


              if (tipeOFF) {
                tipeOFF.checked =
                  true;
              }

            } else {

              updateStatus(
                "WD"
              );


              updateOtherStatus(
                "WD"
              );


              const statusPRS =
                document.querySelector(
                  'input[name="manualStatus"][value="PRS"]'
                );


              if (statusPRS) {
                statusPRS.checked =
                  true;
              }


              const tipeWD =
                document.querySelector(
                  'input[name="manualTipeHari"][value="WD"]'
                );


              if (tipeWD) {
                tipeWD.checked =
                  true;
              }
            }


            const jam =
              parseFloat(
                manualJamLembur
                  ? manualJamLembur.value
                  : 0
              ) || 0;


            const tipeElement =
              document.querySelector(
                "input[name='manualTipeHari']:checked"
              );


            const tipe =
              tipeElement
                ? tipeElement.value
                : "WD";


            if (
              manualIndeks
            ) {

              manualIndeks.value =
                hitungIndeksByJam(
                  jam,
                  tipe
                ).toFixed(2);
            }
          }
        );


        // Jalankan sekali saat
        // halaman pertama dibuka.
        manualTanggal.dispatchEvent(
          new Event("change")
        );
      }


      // --------------------------------------------------------
      // REFRESH AWAL
      // --------------------------------------------------------

      setTimeout(
        () => {

          const loadWrapper =
            document.getElementById(
              "load-wrapper"
            );


          if (loadWrapper) {

            loadWrapper.style.display =
              "none";
          }


          refreshUI();


          // Ambil data master
          // dari Google Sheets.
          syncFromGoogle();

        },
        300
      );
    }
  );


  // ============================================================
  // PUBLIC APP
  // ============================================================

  window._app = {

    refreshUI,

    saveLocal,

    loadLocal,

    parsedData

  };


})();
