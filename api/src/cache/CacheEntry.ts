import mongoose from "mongoose";

const CacheEntrySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    expireAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

// TTL index: MongoDB auto-delete dokumen yang expire
CacheEntrySchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export const CacheEntry =
  mongoose.models.CacheEntry || mongoose.model("CacheEntry", CacheEntrySchema);
