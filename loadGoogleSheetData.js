require('dotenv').config();
const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SERVICE_ACCOUNT_KEY_STRING = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

if (!SPREADSHEET_ID || !SERVICE_ACCOUNT_KEY_STRING) {
  console.error("Error: SPREADSHEET_ID or GOOGLE_SERVICE_ACCOUNT_KEY is not defined in the .env file.");
  process.exit(1);
}

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

let cache = {
  shopInfo: null,
  menuData: null,
  dailyStatus: null,
  lastUpdated: {
    shopInfo: null,
    menuData: null,
    dailyStatus: null,
  }
};

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

// ฟังก์ชันดึงข้อมูลจากชีตเดียว
async function loadSheet(auth, sheetName) {
  const sheets = google.sheets({ version: 'v4', auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1:Z`,
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

// ฟังก์ชันหลัก
async function loadGoogleSheetData(options = {}) {
  const { forceDailyStatus = false, forceAll = false } = options;
  const auth = await authorize();

  // โหลด shopInfo และ menuData แค่วันละ 1 ครั้ง
  const now = new Date();
  const today = now.toISOString().slice(0, 10); // YYYY-MM-DD

  if (!cache.shopInfo || cache.lastUpdated.shopInfo !== today || forceAll) {
    cache.shopInfo = await loadSheet(auth, 'ข้อมูลร้าน');
    cache.lastUpdated.shopInfo = today;
  }

  if (!cache.menuData || cache.lastUpdated.menuData !== today || forceAll) {
    cache.menuData = await loadSheet(auth, 'เมนูและราคา');
    cache.lastUpdated.menuData = today;
  }

  // ส่วนนี้จะโหลดทุกครั้ง ถ้า forceDailyStatus = true หรือยังไม่เคยโหลด
  if (!cache.dailyStatus || forceDailyStatus || cache.lastUpdated.dailyStatus !== today) {
    cache.dailyStatus = await loadSheet(auth, 'สถานะประจำวัน');
    cache.lastUpdated.dailyStatus = today;
  }

  return {
    shopInfo: cache.shopInfo,
    menuData: cache.menuData,
    dailyStatus: cache.dailyStatus,
  };
}

module.exports = { loadGoogleSheetData };

// === ท้ายไฟล์ สำหรับทดสอบเฉพาะไฟล์นี้เท่านั้น ===
if (require.main === module) {
  (async () => {
    try {
      const data = await loadGoogleSheetData({ forceDailyStatus: true });
      console.log('Sheet ID:', SPREADSHEET_ID);
      console.dir(data, { depth: null });
    } catch (error) {
      console.error('เกิดข้อผิดพลาด:', error);
    }
  })();
}
