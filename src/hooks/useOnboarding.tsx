import { useState, useEffect } from "react";

export const useOnboarding = (userRole: "parent" | "sitter" | null) => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    if (!userRole) return;

    const storageKey = `onboarding_completed_${userRole}`;
    const hasCompletedOnboarding = localStorage.getItem(storageKey);

    if (!hasCompletedOnboarding) {
      setIsFirstVisit(true);
      setShowOnboarding(true);
    }
  }, [userRole]);

  const completeOnboarding = () => {
    if (userRole) {
      localStorage.setItem(`onboarding_completed_${userRole}`, "true");
    }
    setShowOnboarding(false);
  };

  const resetOnboarding = () => {
    if (userRole) {
      localStorage.removeItem(`onboarding_completed_${userRole}`);
      setShowOnboarding(true);
    }
  };

  return {
    showOnboarding,
    isFirstVisit,
    completeOnboarding,
    resetOnboarding,
  };
};
