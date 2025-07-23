const xlsx = require('xlsx');
const path = require('path');

function loadExcelData() {
  const filePath = path.join(__dirname, 'ข้อมูล.xlsx');
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  // รวมข้อมูลทุกเซลล์เป็นข้อความเดียว
  let combinedText = '';
  for (let row of data) {
    combinedText += row.filter(Boolean).join(' ') + '\n';
  }

  return combinedText;
}

module.exports = { loadExcelData };
