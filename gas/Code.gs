// =====================================================
// GOOGLE APPS SCRIPT — BACKEND KAS KELAS v5 (EXPLICIT PERIODS)
// =====================================================

function doGet(e) {
  try {
    const params = e.parameter;
    const ss     = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();
    
    // ==========================================
    // ACTION: GET DATA
    // Mengembalikan data pembayaran per-periode
    // ==========================================
    if (params.action === "getData") {
      return handleGetData(sheets);
    }

    // ==========================================
    // ACTION: SIMPAN DATA
    // ==========================================
    const nama   = (params.nama || "").trim();
    const minggu = parseInt(params.minggu);
    const jumlah = parseFloat(params.jumlah);
    const periode = parseInt(params.periode); // Ex: 1, 2, 3..

    if (!nama || isNaN(minggu) || isNaN(jumlah) || isNaN(periode)) {
      return buildResponse({ status: "error", message: "Parameter tidak lengkap" });
    }

    // Cari atau buat Sheet berdasarkan Periode (Sesuai order Frontend)
    const sheetName = "Periode " + periode;
    let targetSheet = ss.getSheetByName(sheetName);

    if (!targetSheet) {
        targetSheet = ss.insertSheet(sheetName);
        setupMinimalistSheet(targetSheet);
    } else if (targetSheet.getLastRow() === 0) {
        setupMinimalistSheet(targetSheet);
    }

    // Simpan ke sheet tujuan
    writeRow(targetSheet, nama, 2 + minggu, jumlah);

    return buildResponse({
      status : "success",
      message: "Data berhasil disimpan",
      sheet  : targetSheet.getName(),
    });

  } catch (err) {
    return buildResponse({ status: "error", message: err.toString() });
  }
}

function doPost(e) {
  return doGet(e);
}

// =====================================================
// FETCH DATA LOGIC 
// =====================================================
function handleGetData(sheets) {
  const pSheets = getPeriodeSheetsObj(sheets);
  const paidData = {}; 
  const cashData  = {}; // { "1": { "Rino": 20000 } }
  let grandTotal  = 0;

  for (const pNum in pSheets) {
    const sheet = pSheets[pNum];
    paidData[pNum] = {};
    cashData[pNum]  = {};
    
    if (sheet.getLastRow() > 1) {
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
         const nama = data[i][1] ? data[i][1].toString().trim() : "";
         if (!nama) continue;
         
         const m1 = parseFloat(data[i][2]) || 0;
         const m2 = parseFloat(data[i][3]) || 0;
         const m3 = parseFloat(data[i][4]) || 0;
         const m4 = parseFloat(data[i][5]) || 0;

         const curPaid = [];
         if (m1 > 0) curPaid.push(1);
         if (m2 > 0) curPaid.push(2);
         if (m3 > 0) curPaid.push(3);
         if (m4 > 0) curPaid.push(4);
         
         paidData[pNum][nama] = curPaid;

         const studentTotal = m1 + m2 + m3 + m4;
         if (studentTotal > 0) cashData[pNum][nama] = studentTotal;
         grandTotal += studentTotal;
      }
    }
  }

  return buildResponse({
    status: "success",
    paidData: paidData,
    cashData: cashData,
    totalCash: grandTotal
  });
}

// =====================================================
// LOGIKA PERIOD & CHECK
// =====================================================
function getPeriodeSheetsObj(sheets) {
  const obj = {};
  sheets.forEach(s => {
    const name = s.getName();
    // Kalau dia punya nama "Periode X"
    if (name.startsWith("Periode ")) {
      const match = name.match(/\d+/);
      if (match) {
        obj[parseInt(match[0])] = s;
      }
    }
  });
  
  // Jika spreadsheet masih totally brand new dan namanya "Sheet1"
  if (Object.keys(obj).length === 0 && sheets.length > 0) {
    sheets[0].setName("Periode 1");
    obj[1] = sheets[0];
  }
  
  return obj;
}


// =====================================================
// LOGIKA WRITE & UPDATE SHEET
// =====================================================
function writeRow(sheet, nama, mingguColIdx, jumlah) {
  const data = sheet.getDataRange().getValues();
  let rowNumber = -1;
  
  // Cari apakah nama sudah ada (di kolom B/index 1)
  for (let i = 0; i < data.length; i++) {
    if (data[i][1] && data[i][1].toString().trim().toLowerCase() === nama.toLowerCase()) {
      rowNumber = i + 1;
      break;
    }
  }

  // Jika nama belum ada, taruh di baris paling bawah
  if (rowNumber === -1) {
    rowNumber = sheet.getLastRow() + 1;
    sheet.getRange(rowNumber, 2).setValue(nama);
    // Otomatis kasih penomoran agar rapih seperti tabel
    sheet.getRange(rowNumber, 1).setValue(rowNumber - 1);
    sheet.getRange(rowNumber, 1).setHorizontalAlignment("center");
  }
  
  sheet.getRange(rowNumber, mingguColIdx).setValue(jumlah);
  recalcRow(sheet, rowNumber);
  formatCurrencyCols(sheet, rowNumber);
}

function recalcRow(sheet, rowNumber) {
  const values = sheet.getRange(rowNumber, 3, 1, 4).getValues()[0];
  let total = 0;
  let countBayar = 0;

  values.forEach(v => {
    const num = parseFloat(v) || 0;
    if (num > 0) {
      total += num;
      countBayar++;
    }
  });

  sheet.getRange(rowNumber, 7).setValue(total);

  let ket = "";
  if (countBayar === 4)      ket = "Lunas";
  else if (countBayar === 0) ket = "Belum bayar";
  else                       ket = countBayar + " kali bayar";

  const ketCell = sheet.getRange(rowNumber, 8);
  ketCell.setValue(ket);

  // Format Warna Minimalis
  if (ket === "Lunas") {
    ketCell.setBackground("#d9ead3").setFontColor("#274e13");
  } else {
    ketCell.setBackground("#fff2cc").setFontColor("#7f6000");
  }
}

function formatCurrencyCols(sheet, rowNumber) {
  const currency = sheet.getRange(rowNumber, 3, 1, 5); 
  currency.setNumberFormat('"Rp"#,##0');
  currency.setHorizontalAlignment("center");
}

// =====================================================
// HELPER AUTO-SETUP (MINIMALIST STYLE)
// =====================================================
function setupMinimalistSheet(sheet) {
  const headers = ["No", "Nama", "Minggu 1", "Minggu 2", "Minggu 3", "Minggu 4", "Total (Rp)", "Keterangan"];
  sheet.appendRow(headers);
  
  // Style Hijau standard 
  const headerRange = sheet.getRange(1, 1, 1, 8);
  headerRange.setBackground("#274e13"); 
  headerRange.setFontColor("#ffffff");
  headerRange.setFontWeight("bold");
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  
  sheet.setFrozenRows(1);
  
  sheet.setColumnWidth(1, 40); 
  sheet.setColumnWidth(2, 220);
  sheet.setColumnWidth(3, 100);
  sheet.setColumnWidth(4, 100);
  sheet.setColumnWidth(5, 100);
  sheet.setColumnWidth(6, 100);
  sheet.setColumnWidth(7, 120);
  sheet.setColumnWidth(8, 150);
}

// =====================================================
// HELPER BASIC
// =====================================================
function buildResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
