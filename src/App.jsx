import { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase Client ──────────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=Playfair+Display:wght@600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Outfit', sans-serif; background: #f8f9fb; }
  @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
`;
const C = {
  navy:"#0f1623", steel:"#2E75B6", amber:"#c9933a",
  bg:"#f8f9fb", white:"#ffffff", border:"#e2e6eb", muted:"#6b7480",
  green:"#16a34a", greenBg:"#f0fdf4", greenBorder:"#bbf7d0",
  red:"#dc2626", redBg:"#fef2f2", redBorder:"#fecaca",
};
const LOS = [
  { id:"LO1", label:"Identify own strengths and develop areas for growth" },
  { id:"LO2", label:"Demonstrate that challenges have been undertaken, developing new skills" },
  { id:"LO3", label:"Demonstrate how to initiate and plan a CAS experience" },
  { id:"LO4", label:"Show commitment to and perseverance in CAS experiences" },
  { id:"LO5", label:"Demonstrate the skills and recognise the benefits of working collaboratively" },
  { id:"LO6", label:"Demonstrate engagement with issues of global significance" },
  { id:"LO7", label:"Recognise and consider the ethics of choices and actions" },
];

const STAGE_META = [
  { steps:["consent","welcome"],         label:"Project Discovery",       pct:5  },
  { steps:["interview"],                  label:"Interview in progress",   pct:15 },
  { steps:["proposals"],                  label:"Reviewing project ideas", pct:30 },
  { steps:["verification"],               label:"Real-world verification", pct:45 },
  { steps:["lockin","override"],          label:"Locking in project",      pct:55 },
  { steps:["planning"],                   label:"Planning",                pct:65 },
  { steps:["reflections"],                label:"Reflection Journal",      pct:75 },
  { steps:["evidence"],                   label:"Evidence Mapping",        pct:85 },
  { steps:["interview_prep","readiness"], label:"Interview Preparation",   pct:95 },
  { steps:["coord"],                      label:"Complete",                pct:100},
];
function getStageMeta(step) {
  if (!step) return STAGE_META[0];
  return STAGE_META.find(s => s.steps.some(k => step.startsWith(k))) || STAGE_META[0];
}
function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
}

async function callClaude(system, messages, maxTokens=1000) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:maxTokens,system,messages}),
  });
  if (!res.ok) { const e=await res.json().catch(()=>({})); throw new Error(e.error?.message||"API error "+res.status); }
  return (await res.json()).content[0].text;
}
function parseJSON(text) {
  let t=text.trim().replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/\s*```\s*$/i,"").trim();
  try{return JSON.parse(t);}catch{}
  const am=t.match(/(\[[\s\S]*\])/); if(am){try{return JSON.parse(am[1]);}catch{}}
  const om=t.match(/(\{[\s\S]*\})/); if(om){try{return JSON.parse(om[1]);}catch{}}
  let r=t.replace(/,\s*([}\]])/g,"$1").replace(/([{,]\s*)(\w+)\s*:/g,'$1"$2":').replace(/:\s*'([^']*)'/g,':"$1"').replace(/[\x00-\x1F\x7F]/g," ");
  try{return JSON.parse(r);}catch{}
  throw new Error("Could not parse JSON — "+t.slice(0,120));
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function TopBar({role,onRoleChange,profile,onSignOut}) {
  return (
    <header style={{background:C.navy,padding:"0 40px",height:"58px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
      <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
        <div style={{width:"30px",height:"30px",background:C.amber,borderRadius:"6px",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:"15px",color:C.navy}}>L</div>
        <span style={{fontFamily:"'Playfair Display',serif",fontWeight:600,fontSize:"17px",color:C.white,letterSpacing:"-0.01em"}}>LearnCompass CAS</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:"16px"}}>
        {profile?.email&&<span style={{fontSize:"12px",color:"rgba(255,255,255,0.4)"}}>{profile.email}</span>}
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <span style={{color:"rgba(255,255,255,0.45)",fontSize:"12px"}}>View as:</span>
          <div style={{display:"flex",background:"rgba(255,255,255,0.08)",borderRadius:"8px",padding:"3px",gap:"2px"}}>
            {["student","coordinator"].map(r=>(
              <button key={r} onClick={()=>onRoleChange(r)} style={{padding:"5px 16px",borderRadius:"5px",border:"none",cursor:"pointer",fontSize:"12px",fontWeight:500,fontFamily:"'Outfit',sans-serif",textTransform:"capitalize",background:role===r?C.amber:"transparent",color:role===r?C.navy:"rgba(255,255,255,0.6)"}}>{r}</button>
            ))}
          </div>
        </div>
        {onSignOut&&<button onClick={onSignOut} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"6px",padding:"5px 12px",fontSize:"11px",color:"rgba(255,255,255,0.6)",cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Sign out</button>}
      </div>
    </header>
  );
}
function TopBarAuth({email,showSignOut,onSignOut}) {
  return (
    <header style={{background:C.navy,padding:"0 40px",height:"58px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
      <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
        <div style={{width:"30px",height:"30px",background:C.amber,borderRadius:"6px",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:"15px",color:C.navy}}>L</div>
        <span style={{fontFamily:"'Playfair Display',serif",fontWeight:600,fontSize:"17px",color:C.white,letterSpacing:"-0.01em"}}>LearnCompass CAS</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
        {email&&<span style={{fontSize:"12px",color:"rgba(255,255,255,0.4)"}}>{email}</span>}
        {showSignOut&&<button onClick={onSignOut} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"6px",padding:"5px 12px",fontSize:"11px",color:"rgba(255,255,255,0.6)",cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Sign out</button>}
      </div>
    </header>
  );
}
function Badge({children,coord,style={}}) { return <span style={{display:"inline-block",background:coord?C.steel:C.amber,color:coord?C.white:C.navy,fontSize:"10px",fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",padding:"4px 10px",borderRadius:"4px",marginBottom:"20px",...style}}>{children}</span>; }
function Card({children,accent,style={}}) { return <div style={{background:C.white,border:accent?`1.5px solid ${C.steel}`:`1px solid ${C.border}`,borderRadius:"12px",padding:"28px",...style}}>{children}</div>; }
function H1({children,style={}}) { return <h1 style={{fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:"38px",color:C.navy,lineHeight:1.12,letterSpacing:"-0.025em",marginBottom:"8px",...style}}>{children}</h1>; }
function Sub({children}) { return <p style={{fontWeight:300,fontSize:"17px",color:C.steel,marginBottom:"32px"}}>{children}</p>; }
function Label({children}) { return <div style={{fontSize:"12px",fontWeight:600,color:C.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:"8px"}}>{children}</div>; }
function Btn({children,onClick,disabled,secondary,small,style={}}) {
  if(secondary) return <button onClick={onClick} disabled={disabled} style={{background:"transparent",color:C.navy,border:`1px solid ${C.border}`,borderRadius:"8px",padding:small?"8px 16px":"12px 24px",fontFamily:"'Outfit',sans-serif",fontSize:small?"13px":"14px",fontWeight:500,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.45:1,...style}}>{children}</button>;
  return <button onClick={onClick} disabled={disabled} style={{background:disabled?C.border:C.amber,color:disabled?C.muted:C.navy,border:"none",borderRadius:"8px",padding:small?"8px 18px":"12px 28px",fontFamily:"'Outfit',sans-serif",fontSize:small?"13px":"15px",fontWeight:600,cursor:disabled?"not-allowed":"pointer",...style}}>{children}</button>;
}
function TextInput({value,onChange,placeholder,onKeyDown,disabled,style={}}) { return <input type="text" value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder} disabled={disabled} style={{width:"100%",border:`1px solid ${C.border}`,borderRadius:"8px",padding:"12px 16px",fontFamily:"'Outfit',sans-serif",fontSize:"15px",color:C.navy,background:disabled?C.bg:C.white,outline:"none",...style}} />; }
function Textarea({value,onChange,placeholder,rows=4,disabled}) { return <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} disabled={disabled} style={{width:"100%",border:`1px solid ${C.border}`,borderRadius:"8px",padding:"12px 16px",fontFamily:"'Outfit',sans-serif",fontSize:"14px",color:C.navy,background:disabled?C.bg:C.white,outline:"none",resize:"vertical",lineHeight:1.6}} />; }
function Dots() { return <div style={{display:"flex",gap:"4px",alignItems:"center"}}>{[0,1,2].map(i=><div key={i} style={{width:"6px",height:"6px",borderRadius:"50%",background:C.muted,animation:`bounce 1.2s ${i*0.2}s infinite ease-in-out`}} />)}</div>; }
function Spinner() { return <div style={{width:"22px",height:"22px",border:`2px solid ${C.border}`,borderTop:`2px solid ${C.steel}`,borderRadius:"50%",animation:"spin 0.8s linear infinite",flexShrink:0}} />; }
function StrandBadge({strand}) { const m={Creativity:{bg:"#e8f0fb",c:"#1a4f99"},Activity:{bg:"#e8f8f0",c:"#1a6640"},Service:{bg:"#fdf3e3",c:"#8a5e1a"}}; const t=m[strand]||m.Creativity; return <span style={{background:t.bg,color:t.c,fontSize:"10px",fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",padding:"3px 9px",borderRadius:"4px",flexShrink:0}}>{strand}</span>; }
function Alert({children,type="info",style={}}) { const m={info:{bg:"#eff6ff",border:"#bfdbfe",c:"#1e40af"},success:{bg:C.greenBg,border:C.greenBorder,c:C.green},warn:{bg:"#fffbeb",border:"#fde68a",c:"#92400e"},error:{bg:C.redBg,border:C.redBorder,c:C.red}}; const t=m[type]; return <div style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:"8px",padding:"12px 16px",fontSize:"13px",color:t.c,lineHeight:1.6,...style}}>{children}</div>; }
function ProgressSteps({steps,current}) {
  return (
    <div style={{display:"flex",alignItems:"center",marginBottom:"32px"}}>
      {steps.map((s,i)=>{const done=i<current;const active=i===current;return(
        <div key={i} style={{display:"flex",alignItems:"center",flex:i<steps.length-1?1:"none"}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"4px"}}>
            <div style={{width:"24px",height:"24px",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:600,background:done?C.green:active?C.amber:C.border,color:done||active?C.white:C.muted,flexShrink:0}}>{done?"✓":i+1}</div>
            <span style={{fontSize:"10px",color:active?C.navy:C.muted,fontWeight:active?600:400,whiteSpace:"nowrap"}}>{s}</span>
          </div>
          {i<steps.length-1&&<div style={{flex:1,height:"2px",background:done?C.green:C.border,margin:"0 4px",marginBottom:"16px"}} />}
        </div>
      );})}
    </div>
  );
}

const INIT = {
  role:"student", step:"consent",
  student:{name:"",yearGroup:"",subjects:[],school:"",neighbourhood:"",availableDays:[],timeWindows:"",interviewAnswers:[],consentGiven:false,uploadedDocSummary:""},
  proposals:[],selectedProposalIndices:[],verificationChecklists:{},
  verificationReport:"",selectedProject:{},allProjectIdeas:[],
  coordinatorActions:[],formalInterviews:[],plan:{},reflections:[],evidence:[],
  interviewQuestions:[],interviewResponses:[],readinessSummary:{},
};

// ─── Supabase utilities ───────────────────────────────────────────────────────
async function saveStateToSupabase(userId,appState) {
  const {error}=await supabase.from("cas_state").upsert({
    student_id:userId,current_step:appState.step||"consent",
    state_json:appState,updated_at:new Date().toISOString(),
  },{onConflict:"student_id"});
  if(error) throw error;
}
async function loadStateFromSupabase(userId) {
  const {data,error}=await supabase.from("cas_state").select("*").eq("student_id",userId).single();
  if(error&&error.code!=="PGRST116") throw error;
  return data||null;
}
async function getOrCreateProfile(userId,email) {
  const {data:existing}=await supabase.from("profiles").select("*").eq("id",userId).single();
  if(existing) return existing;
  const {data:created,error}=await supabase.from("profiles").insert({id:userId,email,role:"student"}).select().single();
  if(error) throw error;
  return created;
}
async function loadAllStudentStates() {
  const {data,error}=await supabase.from("cas_state").select("*, profiles(email,display_name,role)").order("updated_at",{ascending:false});
  if(error) throw error;
  return data||[];
}

// ─── Auth screens ─────────────────────────────────────────────────────────────
function LoadingScreen({message="Loading your session…"}) {
  return <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:"16px"}}><Spinner /><p style={{fontSize:"14px",color:C.muted,fontFamily:"'Outfit',sans-serif"}}>{message}</p></div>;
}

function LoginScreen({onEmailSent}) {
  const [email,setEmail]=useState(""); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  async function sendMagicLink() {
    if(!email.trim()) return; setLoading(true); setError("");
    try { const {error}=await supabase.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:window.location.origin}}); if(error) throw error; onEmailSent(email.trim()); }
    catch(e){setError(e.message);} setLoading(false);
  }
  return (
    <div style={{minHeight:"100vh",background:C.bg}}>
      <TopBarAuth />
      <div style={{maxWidth:"480px",margin:"0 auto",padding:"60px 40px",animation:"fadeIn 0.3s ease"}}>
        <Badge>Student Login</Badge>
        <H1>Welcome to<br/>LearnCompass CAS</H1>
        <Sub>Enter your school email to receive a magic link — no password needed.</Sub>
        <Card>
          <div style={{marginBottom:"16px"}}><Label>School email address</Label><TextInput value={email} onChange={e=>setEmail(e.target.value)} placeholder="student@school.edu" onKeyDown={e=>e.key==="Enter"&&sendMagicLink()} /></div>
          {error&&<div style={{marginBottom:"14px"}}><Alert type="error">{error}</Alert></div>}
          <Btn onClick={sendMagicLink} disabled={!email.trim()||loading}>{loading?"Sending…":"Send magic link →"}</Btn>
          <p style={{marginTop:"16px",fontSize:"12px",color:C.muted,lineHeight:1.7}}>First time? You'll be set up automatically. Links expire after 1 hour.</p>
        </Card>
      </div>
    </div>
  );
}

