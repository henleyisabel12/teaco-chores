import { useState, useEffect, useCallback, useRef } from "react";
import { subscribeToData, writeData } from "./firebase";
import { DEFAULT_SCHEDULE } from "./schedule";
import {
  CAT_COLOR, FREQ_COLOR, FREQ_LABEL, FREQ_OPTIONS, CATS, CAT_ORDER,
  DAYS_SHORT, DAYS_FULL, MONTHS, DEFAULT_USERS, USER_COLORS,
} from "./constants";
import {
  todayDate, dateStr, parseDate, addDays, daysBetween, freqInterval, uid,
  getChoresForDate, isCompletedOnDate, getNextDueDays, getPeriodKey,
} from "./scheduling";

export default function App() {
  const today = todayDate();

  const [schedule, setSchedule]       = useState(DEFAULT_SCHEDULE);
  const [completions, setCompletions] = useState({});
  const [users, setUsers]             = useState(DEFAULT_USERS);
  const [activeUser, setActiveUser]   = useState("A");
  const [view, setView]               = useState("today");
  const [calMonth, setCalMonth]       = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selectedDate, setSelectedDate] = useState(new Date(today));
  const [showDone, setShowDone]       = useState(false);
  const [freqKeyOpen, setFreqKeyOpen] = useState(false);
  const [editModal, setEditModal]     = useState(null);
  const [addModal, setAddModal]       = useState(false);
  const [userModal, setUserModal]     = useState(false);
  const [collapsedFreqs, setCollapsedFreqs] = useState({});
  const [synced, setSynced]           = useState(false);
  const freqKeyRef = useRef(null);

  // ── Firebase sync ─────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubs = [
      subscribeToData("schedule", v => { if (v) setSchedule(v); setSynced(true); }),
      subscribeToData("completions", v => { if (v) setCompletions(v); }),
      subscribeToData("users", v => { if (v) setUsers(v); }),
      subscribeToData("activeUsers", v => {
        // Each device stores its own active user in localStorage
      }),
    ];
    // Load active user from localStorage (per-device)
    const stored = localStorage.getItem("teaco-activeUser");
    if (stored) setActiveUser(stored);
    return () => unsubs.forEach(fn => fn());
  }, []);

  // Write schedule to Firebase when it changes (after initial sync)
  useEffect(() => {
    if (!synced) return;
    writeData("schedule", schedule);
  }, [schedule, synced]);

  useEffect(() => {
    if (!synced) return;
    writeData("completions", completions);
  }, [completions, synced]);

  useEffect(() => {
    if (!synced) return;
    writeData("users", users);
  }, [users, synced]);

  useEffect(() => {
    localStorage.setItem("teaco-activeUser", activeUser);
  }, [activeUser]);

  // Close freq key on outside click
  useEffect(() => {
    const h = e => { if (freqKeyRef.current && !freqKeyRef.current.contains(e.target)) setFreqKeyOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────
  const toggleChore = useCallback((choreId, date) => {
    const ds = dateStr(date);
    setCompletions(prev => {
      const cur = prev[choreId];
      if (cur && cur.date === ds) { const n = { ...prev }; delete n[choreId]; return n; }
      return { ...prev, [choreId]: { date: ds, user: activeUser } };
    });
  }, [activeUser]);

  const saveEdit = (updated) => { setSchedule(prev => prev.map(c => c.id === updated.id ? updated : c)); setEditModal(null); };
  const deleteChore = (id) => { setSchedule(prev => prev.filter(c => c.id !== id)); setEditModal(null); };
  const addChore = (c) => { setSchedule(prev => [...prev, { ...c, id: uid() }]); setAddModal(false); };
  const rescheduleChore = (chore, date, newDate) => {
    const pk = getPeriodKey(chore, date, completions);
    setSchedule(prev => prev.map(c => c.id !== chore.id ? c : { ...c, reschedules: { ...c.reschedules, [pk]: dateStr(newDate) } }));
    setEditModal(null);
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const activeUserObj = users.find(u => u.id === activeUser) || users[0];
  const todayChores   = getChoresForDate(schedule, today, completions);
  const todayDone     = todayChores.filter(c => isCompletedOnDate(c, today, completions));
  const todayPending  = todayChores.filter(c => !isCompletedOnDate(c, today, completions));
  const pct = todayChores.length ? Math.round(100 * todayDone.length / todayChores.length) : 100;

  const pendingByCat = {};
  for (const c of todayPending) { if (!pendingByCat[c.cat]) pendingByCat[c.cat] = []; pendingByCat[c.cat].push(c); }
  const sortedCats = Object.keys(pendingByCat).sort((a, b) => (CAT_ORDER.indexOf(a)+1||99) - (CAT_ORDER.indexOf(b)+1||99));

  // ── Sub-components ─────────────────────────────────────────────────────────
  const CatHeader = ({ cat }) => (
    <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:6 }}>
      <div style={{ width:7, height:7, borderRadius:"50%", background:CAT_COLOR[cat]||"#888" }}/>
      <span style={{ fontSize:9, letterSpacing:"0.13em", textTransform:"uppercase", color:"rgba(255,255,255,0.32)", fontFamily:"monospace" }}>{cat}</span>
    </div>
  );

  const ChoreRow = ({ chore, date, small }) => {
    const done = isCompletedOnDate(chore, date, completions);
    const completion = completions[chore.id];
    const completedByUser = done && completion ? users.find(u => u.id === completion.user) : null;
    const freqCol = FREQ_COLOR[chore.freq] || "#888";
    return (
      <div style={{
        display:"flex", alignItems:"flex-start", gap:8,
        padding: small ? "6px 8px" : "8px 11px",
        borderRadius:9, marginBottom:3,
        background: done ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.05)",
        border: `1px solid ${done ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.09)"}`,
        opacity: done ? 0.5 : 1, transition:"all 0.15s",
      }}>
        {/* Checkbox */}
        <div onClick={() => toggleChore(chore.id, date)} style={{
          width:18, height:18, borderRadius:5, flexShrink:0, marginTop:1, cursor:"pointer",
          border: `1.5px solid ${completedByUser ? completedByUser.color : "rgba(255,255,255,0.2)"}`,
          background: completedByUser ? completedByUser.color : "transparent",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:9, color:"#111", fontWeight:900, fontFamily:"monospace", transition:"all 0.15s",
        }}>
          {completedByUser && completedByUser.name.slice(0,1).toUpperCase()}
        </div>
        {/* Freq dot */}
        <div title={FREQ_LABEL[chore.freq]} onClick={e => { e.stopPropagation(); setFreqKeyOpen(true); }} style={{
          width:7, height:7, borderRadius:"50%", background:freqCol,
          flexShrink:0, marginTop:5, cursor:"pointer",
        }}/>
        {/* Text */}
        <span onClick={() => toggleChore(chore.id, date)} style={{
          flex:1, fontSize: small ? 11 : 13,
          color: done ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.82)",
          lineHeight:1.45, textDecoration: done ? "line-through" : "none", cursor:"pointer",
        }}>{chore.task}</span>
        {/* Edit */}
        <button onClick={() => setEditModal({ chore, date })} style={{
          all:"unset", cursor:"pointer", padding:"1px 5px", fontSize:13,
          color:"rgba(255,255,255,0.18)", flexShrink:0, marginTop:1,
          transition:"color 0.15s",
        }}
          onMouseOver={e => e.target.style.color="rgba(255,255,255,0.6)"}
          onMouseOut={e => e.target.style.color="rgba(255,255,255,0.18)"}
        >···</button>
      </div>
    );
  };

  // ── Views ──────────────────────────────────────────────────────────────────
  const TodayView = () => (
    <div style={{ paddingBottom:60 }}>
      {/* Progress */}
      <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:14, padding:"15px 18px", marginBottom:20, border:"1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:9 }}>
          <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:"#f5f0e8" }}>
            {DAYS_FULL[today.getDay()]}, {MONTHS[today.getMonth()]} {today.getDate()}
          </span>
          <span style={{ fontFamily:"monospace", fontSize:12, color:pct===100?"#7ECFC0":"#F4A261", fontWeight:700 }}>{todayDone.length}/{todayChores.length}</span>
        </div>
        <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:999, height:5, overflow:"hidden" }}>
          <div style={{
            width:`${pct}%`, height:"100%", borderRadius:999,
            background: pct===100 ? "linear-gradient(90deg,#52B788,#7ECFC0)" : "linear-gradient(90deg,#F4A261,#E8C547)",
            transition:"width 0.5s cubic-bezier(0.34,1.56,0.64,1)",
          }}/>
        </div>
        {pct===100 && <div style={{ textAlign:"center", marginTop:8, color:"#7ECFC0", fontFamily:"'Cormorant Garamond',serif", fontSize:14, fontStyle:"italic" }}>✦ All done for today ✦</div>}
      </div>
      {sortedCats.map(cat => (
        <div key={cat} style={{ marginBottom:14 }}>
          <CatHeader cat={cat}/>
          {pendingByCat[cat].map(c => <ChoreRow key={c.id} chore={c} date={today}/>)}
        </div>
      ))}
      {todayDone.length > 0 && (
        <div style={{ marginTop:22 }}>
          <button onClick={() => setShowDone(p => !p)} style={{ all:"unset", cursor:"pointer", display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            <span style={{ fontSize:9, letterSpacing:"0.13em", textTransform:"uppercase", color:"rgba(255,255,255,0.2)", fontFamily:"monospace" }}>✓ Completed ({todayDone.length})</span>
            <span style={{ color:"rgba(255,255,255,0.18)", fontSize:9 }}>{showDone ? "▲" : "▼"}</span>
          </button>
          {showDone && todayDone.map(c => <ChoreRow key={c.id} chore={c} date={today}/>)}
        </div>
      )}
    </div>
  );

  const CalendarView = () => {
    const { y, m } = calMonth;
    const firstDow = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m+1, 0).getDate();
    const cells = [...Array(firstDow).fill(null), ...Array.from({ length:daysInMonth }, (_,i) => new Date(y, m, i+1))];
    while (cells.length % 7 !== 0) cells.push(null);

    const selChores  = getChoresForDate(schedule, selectedDate, completions);
    const selPending = selChores.filter(c => !isCompletedOnDate(c, selectedDate, completions));
    const selDone    = selChores.filter(c => isCompletedOnDate(c, selectedDate, completions));
    const selByCat   = {};
    for (const c of selPending) { if (!selByCat[c.cat]) selByCat[c.cat] = []; selByCat[c.cat].push(c); }

    return (
      <div style={{ paddingBottom:60 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
          <button onClick={() => setCalMonth(p => { const d=new Date(p.y,p.m-1); return{y:d.getFullYear(),m:d.getMonth()}; })} style={navBtnSt}>‹</button>
          <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:19, color:"#f5f0e8" }}>{MONTHS[m]} {y}</span>
          <button onClick={() => setCalMonth(p => { const d=new Date(p.y,p.m+1); return{y:d.getFullYear(),m:d.getMonth()}; })} style={navBtnSt}>›</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:3 }}>
          {DAYS_SHORT.map(d => <div key={d} style={{ textAlign:"center", fontSize:9, color:"rgba(255,255,255,0.25)", fontFamily:"monospace", letterSpacing:"0.07em", paddingBottom:4 }}>{d}</div>)}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:20 }}>
          {cells.map((date, i) => {
            if (!date) return <div key={`e${i}`}/>;
            const chores  = getChoresForDate(schedule, date, completions);
            const doneC   = chores.filter(c => isCompletedOnDate(c, date, completions));
            const nonDaily = chores.filter(c => c.freq !== "daily");
            const p = chores.length ? doneC.length / chores.length : -1;
            const isToday = date.toDateString() === today.toDateString();
            const isSel   = date.toDateString() === selectedDate.toDateString();
            const cats = [...new Set(nonDaily.map(c => c.cat))].slice(0, 3);
            return (
              <button key={i} onClick={() => setSelectedDate(new Date(date))} style={{
                background: isSel ? "rgba(244,162,97,0.14)" : "rgba(255,255,255,0.025)",
                border: isToday ? "1.5px solid rgba(244,162,97,0.65)" : isSel ? "1.5px solid rgba(244,162,97,0.35)" : "1px solid rgba(255,255,255,0.06)",
                borderRadius:9, padding:"6px 2px 5px", cursor:"pointer",
                display:"flex", flexDirection:"column", alignItems:"center", gap:2.5, transition:"all 0.12s",
              }}>
                <span style={{ fontFamily:"monospace", fontSize:11, color:isToday?"#F4A261":"rgba(255,255,255,0.6)", fontWeight:isToday?700:400 }}>{date.getDate()}</span>
                <div style={{ display:"flex", gap:1.5, minHeight:4 }}>
                  {cats.map(cat => <div key={cat} style={{ width:4, height:4, borderRadius:"50%", background:CAT_COLOR[cat]||"#888" }}/>)}
                </div>
                {p >= 0 && <div style={{ width:"58%", height:2, background:"rgba(255,255,255,0.06)", borderRadius:999, overflow:"hidden" }}>
                  <div style={{ width:`${p*100}%`, height:"100%", background:p===1?"#7ECFC0":"#F4A261", borderRadius:999 }}/>
                </div>}
              </button>
            );
          })}
        </div>
        <div style={{ borderTop:"1px solid rgba(255,255,255,0.07)", paddingTop:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:14 }}>
            <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, color:"#f5f0e8" }}>
              {DAYS_FULL[selectedDate.getDay()]}, {MONTHS[selectedDate.getMonth()]} {selectedDate.getDate()}
            </span>
            <span style={{ fontFamily:"monospace", fontSize:10, color:"rgba(255,255,255,0.25)" }}>{selDone.length}/{selChores.length} done</span>
          </div>
          {selChores.length === 0 && <div style={{ textAlign:"center", color:"rgba(255,255,255,0.18)", fontFamily:"monospace", fontSize:11, padding:"16px 0" }}>No chores scheduled</div>}
          {Object.entries(selByCat).sort((a,b) => (CAT_ORDER.indexOf(a[0])+1||99)-(CAT_ORDER.indexOf(b[0])+1||99)).map(([cat, chores]) => (
            <div key={cat} style={{ marginBottom:12 }}>
              <CatHeader cat={cat}/>
              {chores.map(c => <ChoreRow key={c.id} chore={c} date={selectedDate} small/>)}
            </div>
          ))}
          {selDone.length > 0 && (
            <div style={{ marginTop:12 }}>
              <div style={{ fontSize:9, letterSpacing:"0.13em", textTransform:"uppercase", color:"rgba(255,255,255,0.18)", fontFamily:"monospace", marginBottom:6 }}>✓ Done</div>
              {selDone.map(c => <ChoreRow key={c.id} chore={c} date={selectedDate} small/>)}
            </div>
          )}
        </div>
      </div>
    );
  };

  const AllView = () => (
    <div style={{ paddingBottom:60 }}>
      <button onClick={() => setAddModal(true)} style={{
        width:"100%", background:"rgba(244,162,97,0.1)", border:"1px dashed rgba(244,162,97,0.4)",
        borderRadius:10, padding:"9px", cursor:"pointer", color:"#F4A261", fontFamily:"monospace",
        fontSize:11, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:16, transition:"all 0.15s",
      }}>+ Add Task</button>
      {FREQ_OPTIONS.map(key => {
        const chores = schedule.filter(c => c.freq === key);
        if (!chores.length) return null;
        const isOpen = collapsedFreqs[key] !== true;
        return (
          <div key={key} style={{ marginBottom:5 }}>
            <button onClick={() => setCollapsedFreqs(p => ({ ...p, [key]: !p[key] }))} style={{
              all:"unset", cursor:"pointer", width:"100%", boxSizing:"border-box",
              display:"flex", justifyContent:"space-between", alignItems:"center",
              background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)",
              borderRadius:10, padding:"8px 13px", marginBottom: isOpen ? 5 : 0,
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:FREQ_COLOR[key]||"#888" }}/>
                <span style={{ fontFamily:"monospace", fontSize:10, letterSpacing:"0.11em", textTransform:"uppercase", color:"rgba(255,255,255,0.42)" }}>{FREQ_LABEL[key]}</span>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <span style={{ fontFamily:"monospace", fontSize:10, color:"rgba(255,255,255,0.2)" }}>{chores.length}</span>
                <span style={{ color:"rgba(255,255,255,0.2)", fontSize:9 }}>{isOpen ? "▲" : "▼"}</span>
              </div>
            </button>
            {isOpen && chores.map(c => {
              const daysUntil = getNextDueDays(c, completions);
              const isCur = isCompletedOnDate(c, today, completions);
              const completion = completions[c.id];
              const completedByUser = isCur && completion ? users.find(u => u.id === completion.user) : null;
              return (
                <div key={c.id} style={{
                  display:"flex", alignItems:"flex-start", gap:8, padding:"8px 11px",
                  borderRadius:9, marginBottom:3, background:"rgba(255,255,255,0.03)",
                  border:"1px solid rgba(255,255,255,0.06)", opacity: isCur ? 0.45 : 1,
                }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:CAT_COLOR[c.cat]||"#888", marginTop:4, flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, color:"rgba(255,255,255,0.75)", lineHeight:1.4 }}>{c.task}</div>
                    <div style={{ display:"flex", gap:10, marginTop:2, flexWrap:"wrap", alignItems:"center" }}>
                      <span style={{ fontSize:9, color:CAT_COLOR[c.cat]||"#888", fontFamily:"monospace" }}>{c.cat}</span>
                      {key !== "daily" && <span style={{ fontSize:9, color:daysUntil===0?"#F4A261":"rgba(255,255,255,0.2)", fontFamily:"monospace" }}>
                        {isCur ? "✓ done" : daysUntil===0 ? "due now" : daysUntil===1 ? "tmrw" : `in ${daysUntil}d`}
                        {c.dow != null && ` · ${DAYS_SHORT[c.dow]}s`}
                      </span>}
                      {completedByUser && <span style={{ fontSize:9, fontFamily:"monospace", color:completedByUser.color }}>by {completedByUser.name}</span>}
                    </div>
                  </div>
                  <button onClick={() => setEditModal({ chore:c, date:today })} style={{ all:"unset", cursor:"pointer", fontSize:13, color:"rgba(255,255,255,0.2)", padding:"0 4px" }}>···</button>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  // ── Modals ─────────────────────────────────────────────────────────────────
  const EditModal = () => {
    if (!editModal) return null;
    const { chore, date } = editModal;
    const [tab, setTab]         = useState("edit");
    const [taskVal, setTaskVal] = useState(chore.task);
    const [catVal, setCatVal]   = useState(chore.cat);
    const [freqVal, setFreqVal] = useState(chore.freq);
    const [dowVal, setDowVal]   = useState(chore.dow ?? 0);
    const [reschedDate, setReschedDate] = useState(dateStr(addDays(date, 1)));
    return (
      <Modal onClose={() => setEditModal(null)}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:"#f5f0e8", marginBottom:14 }}>Edit Task</div>
        <TabBar tabs={["edit","reschedule"]} active={tab} onChange={setTab}/>
        {tab === "edit" && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <Field label="Task name"><textarea value={taskVal} onChange={e=>setTaskVal(e.target.value)} style={inputSt} rows={2}/></Field>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <Field label="Category">
                <select value={catVal} onChange={e=>setCatVal(e.target.value)} style={selectSt}>{CATS.map(c=><option key={c}>{c}</option>)}</select>
              </Field>
              <Field label="Frequency">
                <select value={freqVal} onChange={e=>setFreqVal(e.target.value)} style={selectSt}>{FREQ_OPTIONS.map(f=><option key={f} value={f}>{FREQ_LABEL[f]}</option>)}</select>
              </Field>
            </div>
            {["weekly","biweekly","triweekly"].includes(freqVal) && (
              <Field label="Day of week">
                <select value={dowVal} onChange={e=>setDowVal(Number(e.target.value))} style={selectSt}>{DAYS_FULL.map((d,i)=><option key={i} value={i}>{d}</option>)}</select>
              </Field>
            )}
            <div style={{ display:"flex", gap:8, marginTop:4 }}>
              <button onClick={() => saveEdit({ ...chore, task:taskVal, cat:catVal, freq:freqVal, dow:["weekly","biweekly","triweekly"].includes(freqVal)?dowVal:undefined })} style={primaryBtn}>Save</button>
              <button onClick={() => deleteChore(chore.id)} style={dangerBtn}>Delete</button>
            </div>
          </div>
        )}
        {tab === "reschedule" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <p style={{ fontSize:12, color:"rgba(255,255,255,0.45)", margin:0, lineHeight:1.6 }}>Move this occurrence to a different date. The regular schedule resumes from the new completion date.</p>
            <Field label="Reschedule to"><input type="date" value={reschedDate} onChange={e=>setReschedDate(e.target.value)} style={inputSt}/></Field>
            <button onClick={() => rescheduleChore(chore, date, parseDate(reschedDate))} style={primaryBtn}>Move to this date</button>
          </div>
        )}
      </Modal>
    );
  };

  const AddModal = () => {
    if (!addModal) return null;
    const [taskVal, setTaskVal] = useState("");
    const [catVal, setCatVal]   = useState("Misc");
    const [freqVal, setFreqVal] = useState("weekly");
    const [dowVal, setDowVal]   = useState(1);
    return (
      <Modal onClose={() => setAddModal(false)}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:"#f5f0e8", marginBottom:16 }}>Add New Task</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <Field label="Task name"><textarea value={taskVal} onChange={e=>setTaskVal(e.target.value)} style={inputSt} rows={2} placeholder="Describe the chore..."/></Field>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <Field label="Category"><select value={catVal} onChange={e=>setCatVal(e.target.value)} style={selectSt}>{CATS.map(c=><option key={c}>{c}</option>)}</select></Field>
            <Field label="Frequency"><select value={freqVal} onChange={e=>setFreqVal(e.target.value)} style={selectSt}>{FREQ_OPTIONS.map(f=><option key={f} value={f}>{FREQ_LABEL[f]}</option>)}</select></Field>
          </div>
          {["weekly","biweekly","triweekly"].includes(freqVal) && (
            <Field label="Day of week"><select value={dowVal} onChange={e=>setDowVal(Number(e.target.value))} style={selectSt}>{DAYS_FULL.map((d,i)=><option key={i} value={i}>{d}</option>)}</select></Field>
          )}
          <button disabled={!taskVal.trim()} onClick={() => addChore({ task:taskVal.trim(), cat:catVal, freq:freqVal, dow:["weekly","biweekly","triweekly"].includes(freqVal)?dowVal:undefined, nudgeDays:7 })} style={{ ...primaryBtn, opacity:taskVal.trim()?1:0.4 }}>Add Task</button>
        </div>
      </Modal>
    );
  };

  const UserModal = () => {
    if (!userModal) return null;
    const [eu, setEu] = useState(users.map(u => ({ ...u })));
    return (
      <Modal onClose={() => setUserModal(false)}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:"#f5f0e8", marginBottom:16 }}>Household Members</div>
        {eu.map((u, i) => (
          <div key={u.id} style={{ display:"flex", gap:8, alignItems:"center", marginBottom:12 }}>
            <div style={{ display:"flex", gap:3, flexWrap:"wrap", width:64 }}>
              {USER_COLORS.map(col => (
                <div key={col} onClick={() => { const n=[...eu]; n[i]={...n[i],color:col}; setEu(n); }} style={{
                  width:14, height:14, borderRadius:"50%", background:col, cursor:"pointer",
                  border: u.color===col ? "2px solid white" : "2px solid transparent",
                }}/>
              ))}
            </div>
            <input value={u.name} onChange={e => { const n=[...eu]; n[i]={...n[i],name:e.target.value}; setEu(n); }} style={{ ...inputSt, flex:1, padding:"6px 10px", fontSize:13 }}/>
            <div style={{ width:28, height:28, borderRadius:6, background:u.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:"#111", fontWeight:900, fontFamily:"monospace" }}>
              {u.name.slice(0,1).toUpperCase()}
            </div>
          </div>
        ))}
        <button onClick={() => { setUsers(eu); setUserModal(false); }} style={primaryBtn}>Save</button>
      </Modal>
    );
  };

  const FreqKey = () => (
    <>
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:999 }} onClick={() => setFreqKeyOpen(false)}/>
      <div ref={freqKeyRef} style={{
        position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
        background:"#1e1c1a", border:"1px solid rgba(255,255,255,0.12)", borderRadius:14,
        padding:20, zIndex:1000, minWidth:220, boxShadow:"0 20px 60px rgba(0,0,0,0.6)",
      }}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, color:"#f5f0e8", marginBottom:12 }}>Frequency Key</div>
        {FREQ_OPTIONS.map(f => (
          <div key={f} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
            <div style={{ width:9, height:9, borderRadius:"50%", background:FREQ_COLOR[f], flexShrink:0 }}/>
            <span style={{ fontSize:12, color:"rgba(255,255,255,0.65)" }}>{FREQ_LABEL[f]}</span>
          </div>
        ))}
        <button onClick={() => setFreqKeyOpen(false)} style={{ ...primaryBtn, marginTop:8, width:"100%", boxSizing:"border-box" }}>Close</button>
      </div>
    </>
  );

  // ── Layout ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight:"100vh", background:"#121110", color:"#f5f0e8", fontFamily:"'DM Sans',sans-serif",
      backgroundImage:"radial-gradient(ellipse at 15% 15%,rgba(244,162,97,0.07) 0%,transparent 55%),radial-gradient(ellipse at 85% 85%,rgba(126,207,192,0.05) 0%,transparent 55%)",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet"/>
      {freqKeyOpen && <FreqKey/>}
      {editModal && <><div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:999 }} onClick={() => setEditModal(null)}/><EditModal/></>}
      {addModal  && <><div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:999 }} onClick={() => setAddModal(false)}/><AddModal/></>}
      {userModal && <><div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:999 }} onClick={() => setUserModal(false)}/><UserModal/></>}

      <div style={{ maxWidth:520, margin:"0 auto", padding:"0 16px" }}>
        {/* Header */}
        <div style={{ padding:"24px 0 16px", borderBottom:"1px solid rgba(255,255,255,0.07)", marginBottom:18 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
              <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:26, fontWeight:600 }}>Teaco</span>
              <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:26, color:"#F4A261", fontStyle:"italic" }}>Chores</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              {users.map(u => (
                <button key={u.id} onClick={() => setActiveUser(u.id)} style={{
                  all:"unset", cursor:"pointer", width:28, height:28, borderRadius:7,
                  background:u.color, display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:11, color:"#111", fontWeight:900, fontFamily:"monospace",
                  opacity: activeUser===u.id ? 1 : 0.35,
                  border: activeUser===u.id ? "2px solid white" : "2px solid transparent",
                  transition:"all 0.15s", boxSizing:"border-box",
                }}>
                  {u.name.slice(0,1).toUpperCase()}
                </button>
              ))}
              <button onClick={() => setUserModal(true)} style={{ all:"unset", cursor:"pointer", fontSize:16, color:"rgba(255,255,255,0.3)", padding:"0 4px" }} title="Edit users">⚙</button>
            </div>
          </div>
          <div style={{ marginTop:4, fontSize:11, color:"rgba(255,255,255,0.3)", fontFamily:"monospace" }}>
            Checking in as <span style={{ color:activeUserObj.color }}>{activeUserObj.name}</span>
            {" · "}{pct===100 ? "✓ all done today" : `${todayPending.length} left today`}
            {!synced && <span style={{ color:"rgba(255,255,255,0.2)", marginLeft:8 }}>⟳ connecting…</span>}
          </div>
        </div>

        {/* Nav */}
        <div style={{ display:"flex", gap:3, marginBottom:22, background:"rgba(255,255,255,0.04)", borderRadius:11, padding:3 }}>
          {[["today","Today"],["calendar","Calendar"],["all","All"]].map(([v,l]) => (
            <button key={v} onClick={() => setView(v)} style={{
              flex:1, padding:"7px 0", borderRadius:9, fontSize:10, fontFamily:"monospace",
              letterSpacing:"0.1em", textTransform:"uppercase", cursor:"pointer", border:"none",
              background: view===v ? "rgba(244,162,97,0.18)" : "transparent",
              color: view===v ? "#F4A261" : "rgba(255,255,255,0.3)",
              transition:"all 0.18s", fontWeight: view===v ? 700 : 400,
            }}>{l}</button>
          ))}
        </div>

        {view==="today"    && <TodayView/>}
        {view==="calendar" && <CalendarView/>}
        {view==="all"      && <AllView/>}
      </div>
    </div>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Modal({ children, onClose }) {
  return (
    <div style={{
      position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
      background:"#1e1c1a", border:"1px solid rgba(255,255,255,0.12)", borderRadius:16,
      padding:22, zIndex:1000, width:"min(90vw,400px)", maxHeight:"85vh", overflowY:"auto",
      boxShadow:"0 24px 70px rgba(0,0,0,0.7)",
    }}>
      {children}
    </div>
  );
}
function Field({ label, children }) {
  return <label style={{ display:"flex", flexDirection:"column", gap:5, fontSize:10, color:"rgba(255,255,255,0.4)", letterSpacing:"0.08em", textTransform:"uppercase", fontFamily:"monospace" }}>{label}{children}</label>;
}
function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display:"flex", gap:4, marginBottom:14, background:"rgba(255,255,255,0.05)", borderRadius:8, padding:3 }}>
      {tabs.map(t => (
        <button key={t} onClick={() => onChange(t)} style={{
          flex:1, padding:"6px 0", borderRadius:6, fontSize:10, fontFamily:"monospace",
          letterSpacing:"0.1em", textTransform:"uppercase", cursor:"pointer", border:"none",
          background: active===t ? "rgba(244,162,97,0.2)" : "transparent",
          color: active===t ? "#F4A261" : "rgba(255,255,255,0.35)",
        }}>{t}</button>
      ))}
    </div>
  );
}

