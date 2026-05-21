import { useState } from "react";

// ─── Google Fonts ────────────────────────────────────────────────────────────
const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=Playfair+Display:wght@600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Outfit', sans-serif; background: #f8f9fb; }
`;

// ─── Design Tokens ───────────────────────────────────────────────────────────
const COLORS = {
  navy:       "#0f1623",
  steel:      "#2E75B6",
  amber:      "#c9933a",
  background: "#f8f9fb",
  white:      "#ffffff",
  border:     "#e2e6eb",
  muted:      "#6b7480",
};

// ─── Top-level App State Shape ───────────────────────────────────────────────
// This is the single source of truth for the entire MVP.
// All stage components read from and write to this object via props.
const INITIAL_APP_STATE = {
  role:               "student",      // "student" | "coordinator"
  student:            { name: "", interviewAnswers: [] },
  selectedProject:    {},
  allProjectIdeas:    [],
  plan:               {},
  reflections:        [],
  evidence:           [],
  interviewQuestions: [],
  interviewResponses: [],
  readinessSummary:   {},
  coordinatorActions: [],
};

// ─── Shared UI Components ────────────────────────────────────────────────────

function TopBar({ role, onRoleChange }) {
  return (
    <header style={{
      background: COLORS.navy,
      padding: "0 40px",
      height: "58px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      {/* Wordmark */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{
          width: "30px", height: "30px",
          background: COLORS.amber,
          borderRadius: "6px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Playfair Display', serif",
          fontWeight: 700, fontSize: "15px",
          color: COLORS.navy,
        }}>L</div>
        <span style={{
          fontFamily: "'Playfair Display', serif",
          fontWeight: 600, fontSize: "17px",
          color: COLORS.white, letterSpacing: "-0.01em",
        }}>
          LearnCompass CAS
        </span>
      </div>

      {/* Role Toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "12px" }}>
          View as:
        </span>
        <div style={{
          display: "flex",
          background: "rgba(255,255,255,0.08)",
          borderRadius: "8px",
          padding: "3px",
          gap: "2px",
        }}>
          {["student", "coordinator"].map((r) => (
            <button
              key={r}
              onClick={() => onRoleChange(r)}
              style={{
                padding: "5px 16px",
                borderRadius: "5px",
                border: "none",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 500,
                fontFamily: "'Outfit', sans-serif",
                textTransform: "capitalize",
                transition: "all 0.15s ease",
                background: role === r ? COLORS.amber : "transparent",
                color: role === r ? COLORS.navy : "rgba(255,255,255,0.6)",
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

function StageBadge({ children, color = COLORS.amber, textColor = COLORS.navy }) {
  return (
    <span style={{
      background: color,
      color: textColor,
      fontSize: "10px",
      fontWeight: 600,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      padding: "4px 10px",
      borderRadius: "4px",
    }}>
      {children}
    </span>
  );
}

function Card({ children, style = {}, accent = false }) {
  return (
    <div style={{
      background: COLORS.white,
      border: accent
        ? `1.5px solid ${COLORS.steel}`
        : `1px solid ${COLORS.border}`,
      borderRadius: "12px",
      padding: "28px",
      ...style,
    }}>
      {children}
    </div>
  );
}

function CardHeading({ children }) {
  return (
    <h2 style={{
      fontFamily: "'Playfair Display', serif",
      fontWeight: 600,
      fontSize: "17px",
      color: COLORS.navy,
      marginBottom: "20px",
    }}>
      {children}
    </h2>
  );
}

// ─── Placeholder Content Panels ──────────────────────────────────────────────

function TokensPanel() {
  const tokens = [
    { label: "Navy",       hex: COLORS.navy,       text: COLORS.white },
    { label: "Steel Blue", hex: COLORS.steel,      text: COLORS.white },
    { label: "Amber",      hex: COLORS.amber,      text: COLORS.navy  },
    { label: "Background", hex: COLORS.background, text: COLORS.navy, border: `1px solid ${COLORS.border}` },
  ];
  return (
    <Card>
      <CardHeading>Design Tokens</CardHeading>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {tokens.map(({ label, hex, text, border }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{
              width: "44px", height: "44px",
              borderRadius: "8px",
              background: hex,
              border: border || "none",
              flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: "10px", color: text, fontWeight: 700 }}>Aa</span>
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 500, color: COLORS.navy }}>{label}</div>
              <div style={{ fontSize: "12px", color: COLORS.muted, fontFamily: "monospace" }}>{hex}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function StatePanel({ role }) {
  return (
    <Card>
      <CardHeading>App State (appState)</CardHeading>
      <div style={{
        background: COLORS.background,
        border: `1px solid ${COLORS.border}`,
        borderRadius: "8px",
        padding: "16px",
        fontFamily: "monospace",
        fontSize: "12px",
        lineHeight: "2",
      }}>
        {Object.entries(INITIAL_APP_STATE)
          .filter(([k]) => k !== "role")
          .map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: COLORS.steel, fontWeight: 600 }}>{k}</span>
              <span style={{ color: COLORS.muted }}>
                {Array.isArray(v) ? "[ ]" : typeof v === "object" ? "{ }" : `"${v}"`}
              </span>
            </div>
          ))}
        <div style={{
          borderTop: `1px dashed ${COLORS.border}`,
          marginTop: "8px", paddingTop: "8px",
          display: "flex", justifyContent: "space-between",
        }}>
          <span style={{ color: COLORS.steel, fontWeight: 600 }}>role</span>
          <span style={{ color: COLORS.amber, fontWeight: 600 }}>"{role}"</span>
        </div>
      </div>
    </Card>
  );
}

function TypographyPanel() {
  return (
    <Card style={{ gridColumn: "1 / -1" }}>
      <CardHeading>Typography System</CardHeading>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
        <div>
          <div style={{
            fontSize: "11px", fontWeight: 600, color: COLORS.muted,
            letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "14px",
          }}>
            Playfair Display — Headings
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "32px", color: COLORS.navy, lineHeight: 1.15 }}>
            Stage Heading 700
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: "22px", color: COLORS.navy, lineHeight: 1.2, marginTop: "8px" }}>
            Section Heading 600
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: "16px", color: COLORS.steel, lineHeight: 1.3, marginTop: "8px" }}>
            Card Heading 600
          </div>
        </div>
        <div>
          <div style={{
            fontSize: "11px", fontWeight: 600, color: COLORS.muted,
            letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "14px",
          }}>
            Outfit — Body
          </div>
          {[
            { w: 600, label: "SemiBold 600 — buttons, labels, CTAs" },
            { w: 500, label: "Medium 500 — emphasis, field labels" },
            { w: 400, label: "Regular 400 — body copy, descriptions" },
            { w: 300, label: "Light 300 — taglines, captions, hints" },
          ].map(({ w, label }) => (
            <div key={w} style={{
              fontWeight: w,
              fontSize: "15px",
              color: w === 300 ? COLORS.muted : COLORS.navy,
              marginBottom: "6px",
            }}>
              {label}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function CriteriaPanel() {
  const items = [
    { ok: true,  text: "Outfit + Playfair Display loaded via Google Fonts @import" },
    { ok: true,  text: "All four design tokens (navy, steel, amber, background) visibly applied" },
    { ok: true,  text: "appState initialised with all 11 keys via useState" },
    { ok: true,  text: "Role toggle switches appState.role and re-renders label live" },
    { ok: true,  text: "No AI calls — scaffold only" },
    { ok: false, text: "VITE_ANTHROPIC_API_KEY — set as Vercel env var, never committed to repo", deploy: true },
  ];
  return (
    <Card accent style={{ gridColumn: "1 / -1" }}>
      <CardHeading>Sprint 1 — Acceptance Criteria</CardHeading>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {items.map(({ ok, text, deploy }, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div style={{
              width: "20px", height: "20px",
              borderRadius: "50%",
              background: ok ? "#16a34a" : COLORS.amber,
              flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginTop: "1px",
            }}>
              <span style={{ color: COLORS.white, fontSize: "10px", fontWeight: 700 }}>
                {ok ? "✓" : "!"}
              </span>
            </div>
            <div>
              <span style={{ fontSize: "14px", color: COLORS.navy }}>{text}</span>
              {deploy && (
                <span style={{ fontSize: "12px", color: COLORS.muted }}>
                  {" "}— deployment step, confirmed before Sprint 9
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Root App Component ──────────────────────────────────────────────────────

export default function App() {
  const [appState, setAppState] = useState(INITIAL_APP_STATE);

  const setRole = (role) =>
    setAppState((prev) => ({ ...prev, role }));

  const isCoordinator = appState.role === "coordinator";

  // Future sprints: replace this placeholder with the active stage component
  // e.g. currentStage === 1 && <DiscoveryStage appState={appState} setAppState={setAppState} />

  return (
    <>
      <style>{FONTS}</style>

      <div style={{
        minHeight: "100vh",
        background: COLORS.background,
        fontFamily: "'Outfit', sans-serif",
        color: COLORS.navy,
      }}>
        <TopBar role={appState.role} onRoleChange={setRole} />

        <main style={{ maxWidth: "900px", margin: "0 auto", padding: "52px 40px 80px" }}>

          {/* Sprint / role badge */}
          <div style={{ marginBottom: "22px" }}>
            <StageBadge
              color={isCoordinator ? COLORS.steel : COLORS.amber}
              textColor={isCoordinator ? COLORS.white : COLORS.navy}
            >
              Sprint 1 — Platform Scaffold ·{" "}
              {isCoordinator ? "Coordinator View" : "Student View"}
            </StageBadge>
          </div>

          {/* Hero */}
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 700,
            fontSize: "52px",
            color: COLORS.navy,
            lineHeight: 1.12,
            letterSpacing: "-0.025em",
            marginBottom: "10px",
          }}>
            LearnCompass CAS
          </h1>
          <p style={{
            fontWeight: 300,
            fontSize: "22px",
            color: COLORS.steel,
            marginBottom: "52px",
            letterSpacing: "0.005em",
          }}>
            Push the Learning Up
          </p>

          {/* Panels grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <TokensPanel />
            <StatePanel role={appState.role} />
            <TypographyPanel />
            <CriteriaPanel />
          </div>

        </main>
      </div>
    </>
  );
}