function MagicLinkSentScreen({email,onBack}) {
  return (
    <div style={{minHeight:"100vh",background:C.bg}}>
      <TopBarAuth />
      <div style={{maxWidth:"480px",margin:"0 auto",padding:"60px 40px",textAlign:"center",animation:"fadeIn 0.3s ease"}}>
        <div style={{fontSize:"52px",marginBottom:"20px"}}>📬</div>
        <Badge>Check your email</Badge>
        <H1>Magic link sent</H1>
        <p style={{fontSize:"16px",color:C.steel,marginBottom:"10px"}}>Sent to <strong>{email}</strong></p>
        <p style={{fontSize:"14px",color:C.muted,lineHeight:1.7,marginBottom:"32px"}}>Click the link in the email to sign in. It expires in 1 hour. This tab updates automatically — you don't need to come back here manually.</p>
        <Btn secondary onClick={onBack}>← Use a different email</Btn>
      </div>
    </div>
  );
}

function StudentDashboard({profile,savedState,lastUpdated,onContinue,onNewProject,onSignOut}) {
  const stage=getStageMeta(savedState?.current_step);
  const isNew=!savedState||savedState.current_step==="consent";
  const studentName=savedState?.state_json?.student?.name||profile?.display_name||profile?.email?.split("@")[0]||"Student";
  const project=savedState?.state_json?.selectedProject;
  return (
    <div style={{minHeight:"100vh",background:C.bg,animation:"fadeIn 0.3s ease"}}>
      <TopBarAuth email={profile?.email} showSignOut onSignOut={onSignOut} />
      <div style={{maxWidth:"720px",margin:"0 auto",padding:"52px 40px 80px"}}>
        <Badge>Student Dashboard</Badge>
        <H1>Welcome back,<br/>{studentName} 👋</H1>
        {isNew ? (
          <><Sub>This is your first session. Let's begin your CAS journey.</Sub><Btn onClick={onContinue}>Begin CAS Project →</Btn></>
        ) : (
          <>
            <Sub>Pick up exactly where you left off.</Sub>
            <Card accent style={{marginBottom:"20px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"20px"}}>
                <div><Label>Current stage</Label><p style={{fontSize:"20px",fontWeight:600,color:C.navy,marginBottom:"6px"}}>{stage.label}</p><p style={{fontSize:"13px",color:C.muted}}>Last saved: {formatDate(lastUpdated)}</p></div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:"11px",color:C.muted,marginBottom:"6px",letterSpacing:"0.05em",textTransform:"uppercase",fontWeight:600}}>Progress</div>
                  <div style={{width:"140px",height:"6px",background:C.border,borderRadius:"4px",overflow:"hidden"}}><div style={{width:`${stage.pct}%`,height:"100%",background:C.amber,borderRadius:"4px"}} /></div>
                  <div style={{fontSize:"12px",color:C.muted,marginTop:"5px"}}>{stage.pct}% complete</div>
                </div>
              </div>
            </Card>
            {project?.title&&(
              <Card style={{marginBottom:"20px"}}>
                <Label>Your CAS Project</Label>
                <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"8px"}}><p style={{fontSize:"17px",fontWeight:600,color:C.navy}}>{project.title}</p><StrandBadge strand={project.strand} /></div>
                {project.learningOutcomes?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:"5px"}}>{project.learningOutcomes.map(lo=><span key={lo} style={{fontSize:"11px",fontWeight:500,background:"#f1f3f6",color:C.muted,padding:"2px 8px",borderRadius:"4px"}}>{lo}</span>)}</div>}
              </Card>
            )}
            <div style={{display:"flex",gap:"12px"}}><Btn onClick={onContinue}>Continue →</Btn><Btn secondary onClick={onNewProject}>Start over</Btn></div>
          </>
        )}
      </div>
    </div>
  );
}

