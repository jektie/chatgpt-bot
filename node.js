// utils/googleSheet.js
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, '../gsheet-key.json'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheetId = '1dfz-r6ng9qe9JLb72oYM-QR4ZeCPYfRNcYNnId3Gwa8'; // Google Sheet ID ข้อมูลร้าน

async function getShopInfo() {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'ร้านค้า!A1:B20', // เปลี่ยนตามช่วงข้อมูลของคุณ
  });

  const rows = response.data.values;
  if (!rows || rows.length === 0) return {};

  const result = {};
  for (let row of rows) {
    const [key, value] = row;
    if (key && value) result[key.trim()] = value.trim();
  }

  return result;
}

module.exports = { getShopInfo };
