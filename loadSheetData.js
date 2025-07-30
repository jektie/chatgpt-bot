const { google } = require('googleapis');
const fs = require('fs');

async function loadShopInfoFromSheet() {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

  const spreadsheetId = '1dfz-r6ng9qe9JLb72oYM-QR4ZeCPYfRNcYNnId3Gwa8'; // เปลี่ยนเป็นของคุณ
  const range = 'ข้อมูลร้าน!A1:E20'; // ปรับตามโครงสร้าง Sheet

  const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const rows = response.data.values;

  if (!rows || rows.length === 0) {
    return 'ไม่พบข้อมูลร้าน';
  }

  // แปลงข้อมูลให้อ่านง่าย เช่น
  const headers = rows[0];
  const shops = rows.slice(1).map(row => {
    const shop = {};
    headers.forEach((h, i) => {
      shop[h] = row[i] || '';
    });
    return shop;
  });

  return shops; // หรือจะ join เป็นข้อความสตริงก็ได้
}

module.exports = { loadShopInfoFromSheet };