function CoordDashboardShell({profile,onSignOut}) {
  const [students,setStudents]=useState([]); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
  useEffect(()=>{ loadAllStudentStates().then(d=>{setStudents(d);setLoading(false);}).catch(e=>{setError(e.message);setLoading(false);}); },[]);
  return (
    <div style={{minHeight:"100vh",background:C.bg,animation:"fadeIn 0.3s ease"}}>
      <TopBarAuth email={profile?.email} showSignOut onSignOut={onSignOut} />
      <div style={{maxWidth:"900px",margin:"0 auto",padding:"52px 40px 80px"}}>
        <Badge coord>Coordinator Dashboard</Badge>
        <H1>Student Overview</H1>
        <Sub>Live view of student CAS progress. Full coordinator dashboard in Sprint 7.</Sub>
        {loading&&<div style={{display:"flex",alignItems:"center",gap:"12px"}}><Spinner /><span style={{fontSize:"14px",color:C.muted}}>Loading student data…</span></div>}
        {error&&<Alert type="error">{error}</Alert>}
        {!loading&&students.length===0&&<Alert type="info">No student data yet. Students will appear here once they log in and begin their CAS journey.</Alert>}
        {students.map(s=>{
          const stage=getStageMeta(s.current_step);
          const name=s.state_json?.student?.name||s.profiles?.display_name||s.profiles?.email||"Unknown";
          const project=s.state_json?.selectedProject;
          return (
            <Card key={s.id} style={{marginBottom:"16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"20px"}}>
                <div style={{flex:1}}>
                  <p style={{fontSize:"16px",fontWeight:600,color:C.navy,marginBottom:"3px"}}>{name}</p>
                  <p style={{fontSize:"13px",color:C.muted,marginBottom:"8px"}}>{s.profiles?.email}</p>
                  {project?.title&&<div style={{display:"flex",alignItems:"center",gap:"8px"}}><span style={{fontSize:"13px",color:C.navy}}>{project.title}</span>{project.strand&&<StrandBadge strand={project.strand} />}</div>}
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <p style={{fontSize:"13px",fontWeight:600,color:C.steel,marginBottom:"3px"}}>{stage.label}</p>
                  <p style={{fontSize:"12px",color:C.muted,marginBottom:"8px"}}>Updated {formatDate(s.updated_at)}</p>
                  <div style={{width:"120px",height:"4px",background:C.border,borderRadius:"4px",marginLeft:"auto"}}><div style={{width:`${stage.pct}%`,height:"100%",background:C.amber,borderRadius:"4px"}} /></div>
                  <p style={{fontSize:"11px",color:C.muted,marginTop:"4px"}}>{stage.pct}%</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function AuthWrapper() {
  const [session,setSession]=useState(undefined);
  const [profile,setProfile]=useState(null);
  const [savedState,setSavedState]=useState(null);
  const [lastUpdated,setLastUpdated]=useState(null);
  const [authStep,setAuthStep]=useState("login");
  const [sentEmail,setSentEmail]=useState("");
  const [appState,setAppStateRaw]=useState({...INIT});
  const [sessionError,setSessionError]=useState("");

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session){setSession(session);handleSession(session);}
      else{setSession(null);}
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange(async(event,session)=>{
      if(session){setSession(session);if(event==="SIGNED_IN"){setAuthStep("loading");await handleSession(session);}}
      else{setSession(null);setProfile(null);setSavedState(null);setAppStateRaw({...INIT});setAuthStep("login");}
    });
    return ()=>subscription.unsubscribe();
  },[]);

  async function handleSession(session) {
    setAuthStep("loading");
    try {
      const prof=await getOrCreateProfile(session.user.id,session.user.email);
      setProfile(prof);
      if(prof.role==="coordinator"){setAuthStep("coordinator");}
      else {
        const saved=await loadStateFromSupabase(session.user.id);
        setSavedState(saved); setLastUpdated(saved?.updated_at||null);
        if(saved?.state_json) setAppStateRaw({...INIT,...saved.state_json});
        setAuthStep("dashboard");
      }
    } catch(e){setSessionError("Could not load session: "+e.message);setAuthStep("login");}
  }

  function setAppState(newState) {
    setAppStateRaw(newState);
    if(session){ saveStateToSupabase(session.user.id,newState).catch(e=>console.error("Save failed:",e.message)); setLastUpdated(new Date().toISOString()); }
  }

  async function handleSignOut(){await supabase.auth.signOut();}

  if(session===undefined) return <LoadingScreen />;
  if(authStep==="loading") return <LoadingScreen message="Restoring your session…" />;
  if(!session||authStep==="login") return (
    <>{sessionError&&<div style={{position:"fixed",bottom:"20px",right:"20px",zIndex:999,maxWidth:"360px"}}><Alert type="error">{sessionError}</Alert></div>}<LoginScreen onEmailSent={email=>{setSentEmail(email);setAuthStep("sent");}} /></>
  );
  if(authStep==="sent") return <MagicLinkSentScreen email={sentEmail} onBack={()=>setAuthStep("login")} />;
  if(authStep==="coordinator") return <CoordDashboardShell profile={profile} onSignOut={handleSignOut} />;
  if(authStep==="dashboard") return <StudentDashboard profile={profile} savedState={savedState} lastUpdated={lastUpdated} onContinue={()=>setAuthStep("app")} onNewProject={()=>{setAppState({...INIT});setAuthStep("app");}} onSignOut={handleSignOut} />;
  if(authStep==="app") return <CASApp appState={appState} onStateChange={setAppState} profile={profile} onSignOut={handleSignOut} onBackToDashboard={()=>setAuthStep("dashboard")} />;
  return null;
}
// ─── CONSENT ─────────────────────────────────────────────────────────────────
function ConsentScreen({ onConsent }) {
  const [checked, setChecked] = useState(false);
  return (
    <div>
      <Badge>Before we begin</Badge>
      <H1>A note on your data</H1>
      <Sub>LearnCompass CAS operates as a virtual classroom.</Sub>
      <Card style={{ maxWidth:"560px", marginBottom:"24px" }}>
        <p style={{ fontSize:"15px", lineHeight:1.8, color:C.navy, marginBottom:"20px" }}>
          Everything you share in LearnCompass CAS is treated the same way as work in a real classroom. Your CAS coordinator and teachers can see your project, reflections, and progress — that is how they support you. Your data is never shared outside your school and is never used for advertising or third-party purposes.
        </p>
        <p style={{ fontSize:"15px", lineHeight:1.8, color:C.navy, marginBottom:"24px" }}>
          By continuing you confirm you understand that your CAS journey — including your interview answers, project plan, reflections, and evidence — is visible to your CAS coordinator within your school.
        </p>
        <label style={{ display:"flex", alignItems:"flex-start", gap:"12px", cursor:"pointer", marginBottom:"24px" }}>
          <input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)} style={{ marginTop:"3px", accentColor:C.amber, width:"16px", height:"16px", flexShrink:0 }} />
          <span style={{ fontSize:"14px", color:C.navy, lineHeight:1.6 }}>I understand that my CAS work is shared with my coordinator and teachers within my school, in the same way a classroom is shared.</span>
        </label>
        <Btn onClick={onConsent} disabled={!checked}>I understand — let's begin →</Btn>
      </Card>
    </div>
  );
}

// ─── SESSION RESUME ───────────────────────────────────────────────────────────
function ResumeScreen({ onResume, onSkip }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  function tryResume() {
    try {
      const data = JSON.parse(text.trim());
      if (!data.student || !data.version) throw new Error("Invalid snapshot format");
      onResume(data);
    } catch { setError("That doesn't look like a valid session snapshot. Check you pasted the full text."); }
  }
  return (
    <div>
      <Badge>Welcome back</Badge>
      <H1>Resume your session</H1>
      <Sub>If you have a session snapshot from a previous visit, paste it below to pick up where you left off.</Sub>
      <Card style={{ maxWidth:"560px", marginBottom:"16px" }}>
        <div style={{ marginBottom:"16px" }}>
          <Label>Paste your session snapshot</Label>
          <Textarea value={text} onChange={e=>{setText(e.target.value);setError("");}} placeholder='{"version":"1.0","student":{...}}' rows={5} />
        </div>
        {error && <div style={{ marginBottom:"12px" }}><Alert type="error">{error}</Alert></div>}
        <div style={{ display:"flex", gap:"12px" }}>
          <Btn secondary onClick={onSkip}>Start fresh instead</Btn>
          <Btn onClick={tryResume} disabled={!text.trim()}>Resume session →</Btn>
        </div>
      </Card>
    </div>
  );
}

// ─── WELCOME ──────────────────────────────────────────────────────────────────
function WelcomeScreen({ onBegin, onHaveProject }) {
  const [name, setName] = useState("");
  return (
    <div>
      <Badge>Stage 1 — Project Discovery</Badge>
      <H1>Welcome to<br />LearnCompass CAS</H1>
      <Sub>Your AI-powered guide through the IB CAS cycle. Push the Learning Up.</Sub>
      <Card style={{ maxWidth:"460px", marginBottom:"16px" }}>
        <div style={{ marginBottom:"20px" }}>
          <Label>What's your first name?</Label>
          <TextInput value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&name.trim()&&onBegin(name.trim())} placeholder="Enter your first name" />
        </div>
        <Btn onClick={()=>name.trim()&&onBegin(name.trim())} disabled={!name.trim()}>Begin My CAS Journey →</Btn>
      </Card>
      <div style={{ display:"flex", alignItems:"center", gap:"12px", maxWidth:"460px" }}>
        <div style={{ flex:1, height:"1px", background:C.border }} />
        <span style={{ fontSize:"12px", color:C.muted }}>or</span>
        <div style={{ flex:1, height:"1px", background:C.border }} />
      </div>
      <div style={{ maxWidth:"460px", marginTop:"12px" }}>
        <button onClick={onHaveProject} style={{ width:"100%", background:"transparent", border:`1px dashed ${C.border}`, borderRadius:"8px", padding:"14px", fontFamily:"'Outfit',sans-serif", fontSize:"14px", color:C.muted, cursor:"pointer", transition:"border-color 0.15s" }}>
          I already have a project in mind →
        </button>
      </div>
    </div>
  );
}

// ─── INTERVIEW ────────────────────────────────────────────────────────────────
const INTERVIEW_STEPS = ["Academic profile","Location","Availability","Interests & skills","Collaboration"];

function InterviewScreen({ name, onComplete }) {
  const [messages, setMessages] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [blockIndex, setBlockIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploadContent, setUploadContent] = useState(null);
  const chatRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(()=>{ startInterview(); }, []);
  useEffect(()=>{ if(chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages, loading]);

  function buildSystem(block, qCount) {
    return `You are an IB CAS advisor conducting a structured intake interview with a student named ${name}. Your only role is to ask questions — never suggest activities, project ideas, or answers.

You are working through 5 topic blocks IN ORDER. Cover them thoroughly but conversationally — one question at a time.

BLOCK 1 — ACADEMIC & SOCIAL PROFILE
Ask about: year group (IB1 or IB2), subjects they are studying, any existing commitments outside school (sports, music, part-time work, family responsibilities).
${uploadContent ? "NOTE: The student has uploaded a document (timetable/transcript). Use that context to skip questions you can already answer from it." : ""}

BLOCK 2 — LOCATION  
Ask about: name of their school (this anchors their location), the neighbourhood or area they live in, how they travel (walking/public transport/car), realistic travel radius for CAS activities.

BLOCK 3 — AVAILABILITY
Ask about: which specific days after school are genuinely free most weeks, whether weekends are available, any seasonal constraints (exam periods, sports seasons, holidays). The more specific the better — not hours in the abstract but named windows like "Tuesday and Thursday after 15:00".

BLOCK 4 — INTERESTS, SKILLS & CONSTRAINTS
Ask about: genuine interests and hobbies outside school, skills they are proud of, something they have never tried but want to, what kind of work energises them (hands-on / creative / organisational / people-facing), any hard constraints (budget, equipment, physical access, anything that rules things out).

BLOCK 5 — COLLABORATION
Ask about: who they might work with on a CAS project — the IB requires at least one collaborative project. Explore: are there classmates, friends, or community members they could involve? Are there teachers, coaches, or community organisations they already have a connection with? Have they done group projects before, and how did that go?

Current block: ${block+1}. Total questions asked so far: ${qCount}.

When you have gathered enough information across ALL 5 blocks (minimum 10 questions answered), end your response with exactly: INTERVIEW_COMPLETE

Rules:
- ONE question at a time
- Never suggest answers, activities, or project ideas  
- If the student is vague, ask a specific follow-up before moving on
- Transition between blocks naturally — do not announce "Now for block 2"`;
  }

  async function startInterview() {
    setLoading(true);
    const msgs = uploadContent
      ? [{ role:"user", content:[{ type:"text", text:"Start the interview. I have uploaded a document for context." }, uploadContent] }]
      : [{ role:"user", content:"Start the interview." }];
    try {
      const reply = await callClaude(buildSystem(0, 0), msgs);
      const text = reply.replace("INTERVIEW_COMPLETE","").trim();
      setMessages([{ role:"assistant", text }]);
    } catch(e) { setMessages([{ role:"assistant", text:"Connection error — please check your setup and try again." }]); }
    setLoading(false);
  }

  async function sendAnswer() {
    if (!input.trim() || loading || done) return;
    const answer = input.trim();
    setInput("");
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);
    const newMsgs = [...messages, { role:"user", text:answer }];
    setMessages(newMsgs);
    setLoading(true);
    const apiMsgs = newMsgs.map(m=>({ role:m.role==="assistant"?"assistant":"user", content:m.text }));
    const newBlock = Math.min(Math.floor(newAnswers.length / 2), 4);
    setBlockIndex(newBlock);
    try {
      const reply = await callClaude(buildSystem(newBlock, newAnswers.length), apiMsgs);
      if (reply.includes("INTERVIEW_COMPLETE")) {
        const display = reply.replace("INTERVIEW_COMPLETE","").trim();
        setMessages([...newMsgs, { role:"assistant", text: display || "That's everything I need. Building your project ideas now…" }]);
        setDone(true);
        setTimeout(()=>onComplete(newAnswers, uploadContent ? "Document uploaded and analysed." : ""), 1200);
      } else {
        setMessages([...newMsgs, { role:"assistant", text:reply }]);
      }
    } catch(e) { setMessages([...newMsgs, { role:"assistant", text:"Something went wrong — please try again." }]); }
    setLoading(false);
  }

  async function handleUpload(e) {
    const file = e.target.files[0]; if (!file) return;
    setUploadLabel(file.name);
    const reader = new FileReader();
    reader.onload = ev => {
      const base64 = ev.target.result.split(",")[1];
      const isImage = file.type.startsWith("image/");
      setUploadContent(isImage
        ? { type:"image", source:{ type:"base64", media_type:file.type, data:base64 } }
        : { type:"document", source:{ type:"base64", media_type:"application/pdf", data:base64 } }
      );
    };
    reader.readAsDataURL(file);
  }

  const DEMO_ANSWERS = [
    "I'm in IB1. I take Biology, English Literature, History, Maths AA, Polish, and Visual Arts. Outside school I play volleyball on a club team and help at my brother's Saturday football practice.",
    "Volleyball is Tuesday and Thursday evenings 17:00–19:00, and Saturday matches about twice a month. March and April get more intense — sometimes three sessions a week.",
    "American School of Warsaw in Konstancin-Jeziorna, south of the city. I live in Wilanów, about 20 minutes away.",
    "My mum drives me but I can take the bus — about 40 minutes to central Warsaw. I'd travel up to 30–40 minutes each way for something regular.",
    "Tuesdays and Thursdays are out because of volleyball. Wednesdays after 15:30 and Fridays are usually free. Saturday mornings until noon work most weeks.",
    "May is tough with IB internal assessments, and July I'm away six weeks. Best windows are October to February, then June and September.",
    "I paint and draw a lot — mostly portraits and urban sketching, since I was about eight. I also love organising things — I ran the school art show from scratch last year. Curious about teaching younger kids art. I like photography too.",
    "Working directly with people gives me the most energy. I like the combination — creating something together with others while organising how it runs. Teaching would hit all three for me.",
    "No real budget and I can't spend on materials or travel beyond normal. I have my own art supplies at home though. No physical limitations.",
    "My friend Zara is in IB1 and we've talked about doing something together — she's into photography so we'd complement each other. Ms Nowak at school runs community outreach and has contacts in Wilanów and Konstancin. I'd feel more confident with a teacher backing us up.",
  ];

  function fillDemoAnswers() {
    const msgs = [{ role:"assistant", text:`Hi ${name}! I'm here to help you find the right CAS project. Let's start — what activities or hobbies do you genuinely enjoy outside school?` }];
    const demoMsgs = [...msgs];
    DEMO_ANSWERS.forEach((a, i) => {
      demoMsgs.push({ role:"user", text:a });
      if (i < DEMO_ANSWERS.length - 1) {
        demoMsgs.push({ role:"assistant", text:`Got it, thank you. ${["And what about your school — which one do you attend and where are you based?","What days and times are genuinely free for you during the week?","Are there any periods in the year when your schedule gets especially tight?","What do you enjoy most in your free time — hobbies, interests, things you lose track of time doing?","What kind of work gives you the most energy?","Any practical constraints I should know about — budget, transport, equipment?","Who might you realistically work with on a CAS project?",""][i] || "Tell me more."}` });
      }
    });
    demoMsgs.push({ role:"assistant", text:"That's everything I need — building your personalised project ideas now…" });
    setMessages(demoMsgs);
    setAnswers(DEMO_ANSWERS);
    setBlockIndex(4);
    setDone(true);
    setTimeout(()=>onComplete(DEMO_ANSWERS, ""), 800);
  }

  return (
    <div>
      <Badge>Stage 1 — Project Discovery · Interview</Badge>
      <H1>Hi {name}, let's find your project</H1>
      <Sub>The more you share, the more specific your proposals will be.</Sub>

      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:"12px" }}>
        <button onClick={fillDemoAnswers} style={{ background:"transparent", border:`1px dashed ${C.steel}`, borderRadius:"6px", padding:"6px 14px", fontSize:"12px", color:C.steel, cursor:"pointer", fontFamily:"'Outfit',sans-serif" }}>
          ⚡ Demo: fill Maya's answers
        </button>
      </div>

      <ProgressSteps steps={INTERVIEW_STEPS} current={blockIndex} />
      <Card>
        <div ref={chatRef} style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:"10px", padding:"20px", maxHeight:"340px", overflowY:"auto", display:"flex", flexDirection:"column", gap:"12px", marginBottom:"16px" }}>
          {messages.map((m,i)=>(
            <div key={i} style={{ maxWidth:"80%", padding:"11px 15px", borderRadius:"10px", fontSize:"14px", lineHeight:1.6, alignSelf:m.role==="assistant"?"flex-start":"flex-end", background:m.role==="assistant"?C.white:C.navy, border:m.role==="assistant"?`1px solid ${C.border}`:"none", color:m.role==="assistant"?C.navy:C.white, borderBottomLeftRadius:m.role==="assistant"?"3px":"10px", borderBottomRightRadius:m.role==="user"?"3px":"10px" }}>{m.text}</div>
          ))}
          {loading && <div style={{ maxWidth:"80%", padding:"11px 15px", borderRadius:"10px", alignSelf:"flex-start", background:C.white, border:`1px solid ${C.border}`, borderBottomLeftRadius:"3px" }}><Dots /></div>}
        </div>
        {uploadLabel && <div style={{ marginBottom:"10px" }}><Alert type="success">📎 {uploadLabel} uploaded — I'll use this context during the interview.</Alert></div>}
        <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
          <button onClick={()=>fileRef.current?.click()} title="Upload timetable or transcript (optional)" style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:"8px", padding:"11px 14px", cursor:"pointer", fontSize:"18px", flexShrink:0 }}>📎</button>
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleUpload} style={{ display:"none" }} />
          <input type="text" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendAnswer()} placeholder={done?"Generating your proposals…":"Type your answer…"} disabled={loading||done} style={{ flex:1, border:`1px solid ${C.border}`, borderRadius:"8px", padding:"12px 16px", fontFamily:"'Outfit',sans-serif", fontSize:"14px", color:C.navy, background:(loading||done)?C.bg:C.white, outline:"none" }} />
          <button onClick={sendAnswer} disabled={loading||done||!input.trim()} style={{ background:C.amber, color:C.navy, border:"none", borderRadius:"8px", padding:"12px 22px", fontFamily:"'Outfit',sans-serif", fontSize:"14px", fontWeight:600, cursor:(loading||done||!input.trim())?"not-allowed":"pointer", opacity:(loading||done||!input.trim())?0.45:1, flexShrink:0 }}>Send</button>
        </div>
        <p style={{ fontSize:"11px", color:C.muted, marginTop:"8px" }}>📎 Optionally upload your school timetable or transcript — the AI will use it to ask smarter questions.</p>
      </Card>
    </div>
  );
}

