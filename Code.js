const SHEET_NAME = 'Sheet1';
const DRIVE_FOLDER_ID = '1irjUOxVbnvHqesI0SwqwSYHOf0W6t5a9'; // ID Folder Drive Anda

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const doc = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = doc.getSheetByName(SHEET_NAME);
    
    // Parsing Data
    const action = e.parameter.action || (e.postData ? JSON.parse(e.postData.contents).action : 'read');
    let requestData = {};
    if (e.postData) requestData = JSON.parse(e.postData.contents);

    let result = {};

    if (action === 'read') {
      // ... (Kode Read Produk Tetap Sama) ...
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const rows = data.slice(1);
      const products = rows.map(row => {
        let obj = {};
        headers.forEach((header, index) => obj[header] = row[index]);
        return obj;
      });
      result = products;

    } else {
      // --- PERUBAHAN DATA (CUD) ---
      
      // >>> FITUR BARU: CHECKOUT / REKAP TRANSAKSI <<<
      // ... di dalam handleRequest ...
      
      if (action === 'checkout') {
        const transSheet = doc.getSheetByName('Transaksi');
        
        const orderId = 'ORD-' + new Date().getTime();
        const now = new Date();
        const tgl = Utilities.formatDate(now, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
        
        // Urutan Masuk Database:
        // ID | Tgl | Nama | WA | Item | Total | Bayar | Kirim | Alamat | Status
        transSheet.appendRow([
          orderId,
          tgl,
          requestData.nama,         // "User Website"
          requestData.no_wa,        // "-"
          requestData.items,
          requestData.total,
          requestData.metode,       // Metode Pembayaran
          requestData.pengiriman,   // Metode Pengiriman (BARU)
          '',                       // Alamat (Dikosongkan sesuai request)
          'Menunggu'
        ]);
        
        result = { status: 'success', message: 'Pesanan tercatat', orderId: orderId };
      
      } 
      // ... else if action === 'add' dst ...
       else {
        // ... (Logika Add/Edit/Delete Produk yang LAMA tetap disini, jangan dihapus) ...
        // Agar kode tidak kepanjangan, saya asumsikan kode Add/Edit/Delete kemarin masih ada di sini
        // Pastikan Anda menyalin kode Logika Gambar & Sheet dari tahap sebelumnya ke sini.
        const dataHeader = sheet.getDataRange().getValues()[0];
        
        // --- Paste logika 'add', 'edit', 'delete' lama Anda di sini ---
        // (Jika bingung, kabari saya, nanti saya berikan full code gabungannya)
        
        if (action === 'delete') {
           const rowIndex = findRowIndexById(sheet, requestData.id);
           if (rowIndex !== -1) {
             sheet.deleteRow(rowIndex + 1);
             result = { status: 'success', message: 'Produk dihapus' };
           }
        }
        // ... dst (create/update)
      }
    }

    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: e.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function findRowIndexById(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) return i;
  }
  return -1;
}

// --- BAGIAN 2: GENERATOR GAMBAR OTOMATIS ---
function updateImageUrls() {
  var folderId = '1irjUOxVbnvHqesI0SwqwSYHOf0W6t5a9'; // ID Folder Drive Anda
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
  var lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) return; 

  // Asumsi: Nama Produk di Kolom B (index 2), Output Gambar di Kolom D (index 4)
  var rangeNama = sheet.getRange(2, 2, lastRow - 1, 1);
  var namaValues = rangeNama.getValues();
  var outputUrls = [];
  
  var folder = DriveApp.getFolderById(folderId);
  var files = folder.getFiles();
  var fileMap = {};
  
  // Mapping file
  while (files.hasNext()) {
    var file = files.next();
    var fileName = file.getName().toLowerCase().split('.')[0]; // Nama file tanpa ekstensi
    // Format Link Thumbnail (Paling Stabil untuk Website)
    fileMap[fileName] = "https://drive.google.com/thumbnail?sz=w1000&id=" + file.getId();
  }
  
  for (var i = 0; i < namaValues.length; i++) {
    var namaProduk = String(namaValues[i][0]).toLowerCase().trim();
    var url = fileMap[namaProduk] || ""; // Jika tidak ketemu, kosongkan
    outputUrls.push([url]);
  }
  
  // Tulis ke Kolom D (Kolom ke-4)
  sheet.getRange(2, 4, lastRow - 1, 1).setValues(outputUrls);
}


// ... (Bagian atas Code.gs tetap sama) ...

