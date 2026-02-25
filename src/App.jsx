import { useState, useEffect, useCallback, useRef } from "react";
import { writeData, readOnce } from "./firebase";
import { DEFAULT_SCHEDULE } from "./schedule";
import {
  DEFAULT_CAT_COLORS, getCatColor, FREQ_COLOR, FREQ_LABEL, FREQ_OPTIONS,
  DEFAULT_CATS, CAT_ORDER, TIME_OF_DAY, TIME_LABEL, TIME_ICON,
  DAYS_SHORT, DAYS_FULL, MONTHS, DEFAULT_USERS, USER_COLORS, PALETTE,
} from "./constants";
import {
  todayDate, dateStr, parseDate, addDays, daysBetween, freqInterval,
  freqDisplayLabel, uid, getChoresForDate, isCompletedOnDate,
  getNextDueDays, getPeriodKey, getCats,
} from "./scheduling";

// Convert schedule array to object keyed by task id for Firebase storage.
// Also strips undefined values which Firebase rejects.
function cleanForFirebase(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) out[k] = cleanForFirebase(v);
    else out[k] = v;
  }
  return out;
}
function toIdObject(arr) {
  const obj = {};
  (arr || []).forEach(c => { if (c && c.id) obj[c.id] = cleanForFirebase(c); });
  return obj;
}

