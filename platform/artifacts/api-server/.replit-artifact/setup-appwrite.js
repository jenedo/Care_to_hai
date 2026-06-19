const { Client } = require("node-appwrite");

const client = new Client();

client
  .setEndpoint("https://cloud.appwrite.io/v1")
  .setProject("YOUR_PROJECT_ID");

console.log("✅ Appwrite connection initialized");