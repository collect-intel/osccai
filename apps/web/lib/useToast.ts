import { useState, useEffect } from "react";

export const useToast = (duration = 2000) => {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState("");

  const showToast = (newMessage: string) => {
    setMessage(newMessage);
    setIsVisible(true);
  };

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setIsVisible(false), duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration]);

  return { isVisible, message, showToast };
};
