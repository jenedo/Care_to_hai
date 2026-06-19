import { Client, Databases, Storage, ID, Query } from "appwrite";

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT ?? "https://sgp.cloud.appwrite.io/v1")
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID ?? "6a2ff4db0036ec54e4aa");

export const databases = new Databases(client);
export const storage = new Storage(client);
export { ID, Query, client };
