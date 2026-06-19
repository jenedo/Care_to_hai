import { Client, Databases, Storage, ID, Query } from "node-appwrite";

const APPWRITE_ENDPOINT =
  process.env.APPWRITE_ENDPOINT ?? "https://sgp.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID =
  process.env.APPWRITE_PROJECT_ID ?? "6a2ff4db0036ec54e4aa";
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;

if (!APPWRITE_API_KEY) {
  console.warn(
    "[appwrite] APPWRITE_API_KEY not set — server-side Appwrite calls will fail",
  );
}

export const appwriteClient = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY ?? "");

export const appwriteDatabases = new Databases(appwriteClient);
export const appwriteStorage = new Storage(appwriteClient);
export { ID, Query };
