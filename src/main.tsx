import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize theme from localStorage - default to light mode
const initializeTheme = () => {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    // Default to light mode
    document.documentElement.classList.remove("dark");
    if (!savedTheme) {
      localStorage.setItem("theme", "light");
    }
  }
};

initializeTheme();

createRoot(document.getElementById("root")!).render(<App />);