const inputSt    = { background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:8, padding:"8px 10px", color:"#f5f0e8", fontSize:13, fontFamily:"'DM Sans',sans-serif", resize:"none", outline:"none", width:"100%", boxSizing:"border-box" };
const selectSt   = { background:"#1e1c1a", border:"1px solid rgba(255,255,255,0.12)", borderRadius:8, padding:"8px 10px", color:"#f5f0e8", fontSize:13, fontFamily:"'DM Sans',sans-serif", outline:"none", width:"100%", boxSizing:"border-box" };
const primaryBtn = { background:"rgba(244,162,97,0.2)", border:"1px solid rgba(244,162,97,0.4)", borderRadius:8, padding:"9px 16px", color:"#F4A261", fontSize:12, fontFamily:"monospace", letterSpacing:"0.08em", cursor:"pointer", textTransform:"uppercase" };
const dangerBtn  = { background:"rgba(255,100,100,0.1)", border:"1px solid rgba(255,100,100,0.3)", borderRadius:8, padding:"9px 16px", color:"#ff8080", fontSize:12, fontFamily:"monospace", letterSpacing:"0.08em", cursor:"pointer", textTransform:"uppercase" };
const navBtnSt   = { background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.5)", borderRadius:8, padding:"4px 12px", cursor:"pointer", fontSize:20, lineHeight:1 };
