"use client";

import { useAuthNavigation } from "@/hooks/useAuthNavigation";

export default function AuthRedirect() {
  useAuthNavigation();
  return null; 
}
