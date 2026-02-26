"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

export function useAuthNavigation() {
  const { authenticated, ready, user } = usePrivy();
  const router = useRouter();

  const navigateToDashboard = () => {
    if (authenticated && ready) {
      router.push("/dashboard");
    }
  };

  const navigateToLogin = () => {
    router.push("/");
  };

  const navigateToChat = () => {
    if (authenticated && ready) {
      router.push("/chat");
    }
  };

  useEffect(() => {
    if (ready && authenticated) {
      const currentPath = window.location.pathname;
      if (currentPath === "/" || currentPath === "/login") {
        router.push("/dashboard");
      }
    }
  }, [authenticated, ready, router]);

  return {
    authenticated,
    ready,
    user,
    navigateToDashboard,
    navigateToLogin,
    navigateToChat,
  };
}