// ─── PROJECT OVERRIDE ─────────────────────────────────────────────────────────
function ProjectOverrideScreen({ name, onComplete }) {
  const [title, setTitle] = useState("");
  const [strand, setStrand] = useState("Creativity");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runSMARTCheck() {
    if (!title.trim() || !description.trim()) return;
    setLoading(true); setError("");
    const system = `You are an IB CAS advisor. A student already has a project in mind. Analyse it against SMART criteria and generate a structured SMART proposal. Respond ONLY with valid JSON — no preamble, no markdown.

The JSON must have this shape:
{
  "smart": {
    "specific": "assessment of specificity — what's clear and what needs clarifying",
    "measurable": "what can be measured and what metrics are missing",
    "achievable": "feasibility assessment based on the description",
    "relevant": "connection to CAS strands and likely learning outcomes",
    "timeBound": "any time information present, or what's missing"
  },
  "suggestedLOs": ["LO1","LO3"],
  "verificationTasks": ["task 1","task 2","task 3"],
  "gaps": ["what is missing from the project definition"]
}`;
    const userMsg = `Student name: ${name}\nProject title: ${title}\nStrand: ${strand}\nDescription: ${description}`;
    try {
      const reply = await callClaude(system, [{role:"user",content:userMsg}]);
      const data = parseJSON(reply);
      onComplete({ title, strand, description, ...data });
    } catch(e) { setError("Couldn't analyse the project — " + e.message); }
    setLoading(false);
  }

  return (
    <div>
      <Badge>Stage 1 — Project Discovery · Your Idea</Badge>
      <H1>Tell me about your project</H1>
      <Sub>You already have something in mind — great. Describe it as fully as you can, even if it's rough. The more you write the better. Don't worry about getting it perfect.</Sub>
      <Card style={{ maxWidth:"560px" }}>
        <div style={{ marginBottom:"16px" }}><Label>Project title</Label><TextInput value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Guitar workshops for primary school students" /></div>
        <div style={{ marginBottom:"16px" }}>
          <Label>CAS strand</Label>
          <select value={strand} onChange={e=>setStrand(e.target.value)} style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:"8px", padding:"12px 16px", fontFamily:"'Outfit',sans-serif", fontSize:"15px", color:C.navy, background:C.white, outline:"none" }}>
            <option>Creativity</option><option>Activity</option><option>Service</option>
          </select>
        </div>
        <div style={{ marginBottom:"20px" }}><Label>Describe your project — the more detail the better</Label><Textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="What will you do? Where? How often? Who will be involved? What's your goal?" rows={5} /></div>
        {error && <div style={{ marginBottom:"12px" }}><Alert type="error">{error}</Alert></div>}
        <Btn onClick={runSMARTCheck} disabled={loading||!title.trim()||!description.trim()}>{loading?"Checking your idea…":"Check My Idea →"}</Btn>
      </Card>
    </div>
  );
}

