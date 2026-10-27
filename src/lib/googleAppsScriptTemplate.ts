/**
 * Google Apps Script Template for PremiKeys Real-Time Orders Sync
 * 100% Free - Runs directly inside Google Sheets
 */
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * ====================================================================
 * PremiKeys E-Commerce - Google Sheets Live Orders Sync
 * 100% Free Google Apps Script Webhook
 * ====================================================================
 * 
 * QUICK SETUP INSTRUCTIONS (Takes ~60 seconds):
 * 1. In your Google Sheet, click "Extensions" > "Apps Script".
 * 2. Delete all default code in the editor.
 * 3. Paste this ENTIRE code block and click the Save (floppy disk) icon.
 * 4. In the top right, click "Deploy" > "New deployment".
 * 5. Under "Select type" (gear icon), choose "Web app".
 * 6. Configuration:
 *    - Description: PremiKeys Order Sync
 *    - Execute as: "Me (<your email>)"
 *    - Who has access: "Anyone"  <--- (CRITICAL: MUST BE 'Anyone')
 * 7. Click "Deploy".
 * 8. Authorize permissions when Google asks (click Advanced > Go to PremiKeys (unsafe)).
 * 9. Copy the "Web app URL" (starts with https://script.google.com/macros/s/...)
 * 10. Paste this URL into PremiKeys Admin Settings -> Google Sheets Sync -> Save!
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "No post data received"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(e.postData.contents);
    var sheet = getOrCreateOrdersSheet();

    // 1. Connection Test Ping
    if (data.action === "TEST_PING") {
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Successfully connected to Google Sheet: '" + SpreadsheetApp.getActiveSpreadsheet().getName() + "'!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Batch Sync (e.g. Sync All Historical Orders)
    if (data.action === "BATCH_UPSERT" && Array.isArray(data.orders)) {
      var count = 0;
      for (var i = 0; i < data.orders.length; i++) {
        upsertOrderRow(sheet, data.orders[i]);
        count++;
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Successfully synced " + count + " orders."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Single Order Upsert
    var orderData = data.order || data;
    if (orderData && orderData.orderNumber) {
      upsertOrderRow(sheet, orderData);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Order " + orderData.orderNumber + " synced successfully."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Unrecognized payload or missing orderNumber"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    message: "PremiKeys Google Sheets Webhook is active and waiting for order POST requests."
  })).setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateOrdersSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Orders");
  if (!sheet) {
    sheet = ss.getSheets()[0];
    sheet.setName("Orders");
  }

  // 18 Standard Store Columns
  var headers = [
    "Order #",
    "Created Date",
    "Customer Name",
    "Phone Number",
    "Customer Email",
    "Products / Items",
    "Total Amount",
    "Currency",
    "Subtotal",
    "Discount",
    "Promo Code",
    "Payment Method",
    "Payment Ref / Proof",
    "Order Status",
    "Payment Status",
    "Customer Notes",
    "Admin Notes",
    "Last Updated"
  ];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#0F172A"); // Sleek Dark Slate
    headerRange.setFontColor("#38BDF8"); // Vibrant Cyan text
    headerRange.setFontWeight("bold");
    headerRange.setFontFamily("Arial");
    headerRange.setHorizontalAlignment("center");
    sheet.setRowHeight(1, 38);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function upsertOrderRow(sheet, order) {
  var orderNumber = String(order.orderNumber || "").trim();
  if (!orderNumber) return;

  var lastRow = sheet.getLastRow();
  var existingRowIndex = -1;

  if (lastRow > 1) {
    var orderNumbers = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var r = 0; r < orderNumbers.length; r++) {
      if (String(orderNumbers[r][0]).trim() === orderNumber) {
        existingRowIndex = r + 2;
        break;
      }
    }
  }

  var formattedDate = order.createdAt ? new Date(order.createdAt).toLocaleString() : new Date().toLocaleString();
  var updatedDate = new Date().toLocaleString();

  var rowValues = [
    orderNumber,
    formattedDate,
    order.customerName || "",
    order.customerPhone ? ("'" + order.customerPhone) : "", // Apostrophe prevents scientific notation for phone numbers
    order.customerEmail || "",
    order.itemsSummary || (order.items && order.items.map(function(i){ return i.productTitle + " (x" + i.quantity + ")"; }).join(", ")) || "",
    order.totalAmount !== undefined ? order.totalAmount : 0,
    order.currency || "EGP",
    order.subtotal !== undefined ? order.subtotal : 0,
    order.discountAmount || 0,
    order.promoCodeCode || "None",
    order.paymentMethodName || "",
    order.paymentReference || (order.paymentScreenshotUrl ? "Receipt Uploaded" : "-"),
    order.status || "PENDING",
    order.paymentStatus || "AWAITING_VERIFICATION",
    order.customerNotes || "",
    order.adminCustomerNote || order.adminInternalNote || "",
    updatedDate
  ];

  var targetRow;
  if (existingRowIndex > 0) {
    targetRow = existingRowIndex;
    sheet.getRange(targetRow, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
    targetRow = sheet.getLastRow();
    sheet.setRowHeight(targetRow, 30);
  }

  // Visual status pill color badge in Column 14 (Order Status)
  var statusCell = sheet.getRange(targetRow, 14);
  var st = String(order.status || "").toUpperCase();
  if (st === "APPROVED" || st === "DONE") {
    statusCell.setBackground("#DCFCE7"); // Emerald
    statusCell.setFontColor("#15803D");
  } else if (st === "REJECTED" || st === "CANCELLED") {
    statusCell.setBackground("#FEE2E2"); // Rose Red
    statusCell.setFontColor("#B91C1C");
  } else if (st.indexOf("REFUND") !== -1) {
    statusCell.setBackground("#FEF3C7"); // Amber
    statusCell.setFontColor("#B45309");
  } else {
    statusCell.setBackground("#EFF6FF"); // Blue (Pending)
    statusCell.setFontColor("#1D4ED8");
  }
  statusCell.setFontWeight("bold");
}
`;
