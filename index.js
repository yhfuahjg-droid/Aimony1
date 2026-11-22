
import express from "express";
import { Telegraf } from "telegraf";
import OpenAI from "openai";

const app = express();
app.use(express.json());

const {
  BOT_TOKEN,
  OPENAI_API_KEY,
  WEBHOOK_SECRET,
  RENDER_EXTERNAL_URL
} = process.env;

if (!BOT_TOKEN || !OPENAI_API_KEY || !WEBHOOK_SECRET || !RENDER_EXTERNAL_URL) {
  throw new Error("Missing Render Environment Variables!");
}

const bot = new Telegraf(BOT_TOKEN);

const ai = new OpenAI({
  apiKey: OPENAI_API_KEY
});

const webhookPath = "/telegram-webhook";

app.get("/", (req, res) => {
  res.send("🤖 MonyAI is Online!");
});

bot.start((ctx) => {
  return ctx.reply(
    "👋 Welcome to MonyAI!\n\n🤖 I am your AI assistant.\nSend me a message to chat!"
  );
});

bot.help((ctx) => {
  return ctx.reply("Send me any message and I will answer using AI.");
});

bot.on("text", async (ctx) => {
  try {
    await ctx.sendChatAction("typing");

    const result = await ai.responses.create({
      model: "gpt-4.1-mini",
      instructions: "You are MonyAI, a friendly assistant. Reply in the same language as the user.",
      input: ctx.message.text
    });

    const answer = result.output_text || "Sorry, no answer.";

    for (let i = 0; i < answer.length; i += 4000) {
      await ctx.reply(answer.slice(i, i + 4000));
    }
  } catch (error) {
    console.error("OpenAI error:", error.message);
    await ctx.reply("⚠️ AI is temporarily unavailable.");
  }
});

app.post(webhookPath, async (req, res) => {
  if (
    req.headers["x-telegram-bot-api-secret-token"] !== WEBHOOK_SECRET
  ) {
    return res.sendStatus(403);
  }

  res.sendStatus(200);

  try {
    await bot.handleUpdate(req.body);
  } catch (error) {
    console.error("Telegram update error:", error);
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log("MonyAI server started!");

  try {
    await bot.telegram.setWebhook(
      `${RENDER_EXTERNAL_URL}${webhookPath}`,
      { secret_token: WEBHOOK_SECRET }
    );

    console.log("MonyAI Telegram webhook connected!");
  } catch (error) {
    console.error("Webhook setup error:", error.message);
  }
});