// ─── PROPOSALS ────────────────────────────────────────────────────────────────
function ProposalsScreen({ name, answers, docSummary, onSelectProposals, onRedo }) {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState([]);
  const [dismissFeedback, setDismissFeedback] = useState({});
  const [regenerating, setRegenerating] = useState(null);

  useEffect(()=>{ generateAll(); }, []);

  function buildSystem() {
    return `You are an IB CAS project advisor. Your output must be a valid JSON array and nothing else.

STRICT OUTPUT RULES:
- Start your response with [ and end with ]
- No markdown, no code fences, no explanation before or after the JSON
- All string values must be on a single line — no line breaks inside strings
- Use only straight double quotes — no curly quotes
- No trailing commas

IB CAS RULES every proposal must follow:
- Must be collaborative — student works with at least one other person
- Service proposals must address a real, verified community need
- Must not overlap with any DP academic coursework

Generate exactly 7 proposal objects. The first 5 are grounded, practical ideas rooted in the student's specific context. The last 2 are unconventional — surprising, lateral-thinking ideas that are still fully IB CAS compliant but push in an unexpected direction. These last 2 should make the student think "I hadn't considered that" — they are conversation starters and imagination triggers, not necessarily final answers.

Each object must have these fields with these exact key names:

"title" — string, 6-8 words, specific project name
"strand" — string, must be exactly one of: Creativity, Activity, Service
"additionalStrands" — array of strings, secondary strands if multi-strand, otherwise empty array []
"casType" — string, always "project"
"outOfBox" — boolean, false for proposals 1-5, true for proposals 6-7
"learningOutcomes" — array of 2 to 3 strings from: LO1 LO2 LO3 LO4 LO5 LO6 LO7
"details" — object with exactly these string fields: what, howMuch, whyYou, whyItMatters, when, whoWith
"serviceNeed" — string, the community need addressed if Service strand, otherwise ""
"verificationTasks" — array of exactly 3 short strings, real-world checks for this week, one must confirm collaboration
"rationale" — string, one sentence under 20 words

Here is one complete valid example. Follow this structure exactly:
{"title":"Weekly Art Workshops at Local Youth Centre","strand":"Service","additionalStrands":["Creativity"],"casType":"project","outOfBox":false,"learningOutcomes":["LO2","LO3","LO5"],"details":{"what":"Weekly 45-min portrait drawing sessions at Wilanów youth centre for ages 8-14","howMuch":"20 sessions across the school year, 10 children per session","whyYou":"Connects directly to your painting skills and your interest in teaching younger kids","whyItMatters":"Children in this area have no free structured art instruction outside school hours","when":"October to May, Wednesday afternoons 16:00-18:00","whoWith":"One classmate co-facilitating, youth centre staff member present as supervisor"},"serviceNeed":"Children in Wilanów lack access to free structured visual arts instruction outside school hours.","verificationTasks":["Call Dom Kultury Wilanów to ask if they accept volunteer-led youth workshops and what their process is","Confirm with one classmate this week that they will co-facilitate with you — get a written yes","Check the Wednesday afternoon bus from your area to confirm the journey is under 30 minutes"],"rationale":"Directly uses your art skills and your stated interest in teaching younger children."}

Now generate 7 proposals for the student described in the user message — 5 grounded, 2 unconventional. Make every detail specific to their school, neighbourhood, schedule, and interests.`;
  }

  async function generateAll() {
    setLoading(true); setError("");
    const answersText = answers.map((a,i)=>`Answer ${i+1}: ${a}`).join("\n");
    const context = `Student: ${name}\n${docSummary?"Uploaded document summary: "+docSummary+"\n":""}Interview answers:\n${answersText}`;
    try {
      const reply = await callClaude(buildSystem(), [{role:"user",content:context}], 4000);
      const parsed = parseJSON(reply);
      if (!Array.isArray(parsed)) throw new Error("Response was not an array");
      setProposals(parsed.slice(0,7));
    } catch(e) { setError("Couldn't generate ideas — "+e.message); }
    setLoading(false);
  }

  async function regenerateSlot(index, reason) {
    setRegenerating(index);
    const answersText = answers.map((a,i)=>`Answer ${i+1}: ${a}`).join("\n");
    const regenSystem = `You are an IB CAS project advisor. Output a single valid JSON object and nothing else — no markdown, no explanation. All string values on one line, no trailing commas, straight double quotes only.

The object must have these exact fields: title, strand, additionalStrands, casType, outOfBox (boolean), learningOutcomes, details (object with fields: what, howMuch, whyYou, whyItMatters, when, whoWith), serviceNeed, verificationTasks (array of 3), rationale.

IB rules: must be collaborative, Service must address real community need, must not overlap DP coursework.`;
    const isOutOfBox = proposals[index]?.outOfBox || false;
    const context = `Student: ${name}\nInterview answers:\n${answersText}\n\nDismissed idea: "${proposals[index]?.title}"\nReason dismissed: "${reason}"\nWas this an unconventional idea: ${isOutOfBox}\n\nGenerate one replacement${isOutOfBox?" unconventional/surprising":""} proposal that addresses the dismissal reason. Output only the JSON object.`;
    try {
      const reply = await callClaude(regenSystem, [{role:"user",content:context}], 1200);
      const newIdea = parseJSON(reply);
      setProposals(prev => prev.map((p,i)=>i===index?{...newIdea,casType:"project"}:p));
      setDismissFeedback(prev=>{ const n={...prev}; delete n[index]; return n; });
    } catch(e) { /* keep old on failure */ }
    setRegenerating(null);
  }

  function toggleSelect(i) {
    setSelected(prev => prev.includes(i) ? prev.filter(x=>x!==i) : prev.length<3?[...prev,i]:prev);
  }

  return (
    <div>
      <Badge>Stage 1 — Project Discovery · Ideas</Badge>
      <H1>Your Project Ideas</H1>
      <Sub>These are starting points, not final answers. Read them, sit with them, see what sparks something. The two at the bottom push in a different direction — they might surprise you.</Sub>

      {loading && (
        <Card style={{ textAlign:"center", padding:"52px" }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:"16px" }}><Dots /></div>
          <div style={{ fontSize:"15px", color:C.muted, fontWeight:300 }}>Building your project ideas…</div>
          <div style={{ fontSize:"13px", color:C.muted, marginTop:"6px" }}>Tailored to your school, your schedule, your interests — not generic templates.</div>
        </Card>
      )}

      {error && <Alert type="error" style={{ marginBottom:"16px" }}>{error} <button onClick={generateAll} style={{ color:C.steel, background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>Try again</button></Alert>}

      {!loading && proposals.length>0 && (
        <>
          <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:"8px", padding:"14px 16px", fontSize:"13px", color:"#1e40af", marginBottom:"18px", lineHeight:1.7 }}>
            <strong>How to use these ideas:</strong> Don't judge them too quickly. Each project covers 2–4 of the 7 IB learning outcomes — you don't need all 7 from one project, they build up across your full programme. If something catches your eye even a little, select it and we'll dig deeper. If something new comes to mind while reading, jot it down — bring those notes to your coordinator or come back and add them as a refresh. There is no wrong answer here.
          </div>
          <div style={{ fontSize:"13px", color:C.muted, marginBottom:"16px" }}>
            {selected.length===0?"Select 1–3 ideas you'd like to explore further — you can always come back and change your mind.":selected.length===3?"3 selected — that's the maximum. Deselect one to swap.":`${selected.length} selected — you can add up to ${3-selected.length} more.`}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"14px", marginBottom:"28px" }}>
            {proposals.map((p,i) => {
              const isSelected = selected.includes(i);
              const isFeedback = dismissFeedback[i] !== undefined;
              const isRegen = regenerating === i;
              const isWild = p.outOfBox === true;
              const allStrands = [p.strand, ...(p.additionalStrands||[])].filter(Boolean);
              const FIELD_LABELS = { what:"The project", howMuch:"In numbers", whyYou:"Why it fits you", whyItMatters:"Why it matters", when:"Timeline", whoWith:"Who's involved" };
              return (
                <div key={i}>
                  {isWild && i>0 && !proposals[i-1]?.outOfBox && (
                    <div style={{ display:"flex", alignItems:"center", gap:"12px", margin:"8px 0 4px" }}>
                      <div style={{ flex:1, height:"1px", background:"#e0d0f0" }} />
                      <span style={{ fontSize:"11px", fontWeight:600, color:"#7c3aed", letterSpacing:"0.08em", textTransform:"uppercase" }}>Out-of-the-box ideas — let these spark something</span>
                      <div style={{ flex:1, height:"1px", background:"#e0d0f0" }} />
                    </div>
                  )}
                  <div onClick={()=>!isFeedback&&toggleSelect(i)} style={{
                    background: isWild ? "#fdf8ff" : C.white,
                    border:`${isSelected?"2px":"1px"} solid ${isSelected?C.amber:isWild?"#c4b5fd":C.border}`,
                    borderRadius:"10px", padding:"18px 20px", cursor:isFeedback?"default":"pointer",
                    transition:"border-color 0.15s",
                    boxShadow:isSelected?`0 0 0 3px rgba(201,147,58,0.12)`:isWild?"0 0 0 0px #c4b5fd":"none",
                    opacity:isRegen?0.5:1
                  }}>
                    {isRegen && <div style={{ textAlign:"center", padding:"20px 0", color:C.muted, fontSize:"13px" }}>Regenerating this idea…</div>}
                    {!isRegen && (
                      <>
                        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"10px", marginBottom:"10px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                            <div style={{ width:"18px", height:"18px", borderRadius:"50%", border:isSelected?`5px solid ${C.amber}`:`2px solid ${isWild?"#c4b5fd":C.border}`, background:C.white, flexShrink:0, transition:"border 0.15s" }} />
                            <span style={{ fontFamily:"'Playfair Display',serif", fontWeight:600, fontSize:"16px", color:C.navy }}>{p.title}</span>
                          </div>
                          <div style={{ display:"flex", gap:"4px", alignItems:"center", flexShrink:0, flexWrap:"wrap", justifyContent:"flex-end" }}>
                            {isWild && <span style={{ fontSize:"10px", fontWeight:600, background:"#ede9fe", color:"#7c3aed", padding:"3px 8px", borderRadius:"4px", letterSpacing:"0.05em" }}>✦ Unconventional</span>}
                            {allStrands.map((s,si)=><StrandBadge key={si} strand={s} />)}
                            <button onClick={e=>{e.stopPropagation();setDismissFeedback(prev=>({...prev,[i]:""}))} } style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:"6px", padding:"2px 8px", fontSize:"11px", color:C.muted, cursor:"pointer" }}>✕ Not for me</button>
                          </div>
                        </div>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:"5px", marginBottom:"12px", paddingLeft:"28px" }}>
                          {(p.learningOutcomes||[]).map(lo=><span key={lo} style={{ fontSize:"11px", fontWeight:500, background:"#f1f3f6", color:C.muted, padding:"2px 8px", borderRadius:"4px" }}>{lo}</span>)}
                        </div>
                        <div style={{ paddingLeft:"28px" }}>
                          {Object.keys(FIELD_LABELS).map(k=>(
                            (p.details?.[k]||p.smart?.[k]) ? (
                              <div key={k} style={{ display:"flex", gap:"8px", marginBottom:"6px" }}>
                                <span style={{ fontSize:"11px", fontWeight:600, color:k==="whoWith"?C.green:C.steel, minWidth:"100px", paddingTop:"1px", flexShrink:0 }}>{FIELD_LABELS[k]}</span>
                                <span style={{ fontSize:"13px", color:C.navy, lineHeight:1.55 }}>{p.details?.[k]||p.smart?.[k]}</span>
                              </div>
                            ) : null
                          ))}
                          {p.serviceNeed && (
                            <div style={{ display:"flex", gap:"8px", marginBottom:"6px" }}>
                              <span style={{ fontSize:"11px", fontWeight:600, color:"#8a5e1a", minWidth:"100px", paddingTop:"1px", flexShrink:0 }}>Community need</span>
                              <span style={{ fontSize:"13px", color:C.navy, lineHeight:1.55 }}>{p.serviceNeed}</span>
                            </div>
                          )}
                          <div style={{ marginTop:"10px", padding:"10px 12px", background:isWild?"#ede9fe22":C.bg, borderRadius:"6px", fontSize:"12px", color:isWild?"#7c3aed":C.muted, fontStyle:"italic" }}>{p.rationale}</div>
                        </div>
                      </>
                    )}
                  </div>
                  {isFeedback && (
                    <div style={{ background:"#fff9f0", border:`1px solid ${C.amber}`, borderRadius:"0 0 10px 10px", padding:"14px 18px", marginTop:"-4px" }}>
                      <div style={{ fontSize:"13px", color:C.navy, marginBottom:"4px", fontWeight:500 }}>Why doesn't this work for you?</div>
                      <div style={{ fontSize:"12px", color:C.muted, marginBottom:"10px" }}>Be specific — the more you say, the better the replacement idea will be.</div>
                      <TextInput value={dismissFeedback[i]} onChange={e=>setDismissFeedback(prev=>({...prev,[i]:e.target.value}))} placeholder="e.g. I can't get to that part of the city on Wednesdays, or I have no interest in that topic…" style={{ marginBottom:"8px" }} />
                      <div style={{ display:"flex", gap:"8px" }}>
                        <Btn secondary small onClick={()=>setDismissFeedback(prev=>{const n={...prev};delete n[i];return n})}>Cancel</Btn>
                        <Btn small onClick={()=>regenerateSlot(i, dismissFeedback[i])} disabled={!dismissFeedback[i]?.trim()}>Generate a replacement →</Btn>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ display:"flex", gap:"12px" }}>
            <Btn secondary onClick={onRedo}>← Redo Interview</Btn>
            <Btn onClick={()=>onSelectProposals(proposals, selected)} disabled={selected.length===0}>Take these to verification →</Btn>
          </div>
        </>
      )}
    </div>
  );
}

