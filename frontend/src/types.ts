export type Role = "ADMIN" | "LIBRARIAN" | "MEMBER";
export type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  status: string;
  protectedAccount: boolean;
};
export type Author = { id: number; name: string };
export type Copy = { id: number; barcode: string; status: string };
export type Book = {
  id: number;
  isbn: string;
  title: string;
  genre: string;
  publisher: string;
  description: string;
  authors: Author[];
  copies: Copy[];
  available: number;
};
export type Page<T> = { items: T[]; total: number; page: number; size: number };
export type Loan = {
  id: number;
  borrowerId: number;
  borrower: string;
  titleId: number;
  title: string;
  copyId: number;
  barcode: string;
  issueDate: string;
  dueDate: string;
  returnDate: string | null;
  renewals: number;
  fine: number;
  overdue: boolean;
};
export type Reservation = {
  id: number;
  borrowerId: number;
  borrower: string;
  titleId: number;
  title: string;
  status: string;
  createdAt: string;
  expiresAt: string | null;
  barcode: string | null;
  queuePosition: number;
};
export type Dashboard = {
  titles: number;
  available: number;
  activeLoans: number;
  members: number;
  overdue: Loan[];
  pickups: Reservation[];
  activity: { id: number; actor: string; message: string; createdAt: string }[];
};
export type Demo = {
  enabled: boolean;
  lastReset: string;
  nextReset: string | null;
  generation: number;
};
