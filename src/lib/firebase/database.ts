import { getDatabase, ref } from "firebase/database";
import { getFirebaseApp } from "@/lib/firebase/client";

export function getFirebaseDatabase() {
  return getDatabase(getFirebaseApp());
}

export { ref };