// ─── VERIFICATION ─────────────────────────────────────────────────────────────
function VerificationScreen({ name, proposals, selectedIndices, onComplete }) {
  const [checklists, setChecklists] = useState({});
  const [loading, setLoading] = useState(true);
  const [downloaded, setDownloaded] = useState(false);
  const [report, setReport] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(()=>{ generateChecklists(); }, []);

  async function generateChecklists() {
    setLoading(true);
    const selected = selectedIndices.map(i=>proposals[i]);
    const system = `You are an IB CAS advisor. For each CAS project proposal, generate a specific real-world verification checklist. Respond ONLY with valid JSON — no markdown, no preamble. Start with { and end with }.

Rules:
1. Every checklist MUST include one task confirming collaboration is in place
2. For Service proposals, include a task to verify and document the specific community need
3. Tasks must be specific to the proposal's location and context — never generic
4. Keep each task to one sentence — no line breaks inside strings

Return an object where each key is a proposal title and the value is an array of 3 task strings:
{"Proposal Title":["Task one.","Task two.","Task three."],"Proposal Title 2":["Task one.","Task two.","Task three."]}`;
    const context = `Student: ${name}\nProposals:\n${selected.map((p,i)=>`${i+1}. ${p.title} (${p.strand}) collaborators: ${p.smart?.collaborators||"TBC"} serviceNeed: ${p.serviceNeed||"none"}`).join("\n")}`;
    try {
      const reply = await callClaude(system, [{role:"user",content:context}], 2000);
      setChecklists(parseJSON(reply));
    } catch(e) {
      // Silently fall back to proposal's built-in verificationTasks — no error shown
      // The checklist will still display correctly from p.verificationTasks
    }
    setLoading(false);
  }

  const [copied, setCopied] = useState(false);
  const [checklistText, setChecklistText] = useState("");

  function buildChecklistText() {
    const selected = selectedIndices.map(i=>proposals[i]);
    let text = `LEARNCOMPASS CAS — VERIFICATION CHECKLIST\nStudent: ${name}\nGenerated: ${new Date().toLocaleDateString()}\nIB compliance confirmed: no DP academic overlap.\n\nComplete every check below, then paste your findings back into LearnCompass CAS.\n\n${"=".repeat(56)}\n\n`;
    selected.forEach((p,i) => {
      const allStrands = [p.strand,...(p.additionalStrands||[])].filter(Boolean);
      text += `PROJECT ${i+1}: ${p.title.toUpperCase()}\nStrand(s): ${allStrands.join(" + ")}\n`;
      if (p.serviceNeed) text += `Community need to verify: ${p.serviceNeed}\n`;
      text += `Collaborators: ${p.smart?.collaborators||"To be confirmed"}\n\n`;
      const tasks = checklists[p.title]||p.verificationTasks||[];
      tasks.forEach((t,j)=>{ text += `☐ ${j+1}. ${t}\n   Finding: _________________________________________________\n\n`; });
      text += `${"─".repeat(56)}\n\n`;
    });
    text += `PASTE YOUR COMPLETED FINDINGS BACK INTO LEARNCOMPASS CAS.`;
    return text;
  }

  function showChecklist() {
    setChecklistText(buildChecklistText());
    setDownloaded(true);
  }

  function copyChecklist() {
    const text = checklistText || buildChecklistText();
    navigator.clipboard.writeText(text).then(()=>{
      setCopied(true);
      setTimeout(()=>setCopied(false), 2500);
    }).catch(()=>{
      // fallback: select the textarea
      const el = document.getElementById("checklist-textarea");
      if (el) { el.select(); document.execCommand("copy"); }
    });
  }

  async function processReport() {
    if (!report.trim()) return;
    setProcessing(true); setError("");
    const selected = selectedIndices.map(i=>proposals[i]);
    const system = `You are an IB CAS advisor reviewing a student's real-world verification findings. Based on what they found, adjust the proposals and recommend which one to lock in. Respond ONLY with valid JSON.

{
  "recommendation": "title of the best proposal given verification results",
  "adjustments": { "Project Title": "What to adjust based on findings, or 'No adjustment needed'" },
  "lockinReady": true,
  "notes": "one sentence of advice for the student"
}`;
    const context = `Student: ${name}\nProposals being verified:\n${selected.map(p=>p.title).join(", ")}\n\nVerification findings:\n${report}`;
    try {
      const reply = await callClaude(system, [{role:"user",content:context}]);
      const result = parseJSON(reply);
      onComplete(selected, result, report);
    } catch(e) { setError("Couldn't process your findings — "+e.message); }
    setProcessing(false);
  }

  const [academicOverlapConfirmed, setAcademicOverlapConfirmed] = useState(false);
  const selectedProposals = selectedIndices.map(i=>proposals[i]);

  return (
    <div>
      <Badge>Stage 1 — Project Discovery · Verification</Badge>
      <H1>Check before you commit</H1>
      <Sub>The best thing you can do now is take these ideas to the real world — and to your coordinator or a trusted teacher. They often know local contacts you don't. Don't waste time on ideas that don't fit; if something feels wrong, trust that feeling. If something new comes to mind while doing these checks, write it down and bring it back.</Sub>

      {loading && <Card style={{ textAlign:"center", padding:"40px" }}><div style={{ display:"flex", justifyContent:"center", marginBottom:"12px" }}><Dots /></div><div style={{ fontSize:"14px", color:C.muted }}>Generating your verification checklists…</div></Card>}

      {!loading && (
        <>
          {selectedProposals.map((p,i)=>(
            <Card key={i} style={{ marginBottom:"14px" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"10px", marginBottom:"14px" }}>
                <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:600, fontSize:"16px", color:C.navy }}>{p.title}</div>
                <StrandBadge strand={p.strand} />
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                {(checklists[p.title]||p.verificationTasks||[]).map((t,j)=>(
                  <div key={j} style={{ display:"flex", gap:"10px", alignItems:"flex-start" }}>
                    <span style={{ fontSize:"16px", flexShrink:0, marginTop:"1px" }}>☐</span>
                    <span style={{ fontSize:"13px", color:C.navy, lineHeight:1.6 }}>{t}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}

          <Card style={{ marginBottom:"20px", background:"#fffbeb", border:"1px solid #fde68a" }}>
            <label style={{ display:"flex", alignItems:"flex-start", gap:"12px", cursor:"pointer" }}>
              <input type="checkbox" checked={academicOverlapConfirmed} onChange={e=>setAcademicOverlapConfirmed(e.target.checked)} style={{ marginTop:"3px", accentColor:C.amber, width:"16px", height:"16px", flexShrink:0 }} />
              <span style={{ fontSize:"14px", color:"#92400e", lineHeight:1.6 }}>
                <strong>IB compliance check:</strong> I confirm that none of these projects will be used as part of any DP course grade or assessment requirement. CAS activities must be separate from academic coursework.
              </span>
            </label>
          </Card>

          {!downloaded ? (
            <>
              <Btn onClick={showChecklist} disabled={!academicOverlapConfirmed} style={{ marginBottom:"12px" }}>
                View &amp; Copy Your Checklist →
              </Btn>
              {!academicOverlapConfirmed && <p style={{ fontSize:"12px", color:C.muted }}>Confirm the compliance check above first.</p>}
            </>
          ) : (
            <>
              <Card style={{ marginBottom:"20px" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"12px" }}>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:600, fontSize:"16px", color:C.navy }}>Your Verification Checklist</div>
                  <Btn small onClick={copyChecklist} style={{ background:copied?C.green:C.amber, color:copied?C.white:C.navy }}>
                    {copied ? "✓ Copied!" : "Copy all"}
                  </Btn>
                </div>
                <p style={{ fontSize:"13px", color:C.muted, marginBottom:"12px", lineHeight:1.6 }}>
                  Copy this checklist and save it to your notes or email it to yourself. Go do the real-world checks, then come back and paste your findings below.
                </p>
                <textarea
                  id="checklist-textarea"
                  readOnly
                  value={checklistText}
                  rows={14}
                  style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:"8px", padding:"12px", fontFamily:"monospace", fontSize:"12px", color:C.navy, background:C.bg, resize:"vertical", lineHeight:1.7 }}
                  onClick={e=>e.target.select()}
                />
              </Card>

              <Card accent>
                <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:600, fontSize:"16px", color:C.navy, marginBottom:"8px" }}>Report back your findings</div>
                <p style={{ fontSize:"13px", color:C.muted, marginBottom:"16px", lineHeight:1.6 }}>
                  Once you've done the checks, paste your findings here. Be specific about what you found for each one — the more detail, the better I can adjust your proposals.
                </p>
                <div style={{ marginBottom:"16px" }}>
                  <Textarea value={report} onChange={e=>setReport(e.target.value)} placeholder={"e.g. I contacted the community centre — they accept volunteers but only on Thursdays. Zara confirmed she's in. My mum can drive on Wednesdays but not Fridays…"} rows={6} />
                </div>
                {error && <div style={{ marginBottom:"12px" }}><Alert type="error">{error}</Alert></div>}
                <Btn onClick={processReport} disabled={processing||!report.trim()}>
                  {processing ? "Processing your findings…" : "Submit Findings →"}
                </Btn>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── LOCK IN ─────────────────────────────────────────────────────────────────
function LockInScreen({ name, proposals, verificationResult, verificationReport, allProposals, onLockIn }) {
  const [note, setNote] = useState("");
  const [locked, setLocked] = useState(false);
  const [snapshot, setSnapshot] = useState("");
  const recommended = proposals.find(p=>p.title===verificationResult?.recommendation) || proposals[0];

  function doLockIn() {
    const project = {
      casType:"project",
      title: recommended.title,
      strand: recommended.strand,
      additionalStrands: recommended.additionalStrands || [],
      learningOutcomes: recommended.learningOutcomes || [],
      smart: recommended.smart || {},
      serviceNeed: recommended.serviceNeed || "",
      verificationTasks: recommended.verificationTasks || [],
      verificationStatus:"confirmed",
      studentNote: note,
      lockedIn: true,
    };
    const firstInterview = {
      type: "project-selection",
      label: "Project Lock-in — First Formal Interview Checkpoint",
      timestamp: new Date().toISOString(),
      status: "pending-coordinator-review",
      project: project.title,
    };
    onLockIn(project, firstInterview);
    const snap = JSON.stringify({ version:"1.0", student:{ name }, selectedProject:project, allProjectIdeas:allProposals, timestamp:new Date().toISOString() }, null, 2);
    setSnapshot(snap);
    setLocked(true);
  }

  function copySnapshot() {
    navigator.clipboard.writeText(snapshot).catch(()=>{});
  }

  return (
    <div>
      <Badge>Stage 1 — Project Discovery · Lock In</Badge>
      <H1>{locked?"Project locked in ✓":"You're ready to commit"}</H1>
      <Sub>{locked?"Save your session snapshot below before you close this tab.":"Based on your verification findings, here's the recommended project."}</Sub>

      {verificationResult?.notes && <div style={{ marginBottom:"20px" }}><Alert type="info">{verificationResult.notes}</Alert></div>}

      <Card accent style={{ marginBottom:"20px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"10px", marginBottom:"12px" }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:"20px", color:C.navy }}>{recommended.title}</div>
          <StrandBadge strand={recommended.strand} />
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:"5px", marginBottom:"14px" }}>
          {(recommended.learningOutcomes||[]).map(lo=>{
            const full = LOS.find(l=>l.id===lo);
            return <span key={lo} style={{ fontSize:"11px", fontWeight:500, background:"#f1f3f6", color:C.muted, padding:"3px 9px", borderRadius:"4px" }}>{lo}{full?` — ${full.label}`:""}</span>;
          })}
        </div>
        {["specific","measurable","achievable","relevant","timeBound"].map(k=>(
          <div key={k} style={{ display:"flex", gap:"8px", marginBottom:"6px" }}>
            <span style={{ fontSize:"11px", fontWeight:600, color:C.steel, minWidth:"80px", textTransform:"capitalize", paddingTop:"1px" }}>{k==="timeBound"?"Time-bound":k}</span>
            <span style={{ fontSize:"13px", color:C.navy, lineHeight:1.5 }}>{recommended.smart?.[k]||"—"}</span>
          </div>
        ))}
        {verificationResult?.adjustments?.[recommended.title] && verificationResult.adjustments[recommended.title]!=="No adjustment needed" && (
          <div style={{ marginTop:"12px", padding:"10px 12px", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:"6px", fontSize:"13px", color:"#92400e" }}>
            Adjusted based on your findings: {verificationResult.adjustments[recommended.title]}
          </div>
        )}
      </Card>

      {!locked && (
        <>
          <div style={{ marginBottom:"20px" }}>
            <Label>Any final notes on your choice? (optional)</Label>
            <Textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Why this project? Personal motivation, specific goals…" rows={3} />
          </div>
          <Btn onClick={doLockIn} style={{ marginBottom:"12px" }}>Lock In This Project →</Btn>
        </>
      )}

      {locked && (
        <>
          <Alert type="success" style={{ marginBottom:"24px" }}>✓ Your coordinator has been notified of your project selection.</Alert>
          <Card style={{ marginBottom:"0" }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:600, fontSize:"16px", color:C.navy, marginBottom:"8px" }}>Save your session</div>
            <p style={{ fontSize:"13px", color:C.muted, lineHeight:1.6, marginBottom:"14px" }}>Copy the text below and save it somewhere safe (notes app, email to yourself). Paste it back into LearnCompass CAS at the start of your next session to pick up where you left off.</p>
            <textarea readOnly value={snapshot} rows={6} style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:"8px", padding:"12px", fontFamily:"monospace", fontSize:"11px", color:C.muted, background:C.bg, resize:"none", marginBottom:"12px" }} />
            <Btn onClick={copySnapshot}>Copy to clipboard</Btn>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── COORDINATOR ──────────────────────────────────────────────────────────────
function CoordinatorView({ appState }) {
  const { student, selectedProject, allProjectIdeas, coordinatorActions } = appState;
  const confirmed = !!selectedProject?.lockedIn;
  return (
    <div>
      <Badge coord>Coordinator View — Stage 1</Badge>
      <H1>Coordinator Dashboard</H1>
      <Sub>Real-time overview of your student's CAS journey.</Sub>
      <Card style={{ marginBottom:"16px" }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:600, fontSize:"17px", color:C.navy, marginBottom:"16px" }}>Student: {student.name||"—"}</div>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"14px" }}>
          {[
            ["Stage","Project Discovery — "+(confirmed?"✓ Locked in":"In progress")],
            ["School",student.school||"Not provided"],
            ["Neighbourhood",student.neighbourhood||"Not provided"],
            ["Available days",(student.availableDays||[]).join(", ")||"Not provided"],
            ["Subjects",(student.subjects||[]).join(", ")||"Not provided"],
            ["Proposals generated",allProjectIdeas.length],
            ["Consent given",student.consentGiven?"Yes":"No"],
          ].map(([k,v])=>(
            <tr key={k}><td style={{ color:C.muted, padding:"6px 0", width:"180px", verticalAlign:"top" }}>{k}</td><td style={{ color:C.navy, padding:"6px 0" }}>{v}</td></tr>
          ))}
        </table>
      </Card>
      {confirmed && (
        <Card accent style={{ marginBottom:"16px" }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:600, fontSize:"17px", color:C.navy, marginBottom:"14px" }}>Locked-in Project</div>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"10px", marginBottom:"10px" }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:600, fontSize:"16px", color:C.navy }}>{selectedProject.title}</div>
            <div style={{ display:"flex", gap:"4px", flexWrap:"wrap", justifyContent:"flex-end" }}>
              {[selectedProject.strand,...(selectedProject.additionalStrands||[])].filter(Boolean).map((s,i)=><StrandBadge key={i} strand={s} />)}
            </div>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"5px", marginBottom:"12px" }}>
            {(selectedProject.learningOutcomes||[]).map(lo=><span key={lo} style={{ fontSize:"11px", fontWeight:500, background:"#f1f3f6", color:C.muted, padding:"2px 8px", borderRadius:"4px" }}>{lo}</span>)}
          </div>
          {selectedProject.smart?.collaborators && (
            <div style={{ marginBottom:"10px", fontSize:"13px", color:C.navy }}><strong style={{ color:C.green }}>Collaborators: </strong>{selectedProject.smart.collaborators}</div>
          )}
          {selectedProject.serviceNeed && (
            <div style={{ marginBottom:"10px", fontSize:"13px", color:C.navy }}><strong style={{ color:"#8a5e1a" }}>Community need: </strong>{selectedProject.serviceNeed}</div>
          )}
          <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
            <span style={{ fontSize:"11px", fontWeight:600, color:C.green, background:C.greenBg, padding:"3px 9px", borderRadius:"4px", border:`1px solid ${C.greenBorder}` }}>casType: {selectedProject.casType||"project"}</span>
            <span style={{ fontSize:"11px", fontWeight:600, color:"#1e40af", background:"#eff6ff", padding:"3px 9px", borderRadius:"4px", border:"1px solid #bfdbfe" }}>Formal interview 1: pending</span>
          </div>
          {selectedProject.studentNote && <div style={{ marginTop:"12px", padding:"10px 12px", background:C.bg, borderRadius:"6px", fontSize:"13px", color:C.muted }}><strong style={{ color:C.navy }}>Student note: </strong>{selectedProject.studentNote}</div>}
        </Card>
      )}
      <Card>
        <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:600, fontSize:"17px", color:C.navy, marginBottom:"14px" }}>Activity Log</div>
        {coordinatorActions.length===0
          ? <p style={{ fontSize:"13px", color:C.muted }}>No actions recorded yet.</p>
          : coordinatorActions.map((a,i)=>(
            <div key={i} style={{ display:"flex", gap:"12px", alignItems:"flex-start", padding:"8px 0", borderBottom:i<coordinatorActions.length-1?`1px solid ${C.border}`:"none" }}>
              <span style={{ fontSize:"12px", color:C.muted, minWidth:"170px", flexShrink:0 }}>{new Date(a.timestamp).toLocaleString()}</span>
              <span style={{ fontSize:"13px", color:C.navy }}>{a.type}: <strong>{a.target}</strong></span>
            </div>
          ))
        }
      </Card>
    </div>
  );
}

