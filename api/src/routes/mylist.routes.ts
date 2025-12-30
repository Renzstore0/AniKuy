import { Router } from "express";
import mongoose from "mongoose";

const ListItemSchema = new mongoose.Schema(
  {
    userId: { type: String, index: true },
    type: { type: String, enum: ["anime", "drama"], required: true },
    key: { type: String, required: true }, // slug anime / bookId drama
    title: String,
    poster: String
  },
  { timestamps: true }
);

ListItemSchema.index({ userId: 1, type: 1, key: 1 }, { unique: true });

const ListItem =
  mongoose.models.ListItem || mongoose.model("ListItem", ListItemSchema);

export const myListRouter = Router();

function uid(req: any) {
  return String(req.header("x-user-id") || "guest");
}

myListRouter.get("/", async (req, res) => {
  const items = await ListItem.find({ userId: uid(req) })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ items });
});

myListRouter.post("/add", async (req, res) => {
  const b = req.body || {};
  const doc = {
    userId: uid(req),
    type: b.type,
    key: b.key,
    title: b.title,
    poster: b.poster
  };

  await ListItem.updateOne(
    { userId: doc.userId, type: doc.type, key: doc.key },
    { $set: doc },
    { upsert: true }
  );

  res.json({ ok: true });
});

myListRouter.post("/remove", async (req, res) => {
  const b = req.body || {};
  await ListItem.deleteOne({ userId: uid(req), type: b.type, key: b.key });
  res.json({ ok: true });
});
