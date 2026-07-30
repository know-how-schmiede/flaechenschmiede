import React, { FormEvent, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { api, Role, setCsrf, Theme, User } from "./api";
import "./styles.css";

type Auth = { user: User; csrf_token: string };

function Login({ onLogin }: { onLogin: (auth: Auth) => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      const auth = await api<Auth>("/auth/login", { method: "POST", body: JSON.stringify({
        email: data.get("email"), password: data.get("password"),
      }) });
      setCsrf(auth.csrf_token); onLogin(auth);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <main className="login-page">
    <section className="login-visual">
      <div className="brand-mark">FS</div>
      <p className="eyebrow">Parametrisch. Präzise. Persönlich.</p>
      <h1>FlächenSchmiede</h1>
      <p>Konstruiere dein nächstes RC-Flugmodell – vom Profil bis zum fertigen Bauplan.</p>
      <div className="wing-lines" aria-hidden="true">⌁</div>
    </section>
    <section className="login-panel"><form className="auth-card" onSubmit={submit}>
      <p className="eyebrow">Willkommen zurück</p><h2>Anmelden</h2>
      <p className="muted">Melde dich mit deinem FlächenSchmiede-Konto an.</p>
      {error && <div className="alert error">{error}</div>}
      <label>E-Mail-Adresse<input name="email" type="email" autoComplete="email" required /></label>
      <label>Passwort<input name="password" type="password" autoComplete="current-password" minLength={8} required /></label>
      <button className="primary" disabled={busy}>{busy ? "Anmeldung läuft …" : "Anmelden"}</button>
      <small>Version 0.1.2</small>
    </form></section>
  </main>;
}

function Shell({ user, onUser, onLogout }: { user: User; onUser: (u: User) => void; onLogout: () => void }) {
  return <div className="shell"><aside>
    <div className="brand"><span className="brand-mark">FS</span><span><strong>FlächenSchmiede</strong><small>Version 0.1.2</small></span></div>
    <nav><NavLink to="/profile">Profil</NavLink>{user.role === "admin" && <NavLink to="/admin/users">Benutzerverwaltung</NavLink>}</nav>
    <div className="account"><span className="avatar">{user.display_name.slice(0, 2).toUpperCase()}</span>
      <span><strong>{user.display_name}</strong><small>{user.role === "admin" ? "Administrator" : "Benutzer"}</small></span></div>
    <button className="ghost" onClick={onLogout}>Abmelden</button>
  </aside><div className="content"><Routes>
    <Route path="/profile" element={<Profile user={user} onUser={onUser} />} />
    <Route path="/admin/users" element={user.role === "admin" ? <Users /> : <Navigate to="/profile" />} />
    <Route path="*" element={<Navigate to="/profile" />} />
  </Routes></div></div>;
}

function Profile({ user, onUser }: { user: User; onUser: (u: User) => void }) {
  const [message, setMessage] = useState(""); const [error, setError] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    try {
      const updated = await api<User>("/profile", { method: "PUT", body: JSON.stringify({
        display_name: data.get("display_name"), email: data.get("email"), theme: data.get("theme"),
      }) });
      onUser(updated); applyTheme(updated.theme); setMessage("Profil wurde gespeichert."); setError("");
    } catch (e) { setError((e as Error).message); }
  }
  async function password(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    try { await api("/profile/password", { method: "PUT", body: JSON.stringify({
      current_password: data.get("current_password"), new_password: data.get("new_password"),
    }) }); form.reset(); setMessage("Passwort wurde geändert."); setError(""); }
    catch (e) { setError((e as Error).message); }
  }
  return <><header><p className="eyebrow">Konto</p><h1>Mein Profil</h1><p className="muted">Persönliche Daten und Darstellung verwalten.</p></header>
    {(message || error) && <div className={`alert ${error ? "error" : "success"}`}>{error || message}</div>}
    <div className="profile-grid"><form className="card" onSubmit={save}><h2>Persönliche Daten</h2>
      <label>Anzeigename<input name="display_name" defaultValue={user.display_name} required minLength={2} /></label>
      <label>E-Mail-Adresse<input name="email" type="email" defaultValue={user.email} required /></label>
      <label>Darstellung<select name="theme" defaultValue={user.theme}><option value="system">System</option><option value="light">Hell</option><option value="dark">Dunkel</option></select></label>
      <button className="primary">Änderungen speichern</button></form>
    <form className="card" onSubmit={password}><h2>Passwort ändern</h2><p className="muted">Mindestens 12 Zeichen verwenden.</p>
      <label>Aktuelles Passwort<input name="current_password" type="password" required /></label>
      <label>Neues Passwort<input name="new_password" type="password" minLength={12} required /></label>
      <button className="secondary">Passwort aktualisieren</button></form></div></>;
}

function Users() {
  const [users, setUsers] = useState<User[]>([]); const [error, setError] = useState("");
  const load = () => api<User[]>("/admin/users").then(setUsers).catch(e => setError(e.message));
  useEffect(() => { void load(); }, []);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const d = new FormData(form);
    try { await api("/admin/users", { method: "POST", body: JSON.stringify({
      display_name: d.get("display_name"), email: d.get("email"), password: d.get("password"), role: d.get("role"),
    }) }); form.reset(); load(); } catch (e) { setError((e as Error).message); }
  }
  async function update(user: User, role: Role, active: boolean) {
    try { await api(`/admin/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ role, is_active: active }) }); load(); }
    catch (e) { setError((e as Error).message); }
  }
  return <><header><p className="eyebrow">Administration</p><h1>Benutzerverwaltung</h1><p className="muted">{users.length} Konten eingerichtet</p></header>
    {error && <div className="alert error">{error}</div>}<form className="card create-user" onSubmit={create}><h2>Neues Konto</h2>
      <label>Name<input name="display_name" required minLength={2} /></label><label>E-Mail<input name="email" type="email" required /></label>
      <label>Startpasswort<input name="password" type="password" required minLength={12} /></label>
      <label>Rolle<select name="role"><option value="user">Benutzer</option><option value="admin">Administrator</option></select></label>
      <button className="primary">Konto anlegen</button></form>
    <section className="card table-card"><table><thead><tr><th>Benutzer</th><th>Rolle</th><th>Status</th><th>Seit</th></tr></thead><tbody>
      {users.map(u => <tr key={u.id}><td><strong>{u.display_name}</strong><small>{u.email}</small></td>
        <td><select value={u.role} onChange={e => update(u, e.target.value as Role, u.is_active)}><option value="user">Benutzer</option><option value="admin">Administrator</option></select></td>
        <td><button className={`status ${u.is_active ? "active" : ""}`} onClick={() => update(u, u.role, !u.is_active)}>{u.is_active ? "Aktiv" : "Inaktiv"}</button></td>
        <td>{new Date(u.created_at).toLocaleDateString("de-DE")}</td></tr>)}</tbody></table></section></>;
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme === "system"
    ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme;
}
function App() {
  const [auth, setAuth] = useState<Auth | null | undefined>(undefined); const navigate = useNavigate();
  useEffect(() => { api<Auth>("/auth/me").then(a => { setCsrf(a.csrf_token); applyTheme(a.user.theme); setAuth(a); }).catch(() => setAuth(null)); }, []);
  if (auth === undefined) return <div className="loading">FlächenSchmiede wird geladen …</div>;
  if (!auth) return <Login onLogin={a => { applyTheme(a.user.theme); setAuth(a); navigate("/profile"); }} />;
  return <Shell user={auth.user} onUser={user => setAuth({ ...auth, user })} onLogout={async () => {
    await api("/auth/logout", { method: "POST" }); setAuth(null); navigate("/");
  }} />;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><BrowserRouter><App /></BrowserRouter></React.StrictMode>);