export default function App() {
  const today = todayDate();

  const [schedule,    setSchedule]    = useState(DEFAULT_SCHEDULE);
  const [completions, setCompletions] = useState({});
  const [users,       setUsers]       = useState(DEFAULT_USERS);
  const [activeUser,  setActiveUser]  = useState("A");
  // catColors: { CategoryName: "#hexcolor" }
  const [catColors,   setCatColors]   = useState(DEFAULT_CAT_COLORS);
  // customCats: extra user-created categories beyond defaults
  const [customCats,  setCustomCats]  = useState([]);

  const [view,         setView]        = useState("today");
  const [calMonth,     setCalMonth]    = useState({ y:today.getFullYear(), m:today.getMonth() });
  const [selectedDate, setSelectedDate] = useState(new Date(today));
  const [showDone,     setShowDone]    = useState(false);
  const [freqKeyOpen,  setFreqKeyOpen] = useState(false);
  const [allViewMode,  setAllViewMode] = useState("freq"); // "freq" | "cat"
  const [editModal,    setEditModal]   = useState(null);
  const [addModal,     setAddModal]    = useState(false);
  const [userModal,    setUserModal]   = useState(false);
  const [catModal,     setCatModal]    = useState(false);
  const [collapsedFreqs, setCollapsedFreqs] = useState({});
  const [synced,       setSynced]      = useState(false);
  const [sortOrder,    setSortOrder]   = useState({});  // {choreId: number}
  const [reorderMode,  setReorderMode] = useState(false);
  const scheduleRef   = useRef(DEFAULT_SCHEDULE);
  const freqKeyRef = useRef(null);

  // All known categories (defaults + custom)
  const allCats = [...new Set([...DEFAULT_CATS, ...customCats])].sort();

  // Keep a ref to schedule so action functions always have the latest value
  useEffect(() => { scheduleRef.current = schedule; }, [schedule]);

  // ── Firebase ───────────────────────────────────────────────────────────────
  // Read once on mount. All writes happen explicitly inside action functions — never
  // via useEffect — so there is no risk of stale state being written back to Firebase.
  useEffect(() => {
    const stored = localStorage.getItem("teaco-activeUser");
    if (stored) setActiveUser(stored);

    const loadAll = async () => {
      const [sched, comps, usrs, cats, cCats, sortData] = await Promise.all([
        readOnce("schedule"),
        readOnce("completions"),
        readOnce("users"),
        readOnce("catColors"),
        readOnce("customCats"),
        readOnce("sortOrder"),
      ]);
      if (sched && typeof sched === "object") {
        const arr = Object.values(sched).filter(Boolean);
        if (arr.length > 0) setSchedule(arr);
      }
      if (comps && typeof comps === "object") setCompletions(comps);
      if (usrs)  setUsers(Array.isArray(usrs) ? usrs : Object.values(usrs).filter(Boolean));
      if (cats)  setCatColors(cats);
      if (cCats) setCustomCats(Array.isArray(cCats) ? cCats : Object.values(cCats).filter(Boolean));
      if (sortData && typeof sortData === "object") setSortOrder(sortData);
      setSynced(true);
    };
    loadAll();
  }, []);
  useEffect(() => { localStorage.setItem("teaco-activeUser", activeUser); }, [activeUser]);

  useEffect(() => {
    const h = e => { if (freqKeyRef.current && !freqKeyRef.current.contains(e.target)) setFreqKeyOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────
  const toggleChore = useCallback((choreId, date) => {
    const ds = dateStr(date);
    setCompletions(prev => {
      let next;
      const cur = prev[choreId];
      if (cur && cur.date === ds) { next = {...prev}; delete next[choreId]; }
      else next = {...prev, [choreId]: {date:ds, user:activeUser}};
      writeData("completions", next);
      return next;
    });
  }, [activeUser]);

  const saveEdit = (updated) => {
    const next = scheduleRef.current.map(c => c.id===updated.id ? updated : c);
    setSchedule(next);
    writeData("schedule", toIdObject(next));
    setEditModal(null);
  };
  const deleteChore = (id) => {
    const next = scheduleRef.current.filter(c => c.id!==id);
    setSchedule(next);
    writeData("schedule", toIdObject(next));
    setEditModal(null);
  };
  const addChore = (c) => {
    const newChore = {...c, id:uid()};
    const next = [...scheduleRef.current, newChore];
    setSchedule(next);
    writeData("schedule", toIdObject(next));
    setAddModal(false);
  };
  const rescheduleChore = (chore, date, newDate) => {
    const pk = getPeriodKey(chore, date, completions);
    const next = scheduleRef.current.map(c => c.id!==chore.id ? c : {...c, reschedules:{...c.reschedules, [pk]:dateStr(newDate)}});
    setSchedule(next);
    writeData("schedule", toIdObject(next));
    setEditModal(null);
  };
  const saveCatColors = (newColors, newCustom) => {
    setCatColors(newColors);
    setCustomCats(newCustom);
    writeData("catColors", newColors);
    writeData("customCats", newCustom);
    setCatModal(false);
  };

  const reorderChores = (orderedIds) => {
    // Assign sort values based on position in the new order
    const next = {...sortOrder};
    orderedIds.forEach((id, i) => { next[id] = i * 10; });
    setSortOrder(next);
    writeData("sortOrder", next);
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const activeUserObj = users.find(u => u.id===activeUser) || users[0];
  const todayChores   = getChoresForDate(schedule, today, completions);
  const todayDone     = todayChores.filter(c => isCompletedOnDate(c, today, completions));
  const todayPending  = todayChores.filter(c => !isCompletedOnDate(c, today, completions));
  const pct = todayChores.length ? Math.round(100*todayDone.length/todayChores.length) : 100;

  // Group by time-of-day, then category within each group
  function groupByTimeAndCat(chores) {
    const groups = {morning:[], afternoon:[], evening:[], anytime:[]};
    for (const c of chores) {
      const t = c.timeOfDay || "anytime";
      groups[t].push(c);
    }
    return groups;
  }
  function groupByCat(chores) {
    const byCat = {};
    for (const c of chores) {
      const cats = getCats(c);
      // Use first cat as display group to avoid duplication
      const primary = cats[0];
      if (!byCat[primary]) byCat[primary] = [];
      byCat[primary].push(c);
    }
    return byCat;
  }

  // Apply sortOrder to a list of chores
  function applyOrder(chores) {
    return [...chores].sort((a, b) => {
      const ao = sortOrder[a.id] ?? 9999;
      const bo = sortOrder[b.id] ?? 9999;
      return ao - bo;
    });
  }

  // Sort cats using CAT_ORDER then alpha
  function sortCats(catList) {
    return [...catList].sort((a,b) => {
      const ai = CAT_ORDER.indexOf(a), bi = CAT_ORDER.indexOf(b);
      if (ai>=0 && bi>=0) return ai-bi;
      if (ai>=0) return -1;
      if (bi>=0) return 1;
      return a.localeCompare(b);
    });
  }

  const pendingGroups = groupByTimeAndCat(todayPending);
  const TIME_DISPLAY_ORDER = ["morning","afternoon","evening","anytime"];

  // ── Sub-components ─────────────────────────────────────────────────────────
  const CatHeader = ({cat}) => (
    <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
      <div style={{width:7,height:7,borderRadius:"50%",background:getCatColor(cat,catColors)}}/>
      <span style={{fontSize:9,letterSpacing:"0.13em",textTransform:"uppercase",color:"rgba(255,255,255,0.32)",fontFamily:"monospace"}}>{cat}</span>
    </div>
  );

  const ChoreRow = ({chore, date, small, onMoveUp, onMoveDown, isReordering}) => {
    const done = isCompletedOnDate(chore, date, completions);
    const completion = completions[chore.id];
    const completedByUser = done && completion ? users.find(u=>u.id===completion.user) : null;
    const freqCol = FREQ_COLOR[chore.freq] || "#aaa";
    const cats = getCats(chore);
    const timeIcon = chore.timeOfDay && chore.timeOfDay!=="anytime" ? TIME_ICON[chore.timeOfDay] : null;

    return (
      <div style={{
        display:"flex", alignItems:"center", gap:8,
        padding: small ? "6px 8px" : "8px 11px",
        borderRadius:9, marginBottom:3,
        background: done ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.05)",
        border:`1px solid ${done?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.09)"}`,
        opacity: done ? 0.5 : 1, transition:"all 0.15s",
      }}>
        {/* Reorder buttons — only in reorder mode */}
        {isReordering && (
          <div style={{display:"flex",flexDirection:"column",flexShrink:0,gap:1}}>
            <button onClick={onMoveUp} disabled={!onMoveUp} style={{
              all:"unset", width:22, height:18, display:"flex", alignItems:"center",
              justifyContent:"center", cursor:onMoveUp?"pointer":"default",
              color:onMoveUp?"rgba(255,255,255,0.6)":"rgba(255,255,255,0.1)",
              fontSize:11, borderRadius:4,
              background:onMoveUp?"rgba(255,255,255,0.07)":"transparent",
            }}>▲</button>
            <button onClick={onMoveDown} disabled={!onMoveDown} style={{
              all:"unset", width:22, height:18, display:"flex", alignItems:"center",
              justifyContent:"center", cursor:onMoveDown?"pointer":"default",
              color:onMoveDown?"rgba(255,255,255,0.6)":"rgba(255,255,255,0.1)",
              fontSize:11, borderRadius:4,
              background:onMoveDown?"rgba(255,255,255,0.07)":"transparent",
            }}>▼</button>
          </div>
        )}
        {/* Checkbox */}
        <div onClick={()=>toggleChore(chore.id,date)} style={{
          width:18, height:18, borderRadius:5, flexShrink:0, cursor:"pointer",
          border:`1.5px solid ${completedByUser?completedByUser.color:"rgba(255,255,255,0.2)"}`,
          background: completedByUser ? completedByUser.color : "transparent",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:9, color:"#111", fontWeight:900, fontFamily:"monospace", transition:"all 0.15s",
        }}>
          {completedByUser && completedByUser.name.slice(0,1).toUpperCase()}
        </div>
        {/* Freq dot */}
        <div title={freqDisplayLabel(chore.freq)} onClick={e=>{e.stopPropagation();setFreqKeyOpen(true);}} style={{
          width:7, height:7, borderRadius:"50%", background:freqCol,
          flexShrink:0, cursor:"pointer",
        }}/>
        {/* Main content */}
        <div onClick={()=>toggleChore(chore.id,date)} style={{flex:1,cursor:"pointer"}}>
          <div style={{
            fontSize: small?13:15,
            color: done?"rgba(255,255,255,0.28)":"rgba(255,255,255,0.82)",
            lineHeight:1.45, textDecoration: done?"line-through":"none",
          }}>{chore.task}</div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:3,alignItems:"center"}}>
            {cats.length > 1 && cats.slice(1).map(c=>(
              <span key={c} style={{
                fontSize:8, fontFamily:"monospace", letterSpacing:"0.06em",
                color:getCatColor(c,catColors), opacity:0.8,
                background:"rgba(255,255,255,0.06)", borderRadius:4, padding:"1px 5px",
              }}>{c}</span>
            ))}
            {timeIcon && <span style={{fontSize:10}}>{timeIcon}</span>}
          </div>
        </div>
        {/* Edit — hidden in reorder mode */}
        {!isReordering && (
          <button onClick={()=>setEditModal({chore,date})} style={{
            all:"unset", cursor:"pointer", padding:"1px 5px", fontSize:13,
            color:"rgba(255,255,255,0.18)", flexShrink:0, transition:"color 0.15s",
          }}
            onMouseOver={e=>e.currentTarget.style.color="rgba(255,255,255,0.6)"}
            onMouseOut={e=>e.currentTarget.style.color="rgba(255,255,255,0.18)"}
          >···</button>
        )}
      </div>
    );
  };

  // ── VIEWS ──────────────────────────────────────────────────────────────────
  const moveChore = (id, dir, orderedList) => {
    const ids = orderedList.map(c => c.id);
    const idx = ids.indexOf(id);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= ids.length) return;
    [ids[idx], ids[swapIdx]] = [ids[swapIdx], ids[idx]];
    const next = {...sortOrder};
    ids.forEach((cid, i) => { next[cid] = i * 10; });
    setSortOrder(next);
    writeData("sortOrder", next);
  };

  const TodayView = () => (
    <div style={{paddingBottom:60}}>
      {/* Progress */}
      <div style={{background:"rgba(255,255,255,0.04)",borderRadius:14,padding:"15px 18px",marginBottom:20,border:"1px solid rgba(255,255,255,0.07)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:9}}>
          <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:"#f5f0e8"}}>{DAYS_FULL[today.getDay()]}, {MONTHS[today.getMonth()]} {today.getDate()}</span>
          <span style={{fontFamily:"monospace",fontSize:12,color:pct===100?"#7ECFC0":"#F4A261",fontWeight:700}}>{todayDone.length}/{todayChores.length}</span>
        </div>
        <div style={{background:"rgba(255,255,255,0.08)",borderRadius:999,height:5,overflow:"hidden"}}>
          <div style={{width:`${pct}%`,height:"100%",borderRadius:999,
            background:pct===100?"linear-gradient(90deg,#52B788,#7ECFC0)":"linear-gradient(90deg,#F4A261,#E8C547)",
            transition:"width 0.5s cubic-bezier(0.34,1.56,0.64,1)"}}/>
        </div>
        {pct===100&&<div style={{textAlign:"center",marginTop:8,color:"#7ECFC0",fontFamily:"'Cormorant Garamond',serif",fontSize:14,fontStyle:"italic"}}>✦ All done for today ✦</div>}
      </div>

      {/* Reorder toggle — always visible below progress card */}
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}>
        <button onClick={()=>setReorderMode(p=>!p)} style={{
          all:"unset",cursor:"pointer",fontSize:11,fontFamily:"monospace",
          letterSpacing:"0.08em",textTransform:"uppercase",padding:"6px 14px",borderRadius:7,
          background:reorderMode?"rgba(244,162,97,0.25)":"rgba(255,255,255,0.08)",
          border:reorderMode?"1px solid rgba(244,162,97,0.6)":"1px solid rgba(255,255,255,0.15)",
          color:reorderMode?"#F4A261":"rgba(255,255,255,0.5)",transition:"all 0.15s",
        }}>{reorderMode ? "✓ Done reordering" : "⇅ Reorder tasks"}</button>
      </div>

      {/* All chores grouped by time then category — done ones stay in place */}
      {TIME_DISPLAY_ORDER.map(timeSlot => {
        const allInSlot = groupByTimeAndCat(todayChores)[timeSlot];
        if (!allInSlot || allInSlot.length===0) return null;
        const byCat = groupByCat(allInSlot);
        const sortedC = sortCats(Object.keys(byCat));
        return (
          <div key={timeSlot} style={{marginBottom:20}}>
            {timeSlot!=="anytime" && (
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <span style={{fontSize:13}}>{TIME_ICON[timeSlot]}</span>
                <span style={{fontSize:10,letterSpacing:"0.12em",textTransform:"uppercase",color:"rgba(255,255,255,0.4)",fontFamily:"monospace"}}>{TIME_LABEL[timeSlot]}</span>
                <div style={{flex:1,height:1,background:"rgba(255,255,255,0.06)"}}/>
              </div>
            )}
            {sortedC.map(cat=>{
              const orderedCat = applyOrder(byCat[cat]);
              return (
                <div key={cat} style={{marginBottom:14}}>
                  <CatHeader cat={cat}/>
                  {orderedCat.map((c,i)=>(
                    <ChoreRow key={c.id} chore={c} date={today}
                      isReordering={reorderMode}
                      onMoveUp={reorderMode && i>0 ? ()=>moveChore(c.id,"up",orderedCat) : null}
                      onMoveDown={reorderMode && i<orderedCat.length-1 ? ()=>moveChore(c.id,"down",orderedCat) : null}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  const CalendarView = () => {
    const {y,m} = calMonth;
    const firstDow = new Date(y,m,1).getDay();
    const daysInMonth = new Date(y,m+1,0).getDate();
    const cells = [...Array(firstDow).fill(null), ...Array.from({length:daysInMonth},(_,i)=>new Date(y,m,i+1))];
    while(cells.length%7!==0) cells.push(null);

    const selChores  = getChoresForDate(schedule, selectedDate, completions);
    const selPending = selChores.filter(c=>!isCompletedOnDate(c,selectedDate,completions));
    const selDone    = selChores.filter(c=>isCompletedOnDate(c,selectedDate,completions));
    const selGroups  = groupByTimeAndCat(selPending);

    return (
      <div style={{paddingBottom:60}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <button onClick={()=>setCalMonth(p=>{const d=new Date(p.y,p.m-1);return{y:d.getFullYear(),m:d.getMonth()};})} style={navBtnSt}>‹</button>
          <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:19,color:"#f5f0e8"}}>{MONTHS[m]} {y}</span>
          <button onClick={()=>setCalMonth(p=>{const d=new Date(p.y,p.m+1);return{y:d.getFullYear(),m:d.getMonth()};})} style={navBtnSt}>›</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:3}}>
          {DAYS_SHORT.map(d=><div key={d} style={{textAlign:"center",fontSize:9,color:"rgba(255,255,255,0.25)",fontFamily:"monospace",letterSpacing:"0.07em",paddingBottom:4}}>{d}</div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:20}}>
          {cells.map((date,i)=>{
            if(!date) return <div key={`e${i}`}/>;
            const chores   = getChoresForDate(schedule,date,completions);
            const doneC    = chores.filter(c=>isCompletedOnDate(c,date,completions));
            const nonDaily = chores.filter(c=>c.freq!=="daily");
            const p = chores.length ? doneC.length/chores.length : -1;
            const isToday = date.toDateString()===today.toDateString();
            const isSel   = date.toDateString()===selectedDate.toDateString();
            const primaryCats = [...new Set(nonDaily.map(c=>getCats(c)[0]))].slice(0,3);
            return (
              <button key={i} onClick={()=>setSelectedDate(new Date(date))} style={{
                background:isSel?"rgba(244,162,97,0.14)":"rgba(255,255,255,0.025)",
                border:isToday?"1.5px solid rgba(244,162,97,0.65)":isSel?"1.5px solid rgba(244,162,97,0.35)":"1px solid rgba(255,255,255,0.06)",
                borderRadius:9,padding:"6px 2px 5px",cursor:"pointer",
                display:"flex",flexDirection:"column",alignItems:"center",gap:2.5,transition:"all 0.12s",
              }}>
                <span style={{fontFamily:"monospace",fontSize:11,color:isToday?"#F4A261":"rgba(255,255,255,0.6)",fontWeight:isToday?700:400}}>{date.getDate()}</span>
                <div style={{display:"flex",gap:1.5,minHeight:4}}>
                  {primaryCats.map(cat=><div key={cat} style={{width:4,height:4,borderRadius:"50%",background:getCatColor(cat,catColors)}}/>)}
                </div>
                {p>=0&&<div style={{width:"58%",height:2,background:"rgba(255,255,255,0.06)",borderRadius:999,overflow:"hidden"}}>
                  <div style={{width:`${p*100}%`,height:"100%",background:p===1?"#7ECFC0":"#F4A261",borderRadius:999}}/>
                </div>}
              </button>
            );
          })}
        </div>

        <div style={{borderTop:"1px solid rgba(255,255,255,0.07)",paddingTop:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:14}}>
            <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:17,color:"#f5f0e8"}}>
              {DAYS_FULL[selectedDate.getDay()]}, {MONTHS[selectedDate.getMonth()]} {selectedDate.getDate()}
            </span>
            <span style={{fontFamily:"monospace",fontSize:10,color:"rgba(255,255,255,0.25)"}}>{selDone.length}/{selChores.length} done</span>
          </div>
          {selChores.length===0&&<div style={{textAlign:"center",color:"rgba(255,255,255,0.18)",fontFamily:"monospace",fontSize:11,padding:"16px 0"}}>No chores scheduled</div>}

          {TIME_DISPLAY_ORDER.map(timeSlot=>{
            const allInSlot = groupByTimeAndCat(selChores)[timeSlot];
            if(!allInSlot||allInSlot.length===0) return null;
            const byCat = groupByCat(allInSlot);
            const sortedC = sortCats(Object.keys(byCat));
            return (
              <div key={timeSlot} style={{marginBottom:16}}>
                {timeSlot!=="anytime"&&(
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <span style={{fontSize:12}}>{TIME_ICON[timeSlot]}</span>
                    <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",color:"rgba(255,255,255,0.35)",fontFamily:"monospace"}}>{TIME_LABEL[timeSlot]}</span>
                    <div style={{flex:1,height:1,background:"rgba(255,255,255,0.06)"}}/>
                  </div>
                )}
                {sortedC.map(cat=>{
                  const orderedCat = applyOrder(byCat[cat]);
                  return (
                    <div key={cat} style={{marginBottom:10}}>
                      <CatHeader cat={cat}/>
                      {orderedCat.map(c=><ChoreRow key={c.id} chore={c} date={selectedDate} small/>)}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const AllView = () => {
    // Group "once" tasks separately
    const onceTasks = schedule.filter(c=>c.freq==="once");
    const repeating = schedule.filter(c=>c.freq!=="once");
    const freqGroups = FREQ_OPTIONS.filter(k=>k!=="once");

    // Build category view data
    const allCatsInSchedule = [...new Set(schedule.flatMap(c => getCats(c)))].sort();

    return (
      <div style={{paddingBottom:60}}>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <button onClick={()=>setAddModal(true)} style={{
            flex:1,background:"rgba(244,162,97,0.1)",border:"1px dashed rgba(244,162,97,0.4)",
            borderRadius:10,padding:"9px",cursor:"pointer",color:"#F4A261",fontFamily:"monospace",
            fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",transition:"all 0.15s",
          }}>+ Add Task</button>
          <button onClick={()=>setCatModal(true)} style={{
            background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:10,padding:"9px 14px",cursor:"pointer",color:"rgba(255,255,255,0.45)",
            fontFamily:"monospace",fontSize:11,letterSpacing:"0.1em",textTransform:"uppercase",
          }}>Categories</button>
        </div>
        {/* View mode toggle */}
        <div style={{display:"flex",gap:6,marginBottom:14}}>
          {["freq","cat"].map(mode=>(
            <button key={mode} onClick={()=>setAllViewMode(mode)} style={{
              all:"unset",cursor:"pointer",padding:"5px 14px",borderRadius:6,
              fontFamily:"monospace",fontSize:10,letterSpacing:"0.08em",textTransform:"uppercase",
              background:allViewMode===mode?"rgba(255,255,255,0.12)":"transparent",
              color:allViewMode===mode?"rgba(255,255,255,0.8)":"rgba(255,255,255,0.3)",
              border:allViewMode===mode?"1px solid rgba(255,255,255,0.2)":"1px solid transparent",
              transition:"all 0.15s",
            }}>{mode==="freq"?"By Frequency":"By Category"}</button>
          ))}
        </div>

        {/* Category view */}
        {allViewMode==="cat"&&(
          <div>
            {allCatsInSchedule.map(cat=>{
              const chores = schedule.filter(c=>getCats(c).includes(cat));
              const isOpen = collapsedFreqs["cat:"+cat]!==false;
              return (
                <div key={cat} style={{marginBottom:5}}>
                  <button onClick={()=>setCollapsedFreqs(p=>({...p,["cat:"+cat]:!isOpen}))} style={{
                    all:"unset",cursor:"pointer",width:"100%",boxSizing:"border-box",
                    display:"flex",justifyContent:"space-between",alignItems:"center",
                    background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",
                    borderRadius:10,padding:"8px 13px",marginBottom:isOpen?5:0,
                  }}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:7,height:7,borderRadius:"50%",background:getCatColor(cat,catColors)}}/>
                      <span style={{fontFamily:"monospace",fontSize:10,letterSpacing:"0.11em",textTransform:"uppercase",color:"rgba(255,255,255,0.42)"}}>{cat}</span>
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <span style={{fontFamily:"monospace",fontSize:10,color:"rgba(255,255,255,0.2)"}}>{chores.length}</span>
                      <span style={{color:"rgba(255,255,255,0.2)",fontSize:9}}>{isOpen?"▲":"▼"}</span>
                    </div>
                  </button>
                  {isOpen&&chores.map(c=><AllChoreRow key={c.id} chore={c}/>)}
                </div>
              );
            })}
          </div>
        )}

        {/* Frequency view */}
        {allViewMode==="freq"&&<>

        {/* One-time tasks */}
        {onceTasks.length>0&&(
          <div style={{marginBottom:5}}>
            <button onClick={()=>setCollapsedFreqs(p=>({...p,once:!p.once}))} style={{
              all:"unset",cursor:"pointer",width:"100%",boxSizing:"border-box",
              display:"flex",justifyContent:"space-between",alignItems:"center",
              background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",
              borderRadius:10,padding:"8px 13px",marginBottom:collapsedFreqs.once?0:5,
            }}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:"#fff"}}/>
                <span style={{fontFamily:"monospace",fontSize:10,letterSpacing:"0.11em",textTransform:"uppercase",color:"rgba(255,255,255,0.42)"}}>One-time Tasks</span>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{fontFamily:"monospace",fontSize:10,color:"rgba(255,255,255,0.2)"}}>{onceTasks.length}</span>
                <span style={{color:"rgba(255,255,255,0.2)",fontSize:9}}>{collapsedFreqs.once?"▼":"▲"}</span>
              </div>
            </button>
            {!collapsedFreqs.once&&onceTasks.map(c=><AllChoreRow key={c.id} chore={c}/>)}
          </div>
        )}

        {/* Repeating tasks by frequency */}
        {freqGroups.map(key=>{
          const chores = repeating.filter(c=>c.freq===key);
          if(!chores.length) return null;
          const isOpen = collapsedFreqs[key]!==true;
          return (
            <div key={key} style={{marginBottom:5}}>
              <button onClick={()=>setCollapsedFreqs(p=>({...p,[key]:!p[key]}))} style={{
                all:"unset",cursor:"pointer",width:"100%",boxSizing:"border-box",
                display:"flex",justifyContent:"space-between",alignItems:"center",
                background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",
                borderRadius:10,padding:"8px 13px",marginBottom:isOpen?5:0,
              }}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:FREQ_COLOR[key]||"#aaa"}}/>
                  <span style={{fontFamily:"monospace",fontSize:10,letterSpacing:"0.11em",textTransform:"uppercase",color:"rgba(255,255,255,0.42)"}}>{freqDisplayLabel(key)}</span>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{fontFamily:"monospace",fontSize:10,color:"rgba(255,255,255,0.2)"}}>{chores.length}</span>
                  <span style={{color:"rgba(255,255,255,0.2)",fontSize:9}}>{isOpen?"▲":"▼"}</span>
                </div>
              </button>
              {isOpen&&chores.map(c=><AllChoreRow key={c.id} chore={c}/>)}
            </div>
          );
        })}

        {/* Custom frequencies */}
        {(()=>{
          const customFreqs = [...new Set(schedule.filter(c=>c.freq?.startsWith?.("custom:")).map(c=>c.freq))];
          return customFreqs.map(freq=>{
            const chores = schedule.filter(c=>c.freq===freq);
            const isOpen = collapsedFreqs[freq]!==true;
            return (
              <div key={freq} style={{marginBottom:5}}>
                <button onClick={()=>setCollapsedFreqs(p=>({...p,[freq]:!p[freq]}))} style={{
                  all:"unset",cursor:"pointer",width:"100%",boxSizing:"border-box",
                  display:"flex",justifyContent:"space-between",alignItems:"center",
                  background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",
                  borderRadius:10,padding:"8px 13px",marginBottom:isOpen?5:0,
                }}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:7,height:7,borderRadius:"50%",background:"#B09EE8"}}/>
                    <span style={{fontFamily:"monospace",fontSize:10,letterSpacing:"0.11em",textTransform:"uppercase",color:"rgba(255,255,255,0.42)"}}>{freqDisplayLabel(freq)}</span>
                  </div>
                  <span style={{color:"rgba(255,255,255,0.2)",fontSize:9}}>{isOpen?"▲":"▼"}</span>
                </button>
                {isOpen&&applyOrder(chores).map((c,i,arr)=>(
                  <AllChoreRow key={c.id} chore={c}
                    onMoveUp={reorderMode&&i>0?()=>moveChore(c.id,"up",arr):null}
                    onMoveDown={reorderMode&&i<arr.length-1?()=>moveChore(c.id,"down",arr):null}
                  />
                ))}
              </div>
            );
          });
        })()}
        </>}
      </div>
    );
  };

  // Row used in All view
  const AllChoreRow = ({chore, dotColor, showFreq, onMoveUp, onMoveDown}) => {
    const daysUntil = getNextDueDays(chore, completions);
    const isCur = isCompletedOnDate(chore, today, completions);
    const completion = completions[chore.id];
    const completedByUser = isCur&&completion ? users.find(u=>u.id===completion.user) : null;
    const cats = getCats(chore);
    const timeIcon = chore.timeOfDay&&chore.timeOfDay!=="anytime" ? TIME_ICON[chore.timeOfDay] : null;
    return (
      <div style={{
        display:"flex",alignItems:"flex-start",gap:8,padding:"8px 11px",
        borderRadius:9,marginBottom:3,background:"rgba(255,255,255,0.03)",
        border:"1px solid rgba(255,255,255,0.06)",opacity:isCur?0.45:1,
      }}>
        {reorderMode&&(
          <div style={{display:"flex",flexDirection:"column",flexShrink:0,gap:1,marginTop:1}}>
            <button onClick={onMoveUp} disabled={!onMoveUp} style={{
              all:"unset",width:22,height:18,display:"flex",alignItems:"center",
              justifyContent:"center",cursor:onMoveUp?"pointer":"default",
              color:onMoveUp?"rgba(255,255,255,0.6)":"rgba(255,255,255,0.1)",
              fontSize:11,borderRadius:4,background:onMoveUp?"rgba(255,255,255,0.07)":"transparent",
            }}>▲</button>
            <button onClick={onMoveDown} disabled={!onMoveDown} style={{
              all:"unset",width:22,height:18,display:"flex",alignItems:"center",
              justifyContent:"center",cursor:onMoveDown?"pointer":"default",
              color:onMoveDown?"rgba(255,255,255,0.6)":"rgba(255,255,255,0.1)",
              fontSize:11,borderRadius:4,background:onMoveDown?"rgba(255,255,255,0.07)":"transparent",
            }}>▼</button>
          </div>
        )}
        <div style={{width:7,height:7,borderRadius:"50%",background:dotColor||getCatColor(cats[0],catColors),marginTop:4,flexShrink:0}}/>
        <div style={{flex:1}}>
          <div style={{fontSize:14,color:"rgba(255,255,255,0.75)",lineHeight:1.4}}>{chore.task}</div>
          <div style={{display:"flex",gap:6,marginTop:2,flexWrap:"wrap",alignItems:"center"}}>
            {showFreq
              ? <span style={{fontSize:9,color:FREQ_COLOR[chore.freq]||"#aaa",fontFamily:"monospace"}}>{freqDisplayLabel(chore.freq)}</span>
              : cats.map(c=>(
                <span key={c} style={{fontSize:9,color:getCatColor(c,catColors),fontFamily:"monospace"}}>{c}</span>
              ))
            }
            {timeIcon&&<span style={{fontSize:10}}>{timeIcon}</span>}
            {chore.freq!=="daily"&&<span style={{fontSize:9,color:daysUntil===0?"#F4A261":"rgba(255,255,255,0.2)",fontFamily:"monospace"}}>
              {(()=>{
                const longFreqs = ["triweekly","monthly","2month","3month","6month","annual","3year"];
                const isLong = longFreqs.includes(chore.freq)||(typeof chore.freq==="string"&&chore.freq.startsWith("custom:"));
                if(isCur) return "✓ done";
                if(chore.freq==="once") return chore.onceDate||"";
                if(daysUntil===0) return "due now";
                if(isLong){
                  const nextDate = addDays(today, daysUntil);
                  return `${MONTHS[nextDate.getMonth()].slice(0,3)} ${nextDate.getDate()}`;
                }
                return daysUntil===1?"tmrw":`in ${daysUntil}d`;
              })()}
              {chore.dow!=null&&chore.freq!=="once"&&` · ${DAYS_SHORT[chore.dow]}s`}
            </span>}
            {completedByUser&&<span style={{fontSize:9,fontFamily:"monospace",color:completedByUser.color}}>by {completedByUser.name}</span>}
          </div>
        </div>
        <button onClick={()=>setEditModal({chore,date:today})} style={{all:"unset",cursor:"pointer",fontSize:13,color:"rgba(255,255,255,0.2)",padding:"0 4px"}}>···</button>
      </div>
    );
  };

  // ── MODALS ─────────────────────────────────────────────────────────────────

  // Shared form state component for Add/Edit
  const ChoreForm = ({initial, onSave, onDelete, showDelete}) => {
    const [taskVal,    setTaskVal]    = useState(initial.task||"");
    const [catVals,    setCatVals]    = useState(initial.cats||["Misc"]);
    const [freqVal,    setFreqVal]    = useState(initial.freq||"weekly");
    const [customDays, setCustomDays] = useState(initial.customDays||"");
    const [dowVal,     setDowVal]     = useState(initial.dow??1);
    const [onceDateVal,setOnceDateVal]= useState(initial.onceDate||dateStr(today));
    const [timeVal,    setTimeVal]    = useState(initial.timeOfDay||"anytime");
    const [catInput,   setCatInput]   = useState("");

    const isCustom = freqVal==="custom";
    const finalFreq = isCustom ? (customDays ? `custom:${customDays}` : "custom") : freqVal;

    const toggleCat = (cat) => {
      setCatVals(prev =>
        prev.includes(cat) ? (prev.length>1 ? prev.filter(c=>c!==cat) : prev) : [...prev, cat]
      );
    };
    const addNewCat = () => {
      const trimmed = catInput.trim();
      if(!trimmed) return;
      if(!allCats.includes(trimmed)) setCustomCats(p=>[...p, trimmed]);
      setCatVals(p=>[...p, trimmed]);
      setCatInput("");
    };

    const handleSave = () => {
      if(!taskVal.trim()) return;
      const base = {
        task: taskVal.trim(),
        cat: catVals.length===1 ? catVals[0] : catVals,
        freq: finalFreq,
        timeOfDay: timeVal,
      };
      if(freqVal==="once") base.onceDate = onceDateVal;
      if(["weekly","biweekly","triweekly","monthly","2month","3month","6month","annual","3year"].includes(freqVal) || freqVal==="custom") base.dow = dowVal;
      onSave({...initial, ...base});
    };

    return (
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <Field label="Task name">
          <textarea value={taskVal} onChange={e=>setTaskVal(e.target.value)} style={inputSt} rows={2} placeholder="Describe the chore..."/>
        </Field>

        {/* Categories — multi-select chips */}
        <div>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",letterSpacing:"0.08em",textTransform:"uppercase",fontFamily:"monospace",marginBottom:6}}>
            Categories <span style={{color:"rgba(255,255,255,0.2)"}}>(select all that apply)</span>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:8}}>
            {allCats.map(cat=>{
              const sel = catVals.includes(cat);
              return (
                <button key={cat} onClick={()=>toggleCat(cat)} style={{
                  all:"unset",cursor:"pointer",padding:"4px 10px",borderRadius:20,fontSize:11,
                  fontFamily:"monospace",letterSpacing:"0.05em",transition:"all 0.12s",
                  background:sel?getCatColor(cat,catColors)+"33":"rgba(255,255,255,0.06)",
                  border:`1px solid ${sel?getCatColor(cat,catColors):"rgba(255,255,255,0.1)"}`,
                  color:sel?getCatColor(cat,catColors):"rgba(255,255,255,0.5)",
                }}>{cat}</button>
              );
            })}
          </div>
          <div style={{display:"flex",gap:6}}>
            <input value={catInput} onChange={e=>setCatInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&addNewCat()}
              placeholder="New category…" style={{...inputSt,flex:1,padding:"6px 10px",fontSize:12}}/>
            <button onClick={addNewCat} style={{...primaryBtn,padding:"6px 12px",fontSize:11}}>Add</button>
          </div>
        </div>

        {/* Frequency */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Field label="Frequency">
            <select value={freqVal} onChange={e=>setFreqVal(e.target.value)} style={selectSt}>
              {FREQ_OPTIONS.map(f=><option key={f} value={f}>{freqDisplayLabel(f)}</option>)}
              <option value="custom">Custom…</option>
            </select>
          </Field>
          <Field label="Time of day">
            <select value={timeVal} onChange={e=>setTimeVal(e.target.value)} style={selectSt}>
              {TIME_OF_DAY.map(t=><option key={t} value={t}>{TIME_ICON[t]} {TIME_LABEL[t]}</option>)}
            </select>
          </Field>
        </div>

        {isCustom&&(
          <Field label="Every how many days?">
            <input type="number" min="1" value={customDays} onChange={e=>setCustomDays(e.target.value)}
              placeholder="e.g. 10" style={{...inputSt,padding:"8px 10px"}}/>
          </Field>
        )}
        {freqVal==="once"&&(
          <Field label="Date">
            <input type="date" value={onceDateVal} onChange={e=>setOnceDateVal(e.target.value)} style={inputSt}/>
          </Field>
        )}
        {freqVal!=="once"&&freqVal!=="daily"&&(
          <Field label="Day of week">
            <select value={dowVal} onChange={e=>setDowVal(Number(e.target.value))} style={selectSt}>
              {DAYS_FULL.map((d,i)=><option key={i} value={i}>{d}</option>)}
            </select>
          </Field>
        )}

        <div style={{display:"flex",gap:8,marginTop:4}}>
          <button disabled={!taskVal.trim()} onClick={handleSave} style={{...primaryBtn,opacity:taskVal.trim()?1:0.4}}>Save</button>
          {showDelete&&<button onClick={onDelete} style={dangerBtn}>Delete</button>}
        </div>
      </div>
    );
  };

  const EditModal = () => {
    if(!editModal) return null;
    const {chore,date} = editModal;
    const [tab,setTab] = useState("edit");
    const [reschedDate,setReschedDate] = useState(dateStr(addDays(date,1)));
    const cats = getCats(chore);
    return (
      <Modal onClose={()=>setEditModal(null)}>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:"#f5f0e8",marginBottom:14}}>Edit Task</div>
        {chore.freq!=="once"&&<TabBar tabs={["edit","reschedule"]} active={tab} onChange={setTab}/>}
        {tab==="edit"&&(
          <ChoreForm
            initial={{...chore, cats, customDays: chore.freq?.startsWith?.("custom:") ? chore.freq.split(":")[1] : ""}}
            onSave={updated=>saveEdit({...chore,...updated})}
            onDelete={()=>deleteChore(chore.id)}
            showDelete
          />
        )}
        {tab==="reschedule"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <p style={{fontSize:12,color:"rgba(255,255,255,0.45)",margin:0,lineHeight:1.6}}>Move this occurrence to a different date.</p>
            <Field label="Reschedule to">
              <input type="date" value={reschedDate} onChange={e=>setReschedDate(e.target.value)} style={inputSt}/>
            </Field>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <button onClick={()=>{
                // Move just this occurrence — store in reschedules map
                const pk = getPeriodKey(chore,date,completions);
                const next = scheduleRef.current.map(c => c.id!==chore.id ? c : {...c, reschedules:{...c.reschedules,[pk]:reschedDate}});
                setSchedule(next);
                setEditModal(null);
                writeData("schedule", toIdObject(next));
              }} style={primaryBtn}>Move this occurrence only</button>
              <button onClick={()=>{
                try {
                const newD = parseDate(reschedDate);
                const next = scheduleRef.current.map(c => {
                  if(c.id!==chore.id) return c;
                  const kept = {};
                  Object.entries(c.reschedules||{}).forEach(([k,v])=>{
                    const d = parseDate(v);
                    if(d && d < newD) kept[k] = v;
                  });
                  if(["weekly","biweekly","triweekly"].includes(c.freq)) {
                    // For weekly-type tasks: update dow to match new date's day of week.
                    // For biweekly/triweekly also update weekOffset to match new date's week.
                    const newDow = newD.getDay();
                    const weekNum = Math.floor(daysBetween(parseDate("2024-01-07"), newD) / 7);
                    const updated = {...c, dow: newDow, reschedules: kept};
                    if(c.freq==="biweekly") updated.weekOffset = weekNum % 2;
                    if(c.freq==="triweekly") updated.weekOffset = weekNum % 3;
                    return updated;
                  } else {
                    // For monthly+: use __anchor
                    kept["__anchor"] = reschedDate;
                    return {...c, reschedules: kept};
                  }
                });
                const changed = next.find(c=>c.id===chore.id);
                alert("dow:" + changed?.dow + " weekOffset:" + changed?.weekOffset + " anchor:" + changed?.reschedules?.__anchor);
                setSchedule(next);
                setEditModal(null);
                writeData("schedule", toIdObject(next));
                } catch(e) { alert("Error: " + e.message); }
              }} style={{...primaryBtn, background:"rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.7)"}}>Move this & all future occurrences</button>
            </div>
          </div>
        )}
      </Modal>
    );
  };

  const addChoreRef = useRef(addChore);
  useEffect(() => { addChoreRef.current = addChore; }, [addChore]);

  const AddModal = () => {
    if(!addModal) return null;
    return (
      <Modal onClose={()=>setAddModal(false)}>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:"#f5f0e8",marginBottom:16}}>Add New Task</div>
        <ChoreForm
          initial={{task:"",cats:["Misc"],freq:"weekly",dow:1,timeOfDay:"anytime"}}
          onSave={c=>{
            const newChore = {
              id: uid(),
              task: c.task, cat: c.cat, freq: c.freq, dow: c.dow,
              onceDate: c.onceDate, timeOfDay: c.timeOfDay, nudgeDays: 7,
            };
            const next = [...scheduleRef.current, newChore];
            setSchedule(next);
            setAddModal(false);
                    writeData("schedule", toIdObject(next));
          }}
          showDelete={false}
        />
      </Modal>
    );
  };

  const UserModal = () => {
    if(!userModal) return null;
    const [eu,setEu] = useState(users.map(u=>({...u})));
    return (
      <Modal onClose={()=>setUserModal(false)}>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:"#f5f0e8",marginBottom:16}}>Household Members</div>
        {eu.map((u,i)=>(
          <div key={u.id} style={{display:"flex",gap:8,alignItems:"center",marginBottom:12}}>
            <div style={{display:"flex",gap:3,flexWrap:"wrap",width:64}}>
              {USER_COLORS.map(col=>(
                <div key={col} onClick={()=>{const n=[...eu];n[i]={...n[i],color:col};setEu(n);}} style={{
                  width:14,height:14,borderRadius:"50%",background:col,cursor:"pointer",
                  border:u.color===col?"2px solid white":"2px solid transparent",
                }}/>
              ))}
            </div>
            <input value={u.name} onChange={e=>{const n=[...eu];n[i]={...n[i],name:e.target.value};setEu(n);}} style={{...inputSt,flex:1,padding:"6px 10px",fontSize:13}}/>
            <div style={{width:28,height:28,borderRadius:6,background:u.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#111",fontWeight:900,fontFamily:"monospace"}}>
              {u.name.slice(0,1).toUpperCase()}
            </div>
          </div>
        ))}
        <button onClick={()=>{setUsers(eu);writeData("users",eu);setUserModal(false);}} style={primaryBtn}>Save</button>
      </Modal>
    );
  };

  const CatModal = () => {
    if(!catModal) return null;
    const [editColors, setEditColors] = useState({...catColors});
    const [editCustom, setEditCustom] = useState([...customCats]);
    const [editNames,  setEditNames]  = useState({}); // {oldName: newName}
    const [newCatName, setNewCatName] = useState("");
    const allEditable = [...new Set([...DEFAULT_CATS,...editCustom])].sort();

    const FULL_PALETTE = [
      "#7ECFC0","#F4A261","#C4A882","#B09EE8","#F0A0C0","#7BAFD4",
      "#74C0FC","#9DC97A","#52B788","#F0C850","#90B8D8","#D4A5A5",
      "#D4B84A","#E8C547","#FF8080","#A0C4FF","#BDB2FF","#CAFFBF",
      "#FFD6A5","#FDFFB6","#9BF6FF","#FFB3C6","#FFC8DD","#CDB4DB",
      "#B5EAD7","#E2F0CB","#FFDAC1","#FF9AA2","#C7CEEA","#B5D5C5",
      "#A8DADC","#457B9D","#E63946","#2A9D8F","#E9C46A","#F4A261",
    ];

    const addCat = () => {
      const t = newCatName.trim();
      if(!t||allEditable.includes(t)) return;
      setEditCustom(p=>[...p,t]);
      const idx = allEditable.length % FULL_PALETTE.length;
      setEditColors(p=>({...p,[t]:FULL_PALETTE[idx]}));
      setNewCatName("");
    };
    const deleteCat = (cat) => {
      setEditCustom(p=>p.filter(c=>c!==cat));
      setEditColors(p=>{const n={...p};delete n[cat];return n;});
    };
    const handleSave = () => {
      // Apply renames to schedule tasks and colors
      let newColors = {...editColors};
      let newCustom = [...editCustom];
      let newSchedule = scheduleRef.current;
      Object.entries(editNames).forEach(([oldName, newName]) => {
        const trimmed = newName.trim();
        if(!trimmed || trimmed === oldName) return;
        // Rename in colors
        if(newColors[oldName]) { newColors[trimmed] = newColors[oldName]; delete newColors[oldName]; }
        // Rename in customCats
        newCustom = newCustom.map(c => c===oldName ? trimmed : c);
        // Rename in schedule tasks
        newSchedule = newSchedule.map(c => {
          const cats = getCats(c);
          if(!cats.includes(oldName)) return c;
          const updated = cats.map(x => x===oldName ? trimmed : x);
          return {...c, cat: updated.length===1 ? updated[0] : updated};
        });
      });
      setSchedule(newSchedule);
      writeData("schedule", toIdObject(newSchedule));
      saveCatColors(newColors, newCustom);
    };

    return (
      <Modal onClose={()=>setCatModal(false)}>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:"#f5f0e8",marginBottom:4}}>Manage Categories</div>
        <p style={{fontSize:11,color:"rgba(255,255,255,0.35)",fontFamily:"monospace",marginBottom:16,marginTop:0}}>Edit name, pick color, or delete</p>
        <div style={{maxHeight:"55vh",overflowY:"auto",marginBottom:12}}>
          {allEditable.map(cat=>{
            const col = editColors[cat]||DEFAULT_CAT_COLORS[cat]||"#888";
            const isCustom = !DEFAULT_CATS.includes(cat);
            const displayName = editNames[cat] ?? cat;
            return (
              <div key={cat} style={{marginBottom:12,padding:"8px 10px",background:"rgba(255,255,255,0.03)",borderRadius:8,border:"1px solid rgba(255,255,255,0.06)"}}>
                {/* Name + delete */}
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:7}}>
                  <div style={{width:9,height:9,borderRadius:"50%",background:col,flexShrink:0}}/>
                  <input
                    value={displayName}
                    onChange={e=>setEditNames(p=>({...p,[cat]:e.target.value}))}
                    style={{...inputSt,flex:1,padding:"4px 8px",fontSize:12}}
                  />
                  {isCustom&&(
                    <button onClick={()=>deleteCat(cat)} style={{all:"unset",cursor:"pointer",fontSize:16,color:"rgba(255,100,100,0.5)",padding:"0 4px",flexShrink:0}}>×</button>
                  )}
                </div>
                {/* Color swatches */}
                <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                  {FULL_PALETTE.map(p=>(
                    <div key={p} onClick={()=>setEditColors(prev=>({...prev,[cat]:p}))} style={{
                      width:16,height:16,borderRadius:"50%",background:p,cursor:"pointer",
                      border:col===p?"2px solid white":"1px solid transparent",flexShrink:0,
                    }}/>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {/* Add new category */}
        <div style={{display:"flex",gap:6,marginBottom:14}}>
          <input value={newCatName} onChange={e=>setNewCatName(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&addCat()}
            placeholder="New category name…" style={{...inputSt,flex:1,padding:"6px 10px",fontSize:12}}/>
          <button onClick={addCat} style={{...primaryBtn,padding:"6px 12px",fontSize:11}}>Add</button>
        </div>
        <button onClick={handleSave} style={{...primaryBtn,width:"100%",boxSizing:"border-box"}}>Save</button>
      </Modal>
    );
  };

  const FreqKey = () => (
    <>
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:999}} onClick={()=>setFreqKeyOpen(false)}/>
      <div ref={freqKeyRef} style={{
        position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
        background:"#1e1c1a",border:"1px solid rgba(255,255,255,0.12)",borderRadius:14,
        padding:20,zIndex:1000,minWidth:220,boxShadow:"0 20px 60px rgba(0,0,0,0.6)",
      }}>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,color:"#f5f0e8",marginBottom:12}}>Frequency Key</div>
        {FREQ_OPTIONS.map(f=>(
          <div key={f} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
            <div style={{width:9,height:9,borderRadius:"50%",background:FREQ_COLOR[f]||"#aaa",flexShrink:0}}/>
            <span style={{fontSize:12,color:"rgba(255,255,255,0.65)"}}>{freqDisplayLabel(f)}</span>
          </div>
        ))}
        <button onClick={()=>setFreqKeyOpen(false)} style={{...primaryBtn,marginTop:8,width:"100%",boxSizing:"border-box"}}>Close</button>
      </div>
    </>
  );

  // ── LAYOUT ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight:"100vh",background:"#121110",color:"#f5f0e8",fontFamily:"'DM Sans',sans-serif",
      backgroundImage:"radial-gradient(ellipse at 15% 15%,rgba(244,162,97,0.07) 0%,transparent 55%),radial-gradient(ellipse at 85% 85%,rgba(126,207,192,0.05) 0%,transparent 55%)",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet"/>
      {freqKeyOpen&&<FreqKey/>}
      {editModal&&<><div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:999}} onClick={()=>setEditModal(null)}/><EditModal/></>}
      {addModal &&<><div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:999}} onClick={()=>setAddModal(false)}/><AddModal/></>}
      {userModal&&<><div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:999}} onClick={()=>setUserModal(false)}/><UserModal/></>}
      {catModal &&<><div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:999}} onClick={()=>setCatModal(false)}/><CatModal/></>}

      <div style={{maxWidth:520,margin:"0 auto",padding:"0 16px"}}>
        {/* Header */}
        <div style={{padding:"24px 0 16px",borderBottom:"1px solid rgba(255,255,255,0.07)",marginBottom:18}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"baseline",gap:8}}>
              <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,fontWeight:600}}>Teaco</span>
              <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,color:"#F4A261",fontStyle:"italic"}}>Chores</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              {users.map(u=>(
                <button key={u.id} onClick={()=>setActiveUser(u.id)} style={{
                  all:"unset",cursor:"pointer",width:28,height:28,borderRadius:7,
                  background:u.color,display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:11,color:"#111",fontWeight:900,fontFamily:"monospace",
                  opacity:activeUser===u.id?1:0.35,
                  border:activeUser===u.id?"2px solid white":"2px solid transparent",
                  transition:"all 0.15s",boxSizing:"border-box",
                }}>{u.name.slice(0,1).toUpperCase()}</button>
              ))}
              <button onClick={()=>setUserModal(true)} style={{all:"unset",cursor:"pointer",fontSize:16,color:"rgba(255,255,255,0.3)",padding:"0 4px"}} title="Edit users">⚙</button>
            </div>
          </div>
          <div style={{marginTop:4,fontSize:11,color:"rgba(255,255,255,0.3)",fontFamily:"monospace"}}>
            Checking in as <span style={{color:activeUserObj.color}}>{activeUserObj.name}</span>
            {" · "}{pct===100?"✓ all done today":`${todayPending.length} left today`}
            {!synced&&<span style={{color:"rgba(255,255,255,0.2)",marginLeft:8}}>⟳ connecting…</span>}

          </div>
        </div>

        {/* Nav */}
        <div style={{display:"flex",gap:3,marginBottom:22,background:"rgba(255,255,255,0.04)",borderRadius:11,padding:3}}>
          {[["today","Today"],["calendar","Calendar"],["all","All"]].map(([v,l])=>(
            <button key={v} onClick={()=>setView(v)} style={{
              flex:1,padding:"7px 0",borderRadius:9,fontSize:10,fontFamily:"monospace",
              letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer",border:"none",
              background:view===v?"rgba(244,162,97,0.18)":"transparent",
              color:view===v?"#F4A261":"rgba(255,255,255,0.3)",
              transition:"all 0.18s",fontWeight:view===v?700:400,
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

function Modal({children}) {
  return (
    <div style={{
      position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
      background:"#1e1c1a",border:"1px solid rgba(255,255,255,0.12)",borderRadius:16,
      padding:22,zIndex:1000,width:"min(90vw,420px)",maxHeight:"88vh",overflowY:"auto",
      boxShadow:"0 24px 70px rgba(0,0,0,0.7)",
    }}>
      {children}
    </div>
  );
}
function Field({label,children}) {
  return <label style={{display:"flex",flexDirection:"column",gap:5,fontSize:10,color:"rgba(255,255,255,0.4)",letterSpacing:"0.08em",textTransform:"uppercase",fontFamily:"monospace"}}>{label}{children}</label>;
}
function TabBar({tabs,active,onChange}) {
  return (
    <div style={{display:"flex",gap:4,marginBottom:14,background:"rgba(255,255,255,0.05)",borderRadius:8,padding:3}}>
      {tabs.map(t=>(
        <button key={t} onClick={()=>onChange(t)} style={{
          flex:1,padding:"6px 0",borderRadius:6,fontSize:10,fontFamily:"monospace",
          letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer",border:"none",
          background:active===t?"rgba(244,162,97,0.2)":"transparent",
          color:active===t?"#F4A261":"rgba(255,255,255,0.35)",
        }}>{t}</button>
      ))}
    </div>
  );
}

const inputSt  = {background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,padding:"8px 10px",color:"#f5f0e8",fontSize:13,fontFamily:"'DM Sans',sans-serif",resize:"none",outline:"none",width:"100%",boxSizing:"border-box"};
const selectSt = {background:"#1e1c1a",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,padding:"8px 10px",color:"#f5f0e8",fontSize:13,fontFamily:"'DM Sans',sans-serif",outline:"none",width:"100%",boxSizing:"border-box"};
const primaryBtn = {background:"rgba(244,162,97,0.2)",border:"1px solid rgba(244,162,97,0.4)",borderRadius:8,padding:"9px 16px",color:"#F4A261",fontSize:12,fontFamily:"monospace",letterSpacing:"0.08em",cursor:"pointer",textTransform:"uppercase"};
const dangerBtn  = {background:"rgba(255,100,100,0.1)",border:"1px solid rgba(255,100,100,0.3)",borderRadius:8,padding:"9px 16px",color:"#ff8080",fontSize:12,fontFamily:"monospace",letterSpacing:"0.08em",cursor:"pointer",textTransform:"uppercase"};
const navBtnSt   = {background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.5)",borderRadius:8,padding:"4px 12px",cursor:"pointer",fontSize:20,lineHeight:1};
