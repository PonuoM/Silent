import { Note, NoteType, Quadrant, ActionItem, NoteStatus } from './types';

export const INITIAL_NOTES: Note[] = [
  {
    id: '1',
    content: 'ขั้นตอนการเริ่มใช้งานสำหรับลูกค้าใหม่ซับซ้อนเกินไป ต้องคลิกหลายครั้ง',
    author: 'Sarah',
    avatarUrl: 'https://i.pravatar.cc/150?u=sarah',
    category: 'Customer',
    type: NoteType.Problem,
    quadrant: Quadrant.Q1,
    timestamp: Date.now(),
    likes: 5,
    status: NoteStatus.Active,
    linkedNoteIds: [],
    mergedFromIds: [],
  },
  {
    id: '2',
    content: 'เอกสาร API ไม่อัปเดตตามเวอร์ชันปัจจุบัน ทำให้ Dev งง',
    author: 'Mike',
    avatarUrl: 'https://i.pravatar.cc/150?u=mike',
    category: 'Tools',
    type: NoteType.Problem,
    quadrant: Quadrant.Q2,
    timestamp: Date.now() - 10000,
    likes: 3,
    status: NoteStatus.Active,
    linkedNoteIds: [],
    mergedFromIds: [],
  },
  {
    id: '3',
    content: 'เรามีประชุมเพื่ออัปเดตงานเยอะเกินไป น่าจะใช้วิธีส่งรายงานแทนได้',
    author: 'Jessica',
    avatarUrl: 'https://i.pravatar.cc/150?u=jess',
    category: 'People',
    type: NoteType.Problem,
    quadrant: Quadrant.Unsorted,
    timestamp: Date.now() - 20000,
    likes: 8,
    status: NoteStatus.Active,
    linkedNoteIds: [],
    mergedFromIds: [],
  },
  {
    id: '4',
    content: 'แอปมือถือเด้งออกเวลาจ่ายเงิน ถ้าในตะกร้ามีของมากกว่า 10 ชิ้น',
    author: 'Tom',
    avatarUrl: 'https://i.pravatar.cc/150?u=tom',
    category: 'Customer',
    type: NoteType.Problem,
    quadrant: Quadrant.Unsorted,
    timestamp: Date.now() - 35000,
    likes: 12,
    status: NoteStatus.Active,
    linkedNoteIds: [],
    mergedFromIds: [],
  },
];

export const MOCK_ACTIONS: ActionItem[] = [
  {
    id: 'a1',
    problem: 'API รุ่นเก่าทำงานช้า',
    solution: 'ทำระบบ Caching ด้วย Redis',
    owner: 'สมชาย',
    ownerAvatar: 'https://i.pravatar.cc/150?u=jenkins',
    status: 'In Progress',
  },
  {
    id: 'a2',
    problem: 'ยอดขาย Q3 ตก',
    solution: 'ปรับโครงสร้างค่าคอมมิชชั่นใหม่',
    owner: 'เอกชัย',
    ownerAvatar: 'https://i.pravatar.cc/150?u=chen',
    status: 'Pending',
  },
  {
    id: 'a3',
    problem: 'คอขวดตอนรับลูกค้าใหม่',
    solution: 'ใช้ระบบตรวจสอบเอกสารอัตโนมัติ',
    owner: 'วิไล',
    ownerAvatar: 'https://i.pravatar.cc/150?u=wilson',
    status: 'Done',
  },
];

export const CATEGORY_COLORS = {
  Process: '#3B82F6', // Blue
  Customer: '#10B981', // Green
  Tools: '#F59E0B', // Amber
  People: '#EC4899', // Pink
};
