import { connectToDatabase } from "@/lib/db/mongoose";
import { ChatHistory } from "@/lib/models/ChatHistory";
import cloudinary from "cloudinary";

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST() {
  await connectToDatabase();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Find all chat history with cloudinaryPublicId older than 7 days
  const oldFiles = await ChatHistory.find({
    cloudinaryPublicId: { $exists: true, $ne: null },
    timestamp: { $lt: sevenDaysAgo },
  });

  let deleted = 0;
  for (const file of oldFiles) {
    if (typeof file.cloudinaryPublicId === 'string' && file.cloudinaryPublicId.length > 0) {
      try {
        await cloudinary.v2.uploader.destroy(file.cloudinaryPublicId, {
          resource_type: file.cloudinaryResourceType || "image",
        });
        deleted++;
        // Optionally, remove the record or clear the cloudinary fields
        file.cloudinaryPublicId = undefined;
        file.cloudinaryResourceType = undefined;
        await file.save();
      } catch (e) {
        console.error(`Failed to delete Cloudinary file: ${file.cloudinaryPublicId}`, e);
      }
    }
  }

  return Response.json({ deleted });
}
