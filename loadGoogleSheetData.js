const { google } = require('googleapis');

async function loadGoogleSheetData() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets.readonly']
  );

  const sheets = google.sheets({ version: 'v4', auth });

  const sheetId = process.env.GOOGLE_SHEET_ID;
  const range = 'ข้อมูลร้าน!A1:Z'; // ปรับตามชื่อ sheet

  const response = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range });
  const rows = response.data.values;

  if (!rows || rows.length === 0) return "ไม่มีข้อมูล";

  // แปลงให้เป็นข้อความสำหรับ prompt
  const headers = rows[0];
  const dataRows = rows.slice(1);

  let result = dataRows.map(row => {
    return headers.map((h, i) => `${h.trim()}: ${row[i] || ''}`).join('\n');
  }).join('\n\n');

  return result;
}

module.exports = { loadGoogleSheetData };
