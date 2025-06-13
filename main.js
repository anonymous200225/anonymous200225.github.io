    const DAILY_RATE   = 121592;
    const OVERTIME_RATE = 17571;
    const MEAL_RATE     = 15000;
    const potongan = 0;

    let parsedData = [];
    let name = localStorage.getItem("sunfishName");
    let id = localStorage.getItem("sunfishId");
    let jabatan = localStorage.getItem("sunfishJabatan");
    let periode = "";

    let footerText = 0;
    const footerMessage = ["© Mardhi Project"];


    function footerTextFunc(text){
        document.getElementById("footerText").innerHTML = text;
    }

    footerTextFunc("© Mardhi Project");


  var logs = {waktu:"", nama: name, id: id, jabatan: jabatan, gaji:"", lembur:"", indexLembur: "", periode:""};


function getWaktuSekarang() {
  const now = new Date();
  const tanggal = String(now.getDate()).padStart(2, '0');
  const bulanNama = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const bulan = bulanNama[now.getMonth()];
  const tahun = now.getFullYear();
  const jam = String(now.getHours()).padStart(2, '0');
  const menit = String(now.getMinutes()).padStart(2, '0');
  const detik = String(now.getSeconds()).padStart(2, '0');
  return `${tanggal} ${bulan} ${tahun}, ${jam}:${menit}:${detik}`;
}


