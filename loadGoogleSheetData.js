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

  // Helper function แปลง range ให้เป็น object array
  async function loadSheet(rangeName) {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${rangeName}!A1:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) return [];

    const headers = rows[0];
    return rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h.trim()] = row[i] || '';
      });
      return obj;
    });
  }

  const shopInfo = await loadSheet('ข้อมูลร้าน');
  const menuData = await loadSheet('เมนูและราคา');
  const dailyStatus = await loadSheet('สถานะประจำวัน');

  return { shopInfo, menuData, dailyStatus };
}

module.exports = { loadGoogleSheetData };
