import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type LeadType = "quote" | "contact";
export type LeadStatus = "new" | "in_review" | "closed";

export interface Lead {
  id: string;
  type: LeadType;
  fullName: string;
  email: string;
  phone: string;
  message: string;
  serviceInterest: string;
  location: string;
  status: LeadStatus;
  createdAt?: { seconds: number };
}

export interface SubmitLeadInput {
  type: LeadType;
  fullName: string;
  email: string;
  phone: string;
  message: string;
  serviceInterest: string;
  location: string;
}

const COLLECTION_MAP: Record<LeadType, string> = {
  quote: "quoteRequests",
  contact: "contactInquiries",
};

export const submitLead = async (payload: SubmitLeadInput) => {
  const collectionName = COLLECTION_MAP[payload.type];

  await addDoc(collection(db, collectionName), {
    ...payload,
    status: "new",
    createdAt: serverTimestamp(),
  });
};

export const subscribeToLeads = (
  callback: (leads: Lead[]) => void,
): Unsubscribe => {
  const quoteQuery = query(
    collection(db, COLLECTION_MAP.quote),
    orderBy("createdAt", "desc"),
  );
  const contactQuery = query(
    collection(db, COLLECTION_MAP.contact),
    orderBy("createdAt", "desc"),
  );

  let quoteLeads: Lead[] = [];
  let contactLeads: Lead[] = [];

  const emit = () => {
    const merged = [...quoteLeads, ...contactLeads].sort((a, b) => {
      const aTime = a.createdAt?.seconds ?? 0;
      const bTime = b.createdAt?.seconds ?? 0;
      return bTime - aTime;
    });

    callback(merged);
  };

  const unsubQuotes = onSnapshot(quoteQuery, (snapshot) => {
    quoteLeads = snapshot.docs.map((leadDoc) => ({
      id: leadDoc.id,
      type: "quote",
      ...(leadDoc.data() as Omit<Lead, "id" | "type">),
    }));
    emit();
  });

  const unsubContacts = onSnapshot(contactQuery, (snapshot) => {
    contactLeads = snapshot.docs.map((leadDoc) => ({
      id: leadDoc.id,
      type: "contact",
      ...(leadDoc.data() as Omit<Lead, "id" | "type">),
    }));
    emit();
  });

  return () => {
    unsubQuotes();
    unsubContacts();
  };
};

export const updateLeadStatus = async (
  leadType: LeadType,
  leadId: string,
  status: LeadStatus,
) => {
  const collectionName = COLLECTION_MAP[leadType];
  await updateDoc(doc(db, collectionName, leadId), { status });
};