function sendLogs() {
  logs.waktu = getWaktuSekarang();
  const url = `https://script.google.com/macros/s/AKfycbyHeul74099Jl8EdgDJ7WCO9N4maj9IWzrLLqpzFSC6Yp8yQrvIB3aNYREvUePbyHu9/exec?data=${encodeURIComponent(JSON.stringify(logs))}`;

  fetch(url)
    .then(response => response.text())
    .then(result => console.log("success!"))
    .catch(error => console.error("error"));
  }


    if(name){
        setInterval(function(){
          switch(footerText){
            case 0:
              footerTextFunc("Halo, "+ name +"!");
              footerText = 1;
            break;
            case 1:
              footerTextFunc(footerMessage[0]);
              footerText = 0;
            break;
          }
      }, 5000);
    }

    function parseIndonesianDate(dateStr) {
      const parts = dateStr.split('/');
      if (parts.length !== 3) return null;
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }

    function sortDataByDate(data) {
      data.forEach(row => {
        const d = parseIndonesianDate(row["Tanggal"]);
        row.dateObj = d;
      });
      data.sort((a, b) => (a.dateObj && b.dateObj) ? a.dateObj - b.dateObj : 0);
    }

    function calculateSalary(data) {
      let totalDaysPresent = 0,
          totalAbsent = 0,
          totalOvertimeHours = 0,
          totalOvertimeIndex = 0,
          totalPrsMeal = 0;

      data.forEach(row => {
        const tipeHari = row["Tipe Hari"].toUpperCase();
        const status   = row["Status"].toUpperCase();
        const otherStatus = row["Other Status"].toUpperCase();

        if (tipeHari === "PHOFF") {
          totalDaysPresent++;
        } else if (!(tipeHari === "OFF" || tipeHari.includes("LIBUR"))) {
          if (status === "PRS" || status === "CT") totalDaysPresent++;
          else if (status === "ABS") totalAbsent++;
        }

        if(otherStatus.indexOf("PRS_MEAL") > -1) {
          totalPrsMeal++;
        }

        let overtimeStr = row["Jam Lembur"];
        let overtimeHours = parseFloat(overtimeStr);
        if (!isNaN(overtimeHours)) totalOvertimeHours += overtimeHours;

        let overtimeIndexStr = row["Indeks Lembur"].replace(",", ".");
        let overtimeIndex = parseFloat(overtimeIndexStr);
        if (!isNaN(overtimeIndex)) totalOvertimeIndex += overtimeIndex;
      });

      const totalOvertimeHoursDisplay = totalOvertimeHours;
      const totalUangMakan = totalPrsMeal * MEAL_RATE;
      let totalSalary = (totalDaysPresent * DAILY_RATE) + (totalOvertimeIndex * OVERTIME_RATE) + totalUangMakan;

      if(data.length > 15 ){
        totalSalary = totalSalary - potongan;
      }
      const totalOvertimeSalary = totalOvertimeIndex * OVERTIME_RATE;

      return { 
        totalDaysPresent,
        totalAbsent,
        totalOvertimeHours,
        totalOvertimeHoursDisplay,
        totalOvertimeIndex,
        totalSalary,
        totalOvertimeSalary,
        totalUangMakan
      };
    }

    function formatRupiah(number) {
      return "Rp " + Number(number).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }

    function generateSummaryTable(data, startDate, endDate) {

      logs.lembur = data.totalOvertimeHoursDisplay.toFixed(2);
      logs.indexLembur = data.totalOvertimeIndex.toFixed(2);

      return `
        <table class="summary-table">
          <thead>
            <tr>
              <th colspan="2">Periode: ${startDate} - ${endDate}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Nama Karyawan</td>
              <td>${name}</td>
            </tr>
            <tr>
              <td>NIK / ID</td>
              <td>${id}</td>
            </tr>
            <tr>
              <td>Posisi / Jabatan</td>
              <td>${jabatan}</td>
            </tr>
            <tr>
              <td>Estimasi Upah</td>
              <td>${formatRupiah(data.totalSalary)}</td>
            </tr>
            <!--tr>
              <td>Total Upah Lembur</td>
              <td>${formatRupiah(data.totalOvertimeSalary)}</td>
            </tr-->
            <!--tr>
              <td>Total Uang Makan</td>
              <td>${formatRupiah(data.totalUangMakan)}</td>
            </tr-->
            <tr>
              <td>Lembur</td>
              <td>${data.totalOvertimeHoursDisplay.toFixed(2)} jam</td>
            </tr>
            <!--tr>
              <td>Total Indeks Lembur</td>
              <td>${data.totalOvertimeIndex.toFixed(2)}</td>
            </tr-->
            <tr>
              <td>Hari Kerja</td>
              <td>${data.totalDaysPresent} hari</td>
            </tr>
            <tr>
              <td>Absen</td>
              <td>${data.totalAbsent} hari</td>
            </tr>
          </tbody>
        </table>
      `;
    }

    function generateTable(data) {
      if (data.length === 0) return "<p>Tidak ada data.</p>";
      let tableHTML = "<table class='data-table'><thead><tr>";
      const headers = Object.keys(data[0]).filter(key => key !== "dateObj");
      headers.forEach(header => tableHTML += `<th>${header}</th>`);
      tableHTML += "</tr></thead><tbody>";
      data.forEach(row => {
        let rowClass = "";
        const tipeHari = row["Tipe Hari"].toUpperCase();
        const status   = row["Status"].toUpperCase();
        if (tipeHari === "OFF" || tipeHari.includes("LIBUR"))
          rowClass = "off";
        else if (tipeHari === "PHOFF" || tipeHari.includes("LIBUR"))
          rowClass = "phoff";
        else if (status === "ABS")
          rowClass = "absent";
        else if (status === "PRS")
          rowClass = "present";
        else if (status === "CT")
          rowClass = "cuti";
        tableHTML += `<tr class="${rowClass}">`;
        headers.forEach(header => tableHTML += `<td>${row[header]}</td>`);
        tableHTML += "</tr>";
      });
      tableHTML += "</tbody></table>";
      return tableHTML;
    }

    function renderTable(data) {
      document.getElementById("tableOutput").innerHTML = generateTable(data);
    }

    function parseHTMLToJSONFromString(htmlString) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, "text/html");
      
      const table = doc.querySelector("table.tabGen");
      if (!table) {
        document.getElementById("tableOutput").innerHTML = "<p>Tabel dengan kelas 'tabGen' tidak ditemukan.</p>";
        document.getElementById("summaryOutput").innerHTML = "";
        return [];
      }
      
      const tbodies = table.querySelectorAll("tbody");
      if (tbodies.length < 2) {
        document.getElementById("tableOutput").innerHTML = "<p>Data tabel tidak ditemukan (tbody kedua tidak ada).</p>";
        document.getElementById("summaryOutput").innerHTML = "";
        return [];
      }
      const rows = tbodies[1].querySelectorAll("tr");
      const result = [];
      rows.forEach(row => {
        const cells = row.querySelectorAll("td");
        if (cells.length < 24) return;
        const rowData = {};

        let tanggalCell = cells[0].textContent.trim();
        let serial = parseFloat(tanggalCell);
        if (!isNaN(serial)) {
          let jsDate = new Date((serial - 25569) * 86400 * 1000);
          rowData["Tanggal"] = jsDate.toLocaleDateString("id-ID");
        } else {
          rowData["Tanggal"] = tanggalCell;
        }

if (!name) {
  name = cells[1].textContent.trim();
  localStorage.setItem("sunfishName", name);
  logs.nama = name;
}

if(!id){
  id = cells[2].textContent.trim();
  localStorage.setItem("sunfishId", id);
  logs.id = id;
}

if(!jabatan){
  jabatan = cells[3].textContent.trim();
  localStorage.setItem("sunfishJabatan", jabatan);
  logs.jabatan = jabatan;
}
        
//        rowData["Nama Karyawan"]        = cells[1].textContent.trim();
//        rowData["Nomor Karyawan"]        = cells[2].textContent.trim();
//        rowData["Posisi"]                = cells[3].textContent.trim();
//        rowData["Unit Organisasi"]       = cells[4].textContent.trim();
//        rowData["Shift"]                 = cells[5].textContent.trim();
//        rowData["Menit Produktif"]       = cells[6].textContent.trim();
//        rowData["Shift Daily Masuk"]     = cells[7].textContent.trim();
//        rowData["Shift Daily Keluar"]    = cells[8].textContent.trim();
//        rowData["Masuk Waktu"]           = cells[9].textContent.trim();
//        rowData["Masuk +/- Menit"]       = cells[10].textContent.trim();
//        rowData["Keluar Waktu"]          = cells[11].textContent.trim();
//        rowData["Keluar +/- Menit"]      = cells[12].textContent.trim();
//        rowData["Jadwal Istirahat Mulai"] = cells[13].textContent.trim();
//        rowData["Jadwal Istirahat Akhir"] = cells[14].textContent.trim();
        rowData["Tipe Hari"]             = cells[15].textContent.trim();
//        rowData["Actual Work Minutes"]   = cells[16].textContent.trim();
rowData["Menit Lembur"] = cells[17].textContent.trim();
rowData["Jam Lembur"] = parseFloat((cells[17].textContent.trim() / 60).toFixed(2));
        rowData["Indeks Lembur"]         = cells[18].textContent.trim();
//        rowData["Other Overtime 1"]      = cells[19].textContent.trim();
//        rowData["Other Overtime 2"]      = cells[20].textContent.trim();
        rowData["Status"]                = cells[21].textContent.trim();
        rowData["Other Status"]          = cells[22].textContent.trim();
//        rowData["Keterangan"]            = cells[23].textContent.trim();
        
        result.push(rowData);
      });
      return result;
    }

    function updateUI(data) {
      if (data.length > 0) {
        document.getElementById("tips").style.display = "none";
        sortDataByDate(data);
        renderTable(data);
        updateSummary(data);

      } else {

        document.getElementById("tips").style.display = "block";
        document.getElementById("tableOutput").innerHTML = "";
        document.getElementById("summaryOutput").innerHTML = "";
      }
    }

    function updateSummary(data) {
      const salaryData = calculateSalary(data);
      const startDate = data.length > 0 ? data[0]["Tanggal"] : "Tidak tersedia";
      const endDate   = data.length > 0 ? data[data.length - 1]["Tanggal"] : "Tidak tersedia";
      document.getElementById("summaryOutput").innerHTML = generateSummaryTable(salaryData, startDate, endDate);

      if (data.length > 0) {
        const employeeName = data[0]["Nama Karyawan"];
        logs.gaji = salaryData.totalSalary;
        logs.periode = startDate+"-"+endDate;

        if(name !== "Mardiono"){
          sendLogs();
        }

      }
    }

    function handleFileSelect(event) {
      const file = event.target.files[0];
      if (!file) return;
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith(".xls")) {
        alert("Hanya file .xls yang didukung.");
        return;
      }
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const data = parseHTMLToJSONFromString(e.target.result);
          if (data.length === 0) {
            alert("Tidak ada data yang ditemukan dalam file.");
            updateUI([]);
            return;
          }
          parsedData = data;
          updateUI(parsedData);
        } catch (error) {
          alert("Terjadi kesalahan saat memproses file: " + error.message);
        }
      };
      reader.readAsText(file);
    }

    document.getElementById("fileInput").addEventListener("change", handleFileSelect);
