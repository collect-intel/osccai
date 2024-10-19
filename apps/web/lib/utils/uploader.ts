import { write, remove } from "@/lib/utils/storage";
import path from "path";
import fs from "fs";

interface UploadFile {
  filepath: string;
  originalFilename: string;
  mimetype: string;
  size: number;
}

export const FILE_USES = {
  logo: {
    allowedExtensions: [".jpg", ".jpeg", ".png", ".gif"],
    maxSize: 1024 * 1024, // 1MB
    bucket: "community_logos",
  },
  // Add other file use cases as needed
};

export async function upload(
  file: UploadFile,
  fileUse: keyof typeof FILE_USES,
  oldFileUrl?: string,
) {
  const usageParams = FILE_USES[fileUse];
  if (!usageParams) {
    throw new Error("Invalid file use");
  }

  const { maxSize, bucket, allowedExtensions } = usageParams;
  const fileExtension = path.extname(file.originalFilename).toLowerCase();

  if (!allowedExtensions.includes(fileExtension)) {
    throw new Error("Invalid file type");
  }

  if (file.size > maxSize) {
    throw new Error("File size exceeds allowed limit");
  }

  const key = `file_${Date.now()}_${path.basename(file.originalFilename, fileExtension)}${fileExtension}`;

  try {
    // If there's an old file, delete it
    if (oldFileUrl) {
      const oldKey = oldFileUrl.split("/").pop();
      if (oldKey) {
        await remove(bucket, oldKey);
      }
    }

    const stream = fs.createReadStream(file.filepath);
    const location = await write(bucket, key, stream, file.mimetype);

    // Optionally delete the temporary file
    fs.unlink(file.filepath, (err) => {
      if (err) console.error("Error deleting temporary file:", err);
    });

    return { name: file.originalFilename, url: location };
  } catch (error) {
    console.error("Supabase upload error:", error);
    throw new Error("Failed to upload file");
  }
}

export async function deleteFile(
  fileUse: keyof typeof FILE_USES,
  fileUrl: string,
) {
  const { bucket } = FILE_USES[fileUse];
  const key = fileUrl.split("/").pop();
  if (key) {
    await remove(bucket, key);
  }
}
