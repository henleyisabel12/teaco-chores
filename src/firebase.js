import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, get } from "firebase/database";
import { firebaseConfig, HOUSEHOLD_ID } from "./firebaseConfig";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

function householdRef(path) {
  return ref(db, `households/${HOUSEHOLD_ID}/${path}`);
}

// ── Read (real-time listener) ─────────────────────────────────────────────────
export function subscribeToData(path, callback) {
  const r = householdRef(path);
  const unsub = onValue(r, (snap) => {
    callback(snap.exists() ? snap.val() : null);
  });
  return unsub; // call to unsubscribe
}

// ── Write ─────────────────────────────────────────────────────────────────────
export async function writeData(path, value) {
  await set(householdRef(path), value);
}

// ── Read once ─────────────────────────────────────────────────────────────────
export async function readOnce(path) {
  const snap = await get(householdRef(path));
  return snap.exists() ? snap.val() : null;
}
