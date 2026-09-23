import admin from "../config/firebase.js";

// ✅ Firebase ID Token verify karo
export const verifyFirebaseIdToken = async (idToken) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    throw new Error("Invalid Firebase token");
  }
};

// ✅ User ka Firebase UID se data lo
export const getFirebaseUser = async (uid) => {
  try {
    return await admin.auth().getUser(uid);
  } catch (error) {
    throw new Error("Firebase user not found");
  }
};