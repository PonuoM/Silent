export enum NoteType {
  Problem = 'PROBLEM',
  Solution = 'SOLUTION',
}

export enum Quadrant {
  Unsorted = 'UNSORTED',
  Q1 = 'Q1', // High/High (Do Now / Focus)
  Q2 = 'Q2', // High/Low (Plan)
  Q3 = 'Q3', // Low/High (Delegate / Fillers)
  Q4 = 'Q4', // Low/Low (Avoid / Discard)
}

export enum NoteStatus {
  Active = 'ACTIVE',
  Resolved = 'RESOLVED',
  Merged = 'MERGED',
}

export interface Note {
  id: string;
  content: string;
  author: string;
  avatarUrl: string;
  category: 'Process' | 'Customer' | 'Tools' | 'People';
  type: NoteType;
  quadrant: Quadrant;
  timestamp: number;
  likes: number;
  // New fields for M:N linking and merge
  status: NoteStatus;
  linkedNoteIds: string[];      // M:N: IDs of linked notes (problems ↔ solutions)
  mergedFromIds: string[];      // IDs of notes that were merged into this one
  // Creator tracking (stored but not displayed on UI)
  createdByUserId?: string;     // User ID who created this note
  createdByPhone?: string;      // User phone number (for reference)
  createdByName?: string;       // User name (for reference)
}

export interface Metric {
  label: string;
  value: string | number;
  trend?: number; // percentage
  status: 'good' | 'neutral' | 'bad';
  icon: string;
}

export interface ActionItem {
  id: string;
  problem: string;
  solution: string;
  owner: string;
  ownerAvatar: string;
  status: 'Pending' | 'In Progress' | 'Done';
}
