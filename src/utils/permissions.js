// src/utils/permissions.js
import { LayoutDashboard, Users, Wallet } from 'lucide-react';

// 1. Updated menu with "label" and actual icon components
export const MENU_ITEMS = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard 
  },
  {
    label: "Leads Manager",
    path: "/leads",
    icon: Users 
  },
  {
    label: "Sales",
    path: "/sales",
    icon: Wallet
  }
];

// 2. Dummy roles to prevent import errors in old CRM files
export const ROLES = {
  ADMIN: 'ADMIN',
  DIRECTOR: 'DIRECTOR',
  SALES: 'SALES',
  OPERATION: 'OPERATION',
  ACCOUNTS: 'ACCOUNTS',
  MARKETING: 'MARKETING',
  USER: 'USER'
};