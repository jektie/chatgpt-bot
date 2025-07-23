const express = require('express');
const bodyParser = require('body-parser');
const excelData = require('./dataLoader');
const axios = require('axios');
require('dotenv').config();
console.log('FB VERIFY TOKEN:', process.env.FB_VERIFY_TOKEN);


const app = express();
app.use(bodyParser.json());
app.use(express.json());

function findAnswerFromExcel(message) {
  for (let row of excelData) {
    if (message.includes(row.คำถาม)) {
      return row.คำตอบ;
    }
  }
  return null;
}


const PORT = process.env.PORT || 3000;

// LINE Webhook
app.post('/webhook/line', async (req, res) => {
  const events = req.body.events;
  for (let event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const userMessage = event.message.text;
      const replyToken = event.replyToken;

      // 🔍 ลองหาคำตอบจาก Excel ก่อน
      let reply = findAnswerFromExcel(userMessage);

      // ถ้าไม่มีคำตอบใน Excel ค่อยถาม GPT
      if (!reply) {
        reply = await askChatGPT(userMessage);
      }

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

  // ลองตอบจาก Excel ก่อน
        let reply = findAnswerFromExcel(userMessage);

        // ถ้าไม่เจอคำตอบใน Excel ค่อยไปถาม ChatGPT
        if (!reply) {
          reply = await askChatGPT(userMessage);
        }

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
async function askChatGPT(message) {
  try {
    const res = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'คุณคือพนักงานร้านอาหารแหนมเนือง กรุณาตอบคำถามลูกค้าด้วยข้อมูลจริงและสุภาพ'
          },
          { role: 'user', content: message }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return res.data.choices[0].message.content;
  } catch (err) {
    console.error(err.response?.data || err.message);
    return 'ขออภัย ระบบขัดข้องชั่วคราว';
  }
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