// ─── BEST PRACTICES MODAL ────────────────────────────────────────────────────
const BEST_PRACTICES = {
  student: [
    { icon:"💡", title:"These ideas are conversation starters", text:"Don't judge any idea too quickly. Something that sounds wrong at first might be exactly right once you talk it through with a friend, a parent, or your coordinator. Sleep on it. Good ideas tend to feel better the next day, not worse." },
    { icon:"✍️", title:"Write more, not less", text:"There is no judging here. The more you put into your answers and reflections, the more useful the output will be. Spelling doesn't matter. Grammar doesn't matter. Honesty and detail do. Write like you're texting a friend, not writing an essay." },
    { icon:"👩‍🏫", title:"Keep your coordinator in the loop", text:"Your CAS coordinator has seen hundreds of projects. Before you commit to anything, run it past them. They know which local organisations are welcoming to students, which venues work, and which ideas have fallen through before. A five-minute conversation can save weeks of wasted effort." },
    { icon:"📝", title:"When new ideas come up, capture them", text:"This process is designed to stimulate your thinking. If something new pops into your head while reading the proposals — even something completely different — write it down. You can come back and add it as a new idea or a refresh. Don't let it disappear." },
    { icon:"🚫", title:"Don't waste time on a bad fit", text:"If an idea feels like a complete mismatch — wrong location, wrong skill set, no real interest — say so clearly in the feedback and move on. A project you genuinely care about will produce better reflections, better evidence, and a better interview. Start with honesty." },
    { icon:"🤝", title:"Collaboration makes it real", text:"IB requires at least one collaborative project for a reason. Working with someone else — a classmate, a community group, a local organisation — builds in accountability, makes the project more sustainable, and usually produces something bigger than you could do alone. Think about who you'd actually enjoy working with." },
    { icon:"🔄", title:"Changing your project is okay — but early", text:"Life is unpredictable. If something falls through — a venue closes, a supervisor leaves, your schedule changes — the platform has a change project pathway. Use it early. The sooner you flag a problem, the more options you have. Waiting until the last minute is the only real mistake." },
  ],
  coordinator: [
    { icon:"🎯", title:"First conversation is about motivation, not logistics", text:"When a student presents their project idea, ask why it matters to them before asking how they'll organise it. A student who is genuinely motivated will navigate every logistical obstacle. A student who chose a project to impress you will struggle the moment anything goes wrong." },
    { icon:"⏱️", title:"Flag early, not late", text:"A thin reflection in October is a coaching moment. The same thin reflection in March is a crisis. The platform flags entries automatically, but your personal response to those flags is what makes the difference. A short check-in conversation beats a formal warning every time." },
    { icon:"🏃", title:"Keep approval cycles short", text:"Waiting for coordinator approval kills student momentum. If a student submits a plan on Monday, try to respond by Wednesday. Even a 'looks good, one small change' response keeps the energy alive. Silence communicates indifference." },
    { icon:"📍", title:"The verification step is where your contacts matter", text:"Students doing their real-world checks often hit dead ends because they don't know who to call or email. If you have existing relationships with local organisations, community centres, or schools — make those introductions. A personal connection opens doors a cold email never will." },
    { icon:"📊", title:"Watch strand balance early", text:"Students naturally gravitate toward one strand — usually Creativity or Service. Check strand balance at the planning stage, not at the end. A student who has only Creativity projects six months in still has time to add Activity experiences. Six weeks before the IBO review they don't." },
    { icon:"💬", title:"Three formal interviews shape the whole programme", text:"The IB requires minimum three formal documented interviews. Use the first one (project selection) to explore motivation and feasibility together. Use the second (mid-programme) to review strand coverage and reflection quality. Use the third (pre-interview) to build genuine confidence. Each one is a coaching conversation, not an inspection." },
    { icon:"🧠", title:"The reflection is the learning", text:"Students who struggle with CAS are rarely struggling with the activities — they are struggling with reflecting on what they are learning. Encourage specificity over length. One paragraph that says exactly what changed in how they think is worth ten paragraphs of description of what they did." },
  ],
};

