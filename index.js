const express = require('express');
const bodyParser = require('body-parser');
const { loadGoogleSheetData } = require('./loadGoogleSheetData');
const keywordImageMap = require('./keywordImageMap');
const axios = require('axios');
require('dotenv').config();
console.log('FB VERIFY TOKEN:', process.env.FB_VERIFY_TOKEN);
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


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

      const reply = await askChatGPTWithSheet(userMessage);

      let messages = [];

      if (reply.type === 'image') {
        messages = [
          {
            type: 'image',
            originalContentUrl: reply.imageUrl,
            previewImageUrl: reply.imageUrl
          },
          {
            type: 'text',
            text: reply.caption
          }
        ];
      } else {
        messages = [{ type: 'text', text: reply.text }];
      }

      await axios.post(
        'https://api.line.me/v2/bot/message/reply',
        {
          replyToken,
          messages: messages // ใช้ตัวแปร messages ที่ประกาศไว้ด้านบน
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

  const reply = await askChatGPTWithSheet(userMessage);

  if (reply.type === 'image') {
    // ส่งรูป
    await axios.post(
      `https://graph.facebook.com/v17.0/me/messages?access_token=${process.env.FB_PAGE_TOKEN}`,
      {
        recipient: { id: senderId },
        message: {
          attachment: {
            type: "image",
            payload: {
              url: reply.imageUrl,
              is_reusable: true
            }
          }
        }
      }
    );

    // ส่ง caption ตามหลัง
    await axios.post(
      `https://graph.facebook.com/v17.0/me/messages?access_token=${process.env.FB_PAGE_TOKEN}`,
      {
        recipient: { id: senderId },
        message: { text: reply.caption }
      }
    );
  } else {
    // ตอบข้อความธรรมดา
    await axios.post(
      `https://graph.facebook.com/v17.0/me/messages?access_token=${process.env.FB_PAGE_TOKEN}`,
      {
        recipient: { id: senderId },
        message: { text: reply.text }
      }
    );
  }

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
async function askChatGPTWithSheet(userMessage) {
  // 1. ตรวจสอบ keyword ว่าตรงกับภาพใดไหม
  for (const item of keywordImageMap) {
    if (item.keywords.some(keyword => userMessage.toLowerCase().includes(keyword.toLowerCase()))) {
      return { type: 'image', imageUrl: item.imageUrl, caption: item.caption };
    }
  }

  // 2. ถ้าไม่ตรง keyword ใดเลย ให้ถาม GPT แทน
  const googleSheetsData = await loadGoogleSheetData();

  const prompt = `
ผู้ใช้ถามว่า: "${userMessage}"
ข้อมูลร้านทั้งหมด:
${JSON.stringify(shopInfo, null, 2)}
กรุณาตอบคำถามของผู้ใช้โดยอิงจากข้อมูลนี้เท่านั้น

**รูปแบบการตอบ:**
- ให้ตอบสั้น กระชับ ชัดเจน
- ตอบแค่ที่ลูกค้าถาม ถ้ามีข้อมูลเพิ่มเติมค่อยส่งให้ในข้อความถัดไป
- เว้นบรรทัดเป็นระยะ เพื่อให้อ่านง่าย
- ใช้สัญลักษณ์ bullet point (•) เมื่อจำเป็น
- ไม่แต่งเติมข้อมูลที่ไม่มีอยู่ในข้อมูลนี้เด็ดขาด
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
    });

    if (
      completion &&
      completion.choices &&
      completion.choices.length > 0 &&
      completion.choices[0].message &&
      completion.choices[0].message.content
    ) {
      return { type: 'text', text: completion.choices[0].message.content.trim() };
    } else {
      console.error("❌ ไม่พบข้อความตอบกลับจาก ChatGPT:", completion);
      return "ขออภัย ฉันไม่สามารถตอบคำถามได้ในตอนนี้";
    }
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาดในการเรียก OpenAI:", error);
    return "เกิดข้อผิดพลาดจากระบบ AI";
  }
}



app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
