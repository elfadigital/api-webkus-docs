// Konsep Google Apps Script (GAS) untuk proxy Pakasir

const PAKASIR_PROJECT = "elfadigital"; // GANTI INI DENGAN SLUG ANDA
const PAKASIR_API_KEY = "MloU2fSmJxcPf8P5Ru260tnAvIrKnTcX"; // GANTI INI DENGAN API KEY ANDA

// Harus dipasang agar tidak kena block CORS dari Github Pages
function doOptions(e) {
  return createResponse("OK", 200);
}

// Menangani permintaan POST (Dari Github Pages atau Webhook Pakasir)
function doPost(e) {
  let requestData;
  try {
    requestData = JSON.parse(e.postData.contents);
  } catch (error) {
    return createResponse({ error: "Invalid JSON" }, 400);
  }

  // ACTION 1: Membuat Transaksi (Dari GitHub Pages ke GAS)
  if (requestData.action === "create_transaction") {
    return handleCreateTransaction(requestData);
  }

  // ACTION 2: Menerima Webhook (Dari Pakasir ke GAS)
  if (requestData.status === "completed" && requestData.order_id) {
    return handleWebhook(requestData);
  }

  return createResponse({ error: "Unknown action" }, 400);
}

// Menangani permintaan GET (Untuk frontend mengecek status pembayaran)
function doGet(e) {
  const orderId = e.parameter.order_id;
  if (orderId) {
     return checkTransactionStatus(orderId);
  }
  return createResponse({ message: "GAS Proxy for Pakasir is running." }, 200);
}


// --- FUNGSI INTERNAL ---

function handleCreateTransaction(data) {
  const orderId = "DONASI-" + new Date().getTime(); 
  const amount = data.amount;

  if (!amount || isNaN(amount)) {
    return createResponse({ error: "Amount is required and must be a number" }, 400);
  }

  const payload = {
    project: PAKASIR_PROJECT,
    order_id: orderId,
    amount: parseInt(amount),
    api_key: PAKASIR_API_KEY
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch("https://app.pakasir.com/api/transactioncreate/qris", options);
    const responseCode = response.getResponseCode();
    const responseData = JSON.parse(response.getContentText());

    if (responseCode === 200 && responseData.payment) {
       // Simpan status order sebagai 'pending'
       PropertiesService.getScriptProperties().setProperty(orderId, "pending");

       return createResponse({
          success: true,
          order_id: orderId,
          payment_number: responseData.payment.payment_number, 
          total_payment: responseData.payment.total_payment
       }, 200);
    } else {
       return createResponse({ success: false, error: responseData }, responseCode);
    }
  } catch (error) {
    return createResponse({ success: false, error: error.toString() }, 500);
  }
}


function handleWebhook(webhookData) {
  const orderId = webhookData.order_id;
  const amount = webhookData.amount;
  
  // VERIFIKASI KEAMANAN: Double check ke Pakasir
  const checkUrl = `https://app.pakasir.com/api/transactiondetail?project=${PAKASIR_PROJECT}&amount=${amount}&order_id=${orderId}&api_key=${PAKASIR_API_KEY}`;
  
  try {
    const response = UrlFetchApp.fetch(checkUrl);
    const responseData = JSON.parse(response.getContentText());
    
    // Jika benar lunas
    if (responseData.payment && responseData.payment.status === "completed") {
       PropertiesService.getScriptProperties().setProperty(orderId, "completed");
       return createResponse({ success: true, message: "Webhook verified" }, 200);
    } else {
       return createResponse({ success: false, message: "Webhook verification failed" }, 400);
    }
  } catch (error) {
    return createResponse({ success: false, error: error.toString() }, 500);
  }
}

function checkTransactionStatus(orderId) {
   const status = PropertiesService.getScriptProperties().getProperty(orderId);
   if (status) {
      return createResponse({ success: true, order_id: orderId, status: status }, 200);
   } else {
      return createResponse({ success: false, error: "Order not found" }, 404);
   }
}

// Helper untuk membuat response dengan dukungan CORS (agar Github Pages bisa baca)
function createResponse(data, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  
  // Jika ini respon dari doGet/doPost langsung, Headers CORS perlu disetel melalui web app config,
  // namun jika GAS, CORS otomatis terbuka untuk JSONP jika di-deploy dengan opsi "Anyone".
  return output;
}
