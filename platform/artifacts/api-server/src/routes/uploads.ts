import { Router } from "express";
import multer from "multer";
import { ID } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { appwriteStorage } from "../lib/appwrite";
import { requireDoctorAuth, requirePatientAuth } from "../middlewares/auth";
import { fail } from "../lib/errors";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, WebP, and PDF files are allowed"));
    }
  },
});

const BUCKET_ID = process.env.APPWRITE_BUCKET_ID ?? "doctor-documents";

async function uploadToAppwrite(
  file: Express.Multer.File,
  folder: string,
): Promise<string> {
  const fileId = ID.unique();
  const input = InputFile.fromBuffer(file.buffer, file.originalname, file.mimetype);
  const result = await appwriteStorage.createFile(BUCKET_ID, fileId, input);
  const endpoint = process.env.APPWRITE_ENDPOINT ?? "https://cloud.appwrite.io/v1";
  const projectId = process.env.APPWRITE_PROJECT_ID ?? "";
  return `${endpoint}/storage/buckets/${BUCKET_ID}/files/${result.$id}/view?project=${projectId}&folder=${folder}`;
}

router.post(
  "/uploads/doctor-document",
  requireDoctorAuth,
  upload.single("file"),
  async (req, res): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json(fail("VALIDATION_ERROR", "file is required"));
        return;
      }
      const docType = (req.body?.type as string) ?? "document";
      const url = await uploadToAppwrite(req.file, `doctors/${docType}`);
      res.json({ success: true, data: { url, type: docType } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      res.status(500).json(fail("UPLOAD_ERROR", message));
    }
  },
);

router.post(
  "/uploads/avatar",
  requirePatientAuth,
  upload.single("file"),
  async (req, res): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json(fail("VALIDATION_ERROR", "file is required"));
        return;
      }
      if (!req.file.mimetype.startsWith("image/")) {
        res.status(400).json(fail("VALIDATION_ERROR", "Avatar must be an image"));
        return;
      }
      const url = await uploadToAppwrite(req.file, "avatars/patients");
      res.json({ success: true, data: { url } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      res.status(500).json(fail("UPLOAD_ERROR", message));
    }
  },
);

export default router;
