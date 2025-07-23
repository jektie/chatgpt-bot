const express = require('express');
const bodyParser = require('body-parser');
const { loadExcelData } = require('./loadExcelData');
const axios = require('axios');
require('dotenv').config();
console.log('FB VERIFY TOKEN:', process.env.FB_VERIFY_TOKEN);


const app = express();
app.use(bodyParser.json());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// LINE Webhook
app.post('/webhook/line', async (req, res) => {
  const events = req.body.events;
  for (let event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const userMessage = event.message.text;
      const replyToken = event.replyToken;

      const reply = await askChatGPTWithExcel(userMessage);

      await axios.post(
        'https://api.line.me/v2/bot/message/reply',
        {
          replyToken,
          messages: [{ type: 'text', text: reply }]
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
    }
  }
  res.sendStatus(200);
});

// Facebook Webhook
app.post('/webhook/facebook', async (req, res) => {
  const entry = req.body.entry[0];
  const messaging = entry.messaging[0];
  const senderId = messaging.sender.id;
  const userMessage = messaging.message.text;

  const reply = await askChatGPTWithExcel(userMessage);

  await axios.post(
    `https://graph.facebook.com/v17.0/me/messages?access_token=${process.env.FB_PAGE_TOKEN}`,
    {
      recipient: { id: senderId },
      message: { text: reply }
    }
  );
  res.sendStatus(200);
});

// Facebook webhook verification
app.get("/webhook/facebook", (req, res) => {
  if (
    req.query["hub.mode"] === "subscribe" &&
    req.query["hub.verify_token"] === process.env.FB_VERIFY_TOKEN
  ) {
    console.log("✅ Facebook Webhook verified.");
    res.status(200).send(req.query["hub.challenge"]);
  } else {
    console.warn("❌ Failed Facebook verification");
    res.sendStatus(403);
  }
});

// ChatGPT function
async function askChatGPTWithExcel(userMessage) {
  const excelText = loadExcelData();
  const prompt = `
ผู้ใช้ถามว่า: "${userMessage}"
นี่คือข้อมูลทั้งหมดของร้าน:
${excelText}
กรุณาตอบคำถามของผู้ใช้โดยอิงจากข้อมูลนี้เท่านั้น
`;

  const completion = await openai.createChatCompletion({
    model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'คุณคือตัวช่วยตอบคำถามจากข้อมูลที่ให้อย่างแม่นยำที่สุด ตอบด้วยความสุภาพ ลงท้ายด้วยครับเสมอ',
        },
        {
          role: 'user',
          content: `ข้อมูลทั้งหมด:\n${context}\n\nคำถาม: ${message}`,
        },
      ],
      temperature: 0.3,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return completion.data.choices[0].message.content;
}


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
