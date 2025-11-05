import { updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { getUserRef } from "./firebaseUserRef";

// Add to any array field
export async function addToList(fieldName, value) {
  const ref = getUserRef();
  await updateDoc(ref, { [fieldName]: arrayUnion(value) });
}

// Remove from any array field
export async function removeFromList(fieldName, value) {
  const ref = getUserRef();
  await updateDoc(ref, { [fieldName]: arrayRemove(value) });
}