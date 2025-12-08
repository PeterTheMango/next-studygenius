import { create } from 'zustand';
import { Database } from '@/types/database';

type Document = Database['public']['Tables']['documents']['Row'];

interface DocumentState {
  documents: Document[];
  setDocuments: (documents: Document[]) => void;
  addDocument: (document: Document) => void;
  removeDocument: (id: string) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
}

export const useDocumentStore = create<DocumentState>((set) => ({
  documents: [],
  setDocuments: (documents) => set({ documents }),
  addDocument: (doc) => set((state) => ({ documents: [doc, ...state.documents] })),
  removeDocument: (id) => set((state) => ({ documents: state.documents.filter(d => d.id !== id) })),
  updateDocument: (id, updates) => 
    set((state) => ({
      documents: state.documents.map(d => (d.id === id ? { ...d, ...updates } : d))
    })),
}));
