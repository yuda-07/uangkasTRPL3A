  // =====================================================
  // GOOGLE APPS SCRIPT — BACKEND KAS KELAS v5 (EXPLICIT PERIODS)
  // =====================================================

  // JIKA SCRIPT ADALAH STANDALONE, MASUKKAN ID SPREADSHEET DI SINI
  // JIKA BOUND SCRIPT (DIBUAT DARI SHEET), BIARKAN KOSONG ""
  const SPREADSHEET_ID = ""; 

  function getSS() {
    if (SPREADSHEET_ID) {
      return SpreadsheetApp.openById(SPREADSHEET_ID);
    }
    return SpreadsheetApp.getActiveSpreadsheet();
  }

  function doGet(e) {
    try {
      const params = e.parameter;
      const ss     = getSS();
      if (!ss) throw new Error("Spreadsheet tidak ditemukan! Pastikan ID benar atau script dibuat dari Extensions > Apps Script.");
      
      const sheets = ss.getSheets();
      
      // ==========================================
      // ROUTING ACTIONS
      // ==========================================
      if (params.action === "getData") {
        return handleGetData(ss, sheets);
      }

      if (params.action === "addExpense") {
        return handleAddExpense(ss, params);
      }
      
      // Default action is addPayment
      return handleAddPayment(ss, params);

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
  function handleGetData(ss, sheets) {
    const pSheets = getPeriodeSheetsObj(sheets);
    const paidData = {}; 
    const cashData  = {}; // { "1": { "Rino": 20000 } }
    let grandTotal  = 0;

    // --- Ambil Data Pembayaran ---
    for (const pNum in pSheets) {
      const sheet = pSheets[pNum];
      paidData[pNum] = {};
      cashData[pNum]  = {};
      
      if (sheet.getLastRow() > 0) {
        const data = sheet.getDataRange().getValues();
        for (let i = 0; i < data.length; i++) {
          const nama = data[i][1] ? data[i][1].toString().trim() : "";
          // Skip baris kosong atau baris header ("Nama")
          if (!nama || nama.toLowerCase() === "nama") continue;
          
          const parseMoney = (val) => {
            if (typeof val === 'number') return val;
            if (!val) return 0;
            // Hapus semua karakter kecuali angka (seperti "Rp", ".", dsb) tapi pertahankan minus
            return parseFloat(val.toString().replace(/[^0-9]/g, '')) || 0;
          };
          
          const m1 = parseMoney(data[i][2]);
          const m2 = parseMoney(data[i][3]);
          const m3 = parseMoney(data[i][4]);
          const m4 = parseMoney(data[i][5]);

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

    // --- Ambil Data Pengeluaran ---
    const expenseSheet = ss.getSheetByName("Pengeluaran");
    const expenses = [];
    let totalExpense = 0;
    if (expenseSheet && expenseSheet.getLastRow() > 1) {
      const expData = expenseSheet.getRange(2, 1, expenseSheet.getLastRow() - 1, 3).getValues();
      expData.forEach(row => {
        const date = row[0];
        const desc = row[1];
        const amount = parseFloat(row[2]) || 0;
        expenses.push({ date, desc, amount });
        totalExpense += amount;
      });
    }

    return buildResponse({
      status: "success",
      paidData: paidData,
      cashData: cashData,
      totalCash: grandTotal,
      expenses: expenses,
      totalExpense: totalExpense
    });
  }

  // =====================================================
  // EXPENSE LOGIC
  // =====================================================
  function handleAddExpense(ss, params) {
    const desc = (params.keterangan || params.desc || "").trim();
    const amount = parseFloat(params.jumlah || params.amount);

    if (!desc || isNaN(amount)) {
      return buildResponse({ status: "error", message: "Data tidak lengkap" });
    }

    let sheet = ss.getSheetByName("Pengeluaran");
    if (!sheet) {
      try {
        sheet = ss.insertSheet("Pengeluaran");
        sheet.appendRow(["Tanggal", "Keterangan", "Jumlah"]);
        const headerRange = sheet.getRange(1, 1, 1, 3);
        headerRange.setBackground("#990000").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");
        sheet.setColumnWidth(1, 150);
        sheet.setColumnWidth(2, 300);
        sheet.setColumnWidth(3, 150);
      } catch (e) {
        return buildResponse({ status: "error", message: "Gagal membuat sheet: " + e.toString() });
      }
    }

    const date = new Date();
    sheet.appendRow([date, desc, amount]);
    sheet.getRange(sheet.getLastRow(), 3).setNumberFormat('"Rp"#,##0');

    return buildResponse({
      status: "success",
      message: "Pengeluaran berhasil dicatat"
    });
  }

  // =====================================================
  // PAYMENT LOGIC
  // =====================================================
  function handleAddPayment(ss, params) {
    const nama   = (params.nama || "").trim();
    const minggu = parseInt(params.minggu);
    const jumlah = parseFloat(params.jumlah);
    const periode = parseInt(params.periode);
    
    if (!nama || isNaN(minggu) || isNaN(jumlah) || isNaN(periode)) {
      return buildResponse({ status: "error", message: "Parameter tidak lengkap" });
    }

    const sheetName = "Periode " + periode;
    let targetSheet = ss.getSheetByName(sheetName);
    
    if (!targetSheet) {
      return buildResponse({ status: "error", message: "Sheet " + sheetName + " tidak ditemukan" });
    }

    const data = targetSheet.getDataRange().getValues();
    let rowIndex = -1;
    
    for (let i = 0; i < data.length; i++) {
      if (data[i][1] && data[i][1].toString().trim() === nama) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) {
      return buildResponse({ status: "error", message: "Nama " + nama + " tidak ditemukan di " + sheetName });
    }

    const colIndex = minggu + 2; 
    targetSheet.getRange(rowIndex, colIndex).setValue(jumlah);

    return buildResponse({
      status: "success",
      message: "Data " + nama + " M" + minggu + " berhasil disimpan ke " + sheetName
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
