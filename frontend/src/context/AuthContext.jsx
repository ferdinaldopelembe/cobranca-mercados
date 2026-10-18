import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);
const STORAGE_KEY = "cobranca_beira_user";

const FAKE_USERS = [
  {
    id: 1,
    email: "admin@beira.gov.mz",
    phone: "+258 84 123 4567",
    password: "admin123",
    name: "Administrador",
    role: "Administrador",
  },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  async function login({ identifier, password }) {
    // Simula latência de rede
    await new Promise((r) => setTimeout(r, 500));
    const found = FAKE_USERS.find(
      (u) =>
        (u.email === identifier.trim() || u.phone === identifier.trim()) &&
        u.password === password
    );
    if (!found) {
      throw new Error("Credenciais inválidas. Verifique os dados e tente novamente.");
    }
    const { password: _pw, ...safeUser } = found;
    setUser(safeUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeUser));
    return safeUser;
  }

  function logout() {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}