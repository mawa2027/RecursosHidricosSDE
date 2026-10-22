import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("🚀 main.jsx cargado");
console.log("Elemento root:", document.getElementById("root"));

// Limpiar tokens expirados
const token = localStorage.getItem("token");
if (token) {
  console.log("📌 Token encontrado, usando sesión existente");
} else {
  console.log("🔄 Sin token, necesitas hacer login");
}

const THEME_KEY = 'app:theme';
const storedTheme = localStorage.getItem(THEME_KEY);
const preferredTheme = storedTheme === 'dark' ? 'dark' : 'light';

document.documentElement.classList.toggle('dark', preferredTheme === 'dark');
document.documentElement.style.colorScheme = preferredTheme === 'dark' ? 'dark' : 'light';

const root = document.getElementById("root");
if (root) {
  ReactDOM.createRoot(root).render(<App />);
  console.log("✅ App renderizada");
} else {
  console.error("❌ No se encontró elemento #root");
}
