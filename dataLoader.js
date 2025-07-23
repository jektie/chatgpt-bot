const xlsx = require('xlsx');
const path = require('path');

function loadExcelData() {
  const filePath = path.join(__dirname, 'ข้อมูล.xlsx');
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: '' }); // defval ป้องกัน undefined
  return jsonData; // ต้องเป็น array
}

function findAnswerFromExcel(message) {
  const data = loadExcelData();
  for (let row of data) {
    if (message.includes(row.question)) {
      return row.answer;
    }
  }
  return null;
}

module.exports = { findAnswerFromExcel };