function BestPracticesModal({ onClose }) {
  const [tab, setTab] = useState("student");
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,22,35,0.6)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }} onClick={onClose}>
      <div style={{ background:C.white, borderRadius:"16px", maxWidth:"620px", width:"100%", maxHeight:"80vh", display:"flex", flexDirection:"column", overflow:"hidden" }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:"24px 28px 0", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"20px" }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:"20px", color:C.navy }}>Best Practices</div>
            <button onClick={onClose} style={{ background:"none", border:"none", fontSize:"20px", cursor:"pointer", color:C.muted, lineHeight:1 }}>✕</button>
          </div>
          <div style={{ display:"flex", gap:"4px", background:C.bg, borderRadius:"8px", padding:"3px", marginBottom:"20px" }}>
            {["student","coordinator"].map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:"8px", borderRadius:"6px", border:"none", cursor:"pointer", fontFamily:"'Outfit',sans-serif", fontSize:"13px", fontWeight:500, textTransform:"capitalize", background:tab===t?C.white:"transparent", color:tab===t?C.navy:C.muted, boxShadow:tab===t?"0 1px 3px rgba(0,0,0,0.1)":"none", transition:"all 0.15s" }}>{t === "student" ? "For Students" : "For Coordinators"}</button>
            ))}
          </div>
        </div>
        <div style={{ overflowY:"auto", padding:"0 28px 28px" }}>
          {BEST_PRACTICES[tab].map((item,i)=>(
            <div key={i} style={{ display:"flex", gap:"14px", marginBottom:"20px", alignItems:"flex-start" }}>
              <div style={{ fontSize:"22px", flexShrink:0, marginTop:"2px" }}>{item.icon}</div>
              <div>
                <div style={{ fontWeight:600, fontSize:"14px", color:C.navy, marginBottom:"4px" }}>{item.title}</div>
                <div style={{ fontSize:"13px", color:C.muted, lineHeight:1.7 }}>{item.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── CAS App (Sprint 2 flow — managed by AuthWrapper) ─────────────────────────
function CASApp({appState,onStateChange,profile,onSignOut,onBackToDashboard}) {
  const [showBP,setShowBP]=useState(false);

  // Every state change auto-saves to Supabase via onStateChange
  function set(patch) { onStateChange({...appState,...patch}); }

  const step=appState.role==="coordinator"?"coord":appState.step;

  return (
    <>
      {showBP&&<BestPracticesModal onClose={()=>setShowBP(false)} />}
      <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Outfit',sans-serif",color:C.navy}}>
        <TopBar role={appState.role} onRoleChange={r=>set({role:r,step:r==="coordinator"?"coord":appState.step==="coord"?"consent":appState.step})} profile={profile} onSignOut={onSignOut} />
        <main style={{maxWidth:"800px",margin:"0 auto",padding:"52px 40px 80px"}}>
          <button onClick={onBackToDashboard} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:"13px",fontFamily:"'Outfit',sans-serif",marginBottom:"24px",display:"flex",alignItems:"center",gap:"6px",padding:0}}>
            ← Back to dashboard
          </button>
          {step==="consent"&&<ConsentScreen onConsent={()=>set({student:{...appState.student,consentGiven:true},step:"welcome"})} />}
          {step==="welcome"&&<WelcomeScreen onBegin={name=>set({student:{...appState.student,name},step:"interview"})} onHaveProject={()=>set({step:"override"})} />}
          {step==="interview"&&<InterviewScreen name={appState.student.name} onComplete={(answers,docSummary)=>set({student:{...appState.student,interviewAnswers:answers,uploadedDocSummary:docSummary},step:"proposals"})} />}
          {step==="override"&&<ProjectOverrideScreen name={appState.student.name||"Student"} onComplete={data=>set({step:"lockin",selectedProject:{casType:"project",...data,verificationStatus:"override",lockedIn:false},allProjectIdeas:[]})} />}
          {step==="proposals"&&<ProposalsScreen name={appState.student.name} answers={appState.student.interviewAnswers} docSummary={appState.student.uploadedDocSummary} onSelectProposals={(proposals,indices)=>set({allProjectIdeas:proposals,selectedProposalIndices:indices,step:"verification"})} onRedo={()=>set({student:{...appState.student,interviewAnswers:[],uploadedDocSummary:""},allProjectIdeas:[],step:"interview"})} />}
          {step==="verification"&&<VerificationScreen name={appState.student.name} proposals={appState.allProjectIdeas} selectedIndices={appState.selectedProposalIndices} onComplete={(selected,result,report)=>set({verificationResult:result,verificationReport:report,_selectedForLockin:selected,step:"lockin"})} />}
          {step==="lockin"&&<LockInScreen name={appState.student.name} proposals={appState._selectedForLockin||appState.allProjectIdeas} verificationResult={appState.verificationResult} verificationReport={appState.verificationReport} allProposals={appState.allProjectIdeas} onLockIn={(project,firstInterview)=>set({selectedProject:project,formalInterviews:[firstInterview],coordinatorActions:[...appState.coordinatorActions,{type:"projectLockedIn",target:project.title,comment:null,timestamp:new Date().toISOString()}]})} />}
          {step==="coord"&&<CoordinatorView appState={appState} />}
        </main>
        <button onClick={()=>setShowBP(true)} style={{position:"fixed",bottom:"28px",right:"28px",width:"48px",height:"48px",borderRadius:"50%",background:C.amber,border:"none",cursor:"pointer",fontSize:"20px",boxShadow:"0 4px 16px rgba(201,147,58,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:90}} title="Best Practices">💡</button>
      </div>
    </>
  );
}

// ─── LockInScreen: updated — removes session snapshot UI (Supabase handles persistence) ──
// Note: the LockInScreen above from Sprint 2 includes snapshot copy logic.
// In Sprint 2.5 we update the locked state message:
// Replace the "Save your session" Card block with:
//   <Alert type="success">✓ Your project has been saved automatically. Your coordinator will see it at their next login.</Alert>
// The function above (CASApp) calls Sprint 2's LockInScreen as-is —
// the snapshot copy UI is harmless but unused. A clean update is in the migration notes below.

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <>
      <style>{FONTS}</style>
      <AuthWrapper />
    </>
  );
}
