import React, { FormEvent, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Airfoil, AirfoilKind, api, GeometryPlugin, ModelParameters, PluginEvaluation, Role, setCsrf, Theme, User } from "./api";
import "./styles.css";

type Auth = { user: User; csrf_token: string };
const ModelPreview3D = React.lazy(() => import("./ModelPreview3D").then(module => ({ default: module.ModelPreview3D })));

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
      <small>Version 0.4.0</small>
    </form></section>
  </main>;
}

function Shell({ user, onUser, onLogout }: { user: User; onUser: (u: User) => void; onLogout: () => void }) {
  const [view, setView] = useState<"designer" | "airfoils" | "profile" | "users">("designer");
  return <div className="shell"><aside>
    <div className="brand"><span className="brand-mark">FS</span><span><strong>FlächenSchmiede</strong><small>Version 0.4.0</small></span></div>
    <nav><button className={view === "designer" ? "active" : ""} onClick={() => setView("designer")}>Modell-Konfigurator</button>
      <button className={view === "airfoils" ? "active" : ""} onClick={() => setView("airfoils")}>Tragflächenprofile</button>
      <button className={view === "profile" ? "active" : ""} onClick={() => setView("profile")}>Mein Profil</button>
      {user.role === "admin" && <button className={view === "users" ? "active" : ""} onClick={() => setView("users")}>Benutzerverwaltung</button>}</nav>
    <div className="account"><span className="avatar">{user.display_name.slice(0, 2).toUpperCase()}</span>
      <span><strong>{user.display_name}</strong><small>{user.role === "admin" ? "Administrator" : "Benutzer"}</small></span></div>
    <button className="ghost" onClick={onLogout}>Abmelden</button>
  </aside><div className="content">
    {view === "designer" && <ModelDesigner />}
    {view === "airfoils" && <Airfoils user={user} />}
    {view === "profile" && <Profile user={user} onUser={onUser} />}
    {view === "users" && user.role === "admin" && <Users />}
  </div></div>;
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

function PlanformPreview({ evaluation }: { evaluation: PluginEvaluation | null }) {
  const outline = evaluation?.geometry.wingOutline || [];
  if (!outline.length) return <div className="model-empty">Parameter berechnen, um die Draufsicht anzuzeigen.</div>;
  const xs = outline.map(point => point[0]); const ys = outline.map(point => point[1]);
  const minX = Math.min(...xs); const maxX = Math.max(...xs);
  const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const scale = Math.min(520 / Math.max(maxX - minX, 1), 300 / Math.max(maxY - minY, 1));
  const mapPoint = (point: number[]) => [
    40 + (point[0] - minX) * scale,
    170 - ((point[1] - (minY + maxY) / 2) * scale),
  ];
  const path = outline.map((point, index) => {
    const [x, y] = mapPoint(point);
    return `${index ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ") + " Z";
  return <svg className="planform-preview" viewBox="0 0 600 340" role="img" aria-label="Draufsicht des Flugmodells">
    <line x1="20" y1="170" x2="580" y2="170" className="axis" />
    <path d={path} />
    {(evaluation?.geometry.motorPositions || []).map((point, index) => {
      const [x, y] = mapPoint(point);
      return <g key={index}><circle cx={x} cy={y} r="10" /><line x1={x - 14} y1={y} x2={x + 14} y2={y} /></g>;
    })}
  </svg>;
}

function ModelDesigner() {
  const [plugins, setPlugins] = useState<GeometryPlugin[]>([]);
  const [plugin, setPlugin] = useState<GeometryPlugin | null>(null);
  const [parameters, setParameters] = useState<ModelParameters | null>(null);
  const [evaluation, setEvaluation] = useState<PluginEvaluation | null>(null);
  const [preview, setPreview] = useState<"2d" | "3d">("3d");
  const [cameraView, setCameraView] = useState<"perspective" | "top">("perspective");
  const [autoRotate, setAutoRotate] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    api<GeometryPlugin[]>("/plugins").then(list => {
      setPlugins(list); setPlugin(list[0] || null);
      setParameters(list[0]?.presets[0]?.parameters || null);
    }).catch(e => setError(e.message));
  }, []);
  const setWing = (key: keyof ModelParameters["wing"], value: number) => {
    setParameters(current => current ? { ...current, wing: { ...current.wing, [key]: value } } : current);
  };
  const setWeight = (key: keyof ModelParameters["weight"], value: number) => {
    setParameters(current => current ? { ...current, weight: { ...current.weight, [key]: value } } : current);
  };
  async function calculate(event?: FormEvent) {
    event?.preventDefault();
    if (!plugin || !parameters) return;
    try {
      const result = await api<PluginEvaluation>(`/plugins/${plugin.manifest.id}/evaluate`, {
        method: "POST", body: JSON.stringify({ parameters }),
      });
      setEvaluation(result); setError("");
    } catch (e) { setError((e as Error).message); }
  }
  function choosePlugin(id: string) {
    const next = plugins.find(item => item.manifest.id === id) || null;
    setPlugin(next); setParameters(next?.presets[0]?.parameters || null); setEvaluation(null);
  }
  if (!parameters) return <><header><p className="eyebrow">Geometrie</p><h1>Modell-Konfigurator</h1></header>
    <div className="card">{error || "Keine Geometrie-Plugins verfügbar."}</div></>;
  return <><header><p className="eyebrow">Geometrie-Plugin</p><h1>Modell-Konfigurator</h1>
    <p className="muted">Parameter einstellen, serverseitig validieren und unmittelbar in 2D und 3D prüfen.</p></header>
    {error && <div className="alert error">{error}</div>}
    <div className="designer-grid"><form className="card parameter-panel" onSubmit={calculate}>
      <label>Modelltyp<select value={plugin?.manifest.id} onChange={e => choosePlugin(e.target.value)}>
        {plugins.map(item => <option key={item.manifest.id} value={item.manifest.id}>{item.manifest.name}</option>)}
      </select></label>
      <div className="preset-row">{plugin?.presets.map(preset => <button type="button" className="secondary compact" key={preset.name}
        onClick={() => { setParameters(preset.parameters); setEvaluation(null); }}>{preset.name}</button>)}</div>
      <h2>Tragfläche</h2><div className="field-pair">
        <label>Spannweite (mm)<input type="number" value={parameters.wing.spanMm} min="100" onChange={e => setWing("spanMm", Number(e.target.value))} /></label>
        <label>Wurzeltiefe (mm)<input type="number" value={parameters.wing.rootChordMm} min="20" onChange={e => setWing("rootChordMm", Number(e.target.value))} /></label>
        <label>Randtiefe (mm)<input type="number" value={parameters.wing.tipChordMm} min="20" onChange={e => setWing("tipChordMm", Number(e.target.value))} /></label>
        <label>Pfeilung (°)<input type="number" value={parameters.wing.sweepDeg} step=".5" onChange={e => setWing("sweepDeg", Number(e.target.value))} /></label>
        <label>V-Form (°)<input type="number" value={parameters.wing.dihedralDeg} step=".5" onChange={e => setWing("dihedralDeg", Number(e.target.value))} /></label>
      </div><h2>Gewicht</h2><div className="field-pair">
        <label>Zielgewicht (g)<input type="number" value={parameters.weight.targetG} min="1" onChange={e => setWeight("targetG", Number(e.target.value))} /></label>
        <label>Reserve (g)<input type="number" value={parameters.weight.reserveG} min="0" onChange={e => setWeight("reserveG", Number(e.target.value))} /></label>
      </div><button className="primary">Berechnen und prüfen</button>
    </form><section className="card model-result"><div className="section-title"><div><p className="eyebrow">{preview === "3d" ? "3D-Vorschau" : "Draufsicht"}</p><h2>{plugin?.manifest.name}</h2></div>
      <span className="version-chip">Plugin {plugin?.manifest.version}</span></div>
      <div className="preview-toolbar" aria-label="Vorschauoptionen">
        <div className="segmented"><button type="button" className={preview === "3d" ? "active" : ""} onClick={() => setPreview("3d")}>3D</button>
          <button type="button" className={preview === "2d" ? "active" : ""} onClick={() => setPreview("2d")}>2D</button></div>
        {preview === "3d" && <div className="preview-actions">
          <button type="button" className="secondary compact" onClick={() => setCameraView(cameraView === "top" ? "perspective" : "top")}>
            {cameraView === "top" ? "Perspektive" : "Draufsicht"}</button>
          <button type="button" className={`secondary compact ${autoRotate ? "selected" : ""}`} aria-pressed={autoRotate}
            onClick={() => setAutoRotate(value => !value)}>Auto-Drehung</button>
        </div>}
      </div>
      {preview === "3d" ? <Suspense fallback={<div className="model-empty">3D-Ansicht wird geladen …</div>}>
        <ModelPreview3D evaluation={evaluation} view={cameraView} autoRotate={autoRotate} />
      </Suspense>
        : <PlanformPreview evaluation={evaluation} />}
      <div className="validation-list">{evaluation?.messages.map(message => <div key={message.code} className={`validation ${message.severity}`}>{message.message}</div>)}</div>
      {evaluation && Object.keys(evaluation.calculations).length > 0 && <div className="calculation-grid">
        {Object.entries(evaluation.calculations).map(([key, value]) => <div key={key}><span>{key}</span><strong>{value}</strong></div>)}
      </div>}
    </section></div></>;
}

const kindLabels: Record<AirfoilKind, string> = {
  conventional: "Klassisch", kfm1: "KFm1", kfm2: "KFm2", kfm4: "KFm4",
};

function AirfoilPreview({ airfoil }: { airfoil: Airfoil }) {
  const points = airfoil.coordinates;
  if (!points.length) return null;
  const minY = Math.min(...points.map(point => point[1]));
  const maxY = Math.max(...points.map(point => point[1]));
  const rangeY = Math.max(maxY - minY, .12);
  const path = points.map((point, index) => {
    const x = 25 + point[0] * 550;
    const y = 110 - ((point[1] - (minY + maxY) / 2) / rangeY) * 150;
    return `${index ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
  return <svg className="airfoil-preview" viewBox="0 0 600 220" role="img" aria-label={`Kontur ${airfoil.name}`}>
    <line x1="25" y1="110" x2="575" y2="110" className="axis" />
    <path d={path} />
  </svg>;
}

function Airfoils({ user }: { user: User }) {
  const [airfoils, setAirfoils] = useState<Airfoil[]>([]);
  const [selected, setSelected] = useState<Airfoil | null>(null);
  const [kind, setKind] = useState<AirfoilKind>("conventional");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = async () => {
    try {
      const list = await api<Airfoil[]>(`/airfoils?include_inactive=${user.role === "admin"}`);
      setAirfoils(list);
      setSelected(current => list.find(item => item.id === current?.id) || list[0] || null);
    } catch (e) { setError((e as Error).message); }
  };
  useEffect(() => { void load(); }, []);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await api("/admin/airfoils", { method: "POST", body: JSON.stringify({
        name: data.get("name"), kind, description: data.get("description") || null,
        dat_content: kind === "conventional" ? data.get("dat_content") : null,
        step_position: Number(data.get("step_position") || .5),
        thickness: Number(data.get("thickness") || .08),
      }) });
      form.reset(); setKind("conventional"); setMessage("Profil wurde angelegt."); setError("");
      await load();
    } catch (e) { setError((e as Error).message); setMessage(""); }
  }
  async function toggle(airfoil: Airfoil) {
    try {
      await api(`/admin/airfoils/${airfoil.id}`, { method: "PATCH",
        body: JSON.stringify({ is_active: !airfoil.is_active }) });
      await load();
    } catch (e) { setError((e as Error).message); }
  }
  return <><header><p className="eyebrow">Profilbibliothek</p><h1>Tragflächenprofile</h1>
    <p className="muted">Normierte Profilkonturen für Konstruktion und Vorschau.</p></header>
    {(error || message) && <div className={`alert ${error ? "error" : "success"}`}>{error || message}</div>}
    {user.role === "admin" && <form className="card airfoil-form" onSubmit={create}><h2>Profil hinzufügen</h2>
      <label>Name<input name="name" required minLength={2} placeholder="z. B. NACA 2412" /></label>
      <label>Typ<select value={kind} onChange={e => setKind(e.target.value as AirfoilKind)}>
        {Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <label className="full">Beschreibung<input name="description" placeholder="Optionale Herkunft oder Hinweise" /></label>
      {kind === "conventional" ? <label className="full">DAT-Koordinaten
        <textarea name="dat_content" required rows={8} placeholder={"Profilname\n1.0000 0.0000\n0.5000 0.0800\n0.0000 0.0000\n0.5000 -0.0400\n1.0000 0.0000"} />
      </label> : <><label>Stufenposition (Anteil Profiltiefe)<input name="step_position" type="number" min=".1" max=".9" step=".01" defaultValue=".5" required /></label>
        <label>Dicke (Anteil Profiltiefe)<input name="thickness" type="number" min=".01" max=".3" step=".01" defaultValue=".08" required /></label></>}
      <button className="primary">Profil anlegen</button></form>}
    <div className="airfoil-layout"><section className="card airfoil-list"><h2>Bibliothek <span>{airfoils.length}</span></h2>
      {airfoils.length === 0 && <p className="muted">Noch keine Profile vorhanden.</p>}
      {airfoils.map(item => <button type="button" key={item.id} className={`airfoil-item ${selected?.id === item.id ? "selected" : ""}`} onClick={() => setSelected(item)}>
        <span><strong>{item.name}</strong><small>{kindLabels[item.kind]}</small></span>
        <span className={`status ${item.is_active ? "active" : ""}`}>{item.is_active ? "Aktiv" : "Inaktiv"}</span>
      </button>)}</section>
      <section className="card airfoil-detail">{selected ? <><div className="section-title"><div><p className="eyebrow">{kindLabels[selected.kind]}</p><h2>{selected.name}</h2></div>
        {user.role === "admin" && <button className="secondary compact" onClick={() => toggle(selected)}>{selected.is_active ? "Deaktivieren" : "Aktivieren"}</button>}</div>
        <AirfoilPreview airfoil={selected} /><p className="muted">{selected.description || "Keine Beschreibung hinterlegt."}</p>
        <dl><div><dt>Koordinaten</dt><dd>{selected.coordinates.length}</dd></div>
          {Object.entries(selected.parameters).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value)}</dd></div>)}</dl>
      </> : <p className="muted">Profil auswählen, um die Kontur anzuzeigen.</p>}</section></div></>;
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme === "system"
    ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme;
}
function App() {
  const [auth, setAuth] = useState<Auth | null | undefined>(undefined);
  useEffect(() => { api<Auth>("/auth/me").then(a => { setCsrf(a.csrf_token); applyTheme(a.user.theme); setAuth(a); }).catch(() => setAuth(null)); }, []);
  if (auth === undefined) return <div className="loading">FlächenSchmiede wird geladen …</div>;
  if (!auth) return <Login onLogin={a => { applyTheme(a.user.theme); setAuth(a); }} />;
  return <Shell user={auth.user} onUser={user => setAuth({ ...auth, user })} onLogout={async () => {
    await api("/auth/logout", { method: "POST" }); setAuth(null);
  }} />;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
