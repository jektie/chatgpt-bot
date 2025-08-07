require('dotenv').config();
const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SERVICE_ACCOUNT_KEY_STRING = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

if (!SPREADSHEET_ID || !SERVICE_ACCOUNT_KEY_STRING) {
  console.error("Error: SPREADSHEET_ID or GOOGLE_SERVICE_ACCOUNT_KEY is not defined in the .env file.");
  process.exit(1);
}

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

// ฟังก์ชันสำหรับตรวจสอบสิทธิ์ (จากโค้ดที่คุณต้องการ)
async function authorize() {
  let credentials;
  try {
    credentials = JSON.parse(SERVICE_ACCOUNT_KEY_STRING);
  } catch (error) {
    console.error("Error parsing GOOGLE_SERVICE_ACCOUNT_KEY string:", error);
    process.exit(1);
  }

  const jwtClient = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: SCOPES,
  });

  await jwtClient.authorize();
  return jwtClient;
}

// ฟังก์ชันหลักสำหรับดึงข้อมูล (จากโค้ดแรกของคุณ)
async function loadGoogleSheetData() {
  const auth = await authorize(); // ใช้ฟังก์ชัน authorize() ที่เราสร้างขึ้น
  const sheets = google.sheets({ version: 'v4', auth });

  // Helper function แปลง range ให้เป็น object array
  async function loadSheet(rangeName) {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID, // ใช้ SPREADSHEET_ID จาก .env
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

// === ท้ายไฟล์ สำหรับทดสอบเฉพาะไฟล์นี้เท่านั้น ===
if (require.main === module) {
  (async () => {
    try {
      const data = await loadGoogleSheetData();
      console.log('Sheet ID:', SPREADSHEET_ID);
      console.dir(data, { depth: null });
    } catch (error) {
      console.error('เกิดข้อผิดพลาด:', error);
    }
  })();
}