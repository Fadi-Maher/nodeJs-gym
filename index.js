import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import twilio from "twilio";
import 'dotenv/config';

const app = express();

// ✅ CORS: السماح للفرونت إند على Vercel
app.use(cors({
  origin: [
    'https://front-l0zmesdyk-fadi-mahers-projects.vercel.app', // دومينك الجديد
  ],
  credentials: true
}));

app.use(express.json());

// connect MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB connection error:", err));

//Schema of player
const playerSchema = new mongoose.Schema({
  name: String,
  phone: String,
  desc: String,
  sessions: { type: Number, default: 0 },
});

const Player = mongoose.model("Player", playerSchema);

// routes
app.get("/players", async (req, res) => {
  try {
    const players = await Player.find();
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/players", async (req, res) => {
  try {
    const { name, phone, desc, sessions } = req.body;
    const newPlayer = new Player({
      name,
      phone,
      desc,
      sessions: sessions || 0,
    });
    await newPlayer.save();
    res.json(newPlayer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;

app.post("/send-message", async (req, res) => {
  const { message, playerIds } = req.body;
  try {
    let players;
    if (playerIds && playerIds.length > 0) {
      players = await Player.find({ _id: { $in: playerIds } });
    } else {
      players = await Player.find();
    }

    await Promise.all(
      players.map((player) => {
        if (player.phone) {
          return client.messages.create({
            body: message,
            from: whatsappFrom,
            to: `whatsapp:${player.phone}`,
          });
        }
      })
    );

    res.json({ success: true, count: players.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/players/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, desc, sessions } = req.body;
    const updatedPlayer = await Player.findByIdAndUpdate(
      id,
      { name, phone, desc, sessions: sessions || 0 },
      { new: true }
    );
    if (!updatedPlayer) return res.status(404).json({ error: "Player not found" });
    res.json(updatedPlayer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/players/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedPlayer = await Player.findByIdAndDelete(id);
    if (!deletedPlayer) return res.status(404).json({ error: "Player not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Deployment-ready
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));