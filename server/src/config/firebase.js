import admin from "firebase-admin";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const serviceAccount = require("../../Firebasekey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "codesign-live.firebasestorage.app"
});

const db = admin.firestore();
export const bucket = admin.storage().bucket();

export default db;