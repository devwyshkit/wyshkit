export type UserRole = "customer" | "vendor" | "admin" | "partner";

export interface User {
  id: string;
  phone: string;
  email?: string;
  name?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}




