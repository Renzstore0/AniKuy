import "dotenv/config";
import { createApp } from "./app.js";
import { connectMongo } from "./db/mongo.js";

const PORT = Number(process.env.PORT || 4000);

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");
  await connectMongo(uri);

  createApp().listen(PORT, () => {
    console.log(`AniKuy API running on http://localhost:${PORT}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
