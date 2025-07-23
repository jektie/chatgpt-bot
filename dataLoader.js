// dataLoader.js
const xlsx = require('xlsx');
const path = require('path');

const excelFilePath = path.join(__dirname, 'ข้อมูล.xlsx');
const workbook = xlsx.readFile(excelFilePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet);

// หาคำตอบจาก Excel โดยเทียบกับคำถาม
function findAnswerFromExcel(question) {
  question = question.trim();
  for (const row of data) {
    if (row['คำถาม'] && row['คำตอบ']) {
      if (question.includes(row['คำถาม'].trim())) {
        return row['คำตอบ'].trim();
      }
    }
  }
  return null;
}

module.exports = { findAnswerFromExcel };
