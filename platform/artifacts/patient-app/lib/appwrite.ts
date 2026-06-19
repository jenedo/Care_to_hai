import { Client, Databases, Storage, ID, Query } from "appwrite";

const APPWRITE_ENDPOINT =
  process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ?? "https://sgp.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID =
  process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? "6a2ff4db0036ec54e4aa";

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

export const databases = new Databases(client);
export const storage = new Storage(client);
export { ID, Query, client };
