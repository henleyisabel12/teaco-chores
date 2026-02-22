import { EPOCH_STR } from "./schedule";

export const EPOCH = parseDate(EPOCH_STR);

export function daysBetween(a, b) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}
export function parseDate(s) {
  if (!s) return null;
  const d = new Date(s + "T12:00:00");
  d.setHours(0, 0, 0, 0);
  return d;
}
export function dateStr(d) {
  return d.toISOString().split("T")[0];
}
export function freqInterval(freq) {
  // Built-in presets
  const presets = {
    daily:1, "3day":3, weekly:7, biweekly:14, triweekly:21,
    monthly:30, "2month":60, "3month":91, "6month":182,
    annual:365, "3year":1095, once:0,
  };
  if (presets[freq] !== undefined) return presets[freq];
  // Custom frequency: stored as "custom:N" where N = number of days
  if (typeof freq === "string" && freq.startsWith("custom:")) {
    return parseInt(freq.split(":")[1], 10) || 7;
  }
  return 7;
}
export function freqDisplayLabel(freq) {
  const labels = {
    daily:"Daily", "3day":"Every 3 Days", weekly:"Weekly",
    biweekly:"Every 2 Weeks", triweekly:"Every 3 Weeks", monthly:"Monthly",
    "2month":"Every 2 Months", "3month":"Every 3 Months",
    "6month":"Every 6 Months", annual:"Annually", "3year":"Every 3 Years",
    once:"One-time",
  };
  if (labels[freq]) return labels[freq];
  if (typeof freq === "string" && freq.startsWith("custom:")) {
    const n = parseInt(freq.split(":")[1], 10);
    return `Every ${n} day${n===1?"":"s"}`;
  }
  return freq;
}
export function uid() {
  return Math.random().toString(36).slice(2, 9);
}
export function todayDate() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Core scheduling logic ─────────────────────────────────────────────────────

export function choreIsOnDate(chore, date, completions) {
  // One-time task: only show on its scheduled date
  if (chore.freq === "once") {
    const due = parseDate(chore.onceDate);
    return due && due.getTime() === date.getTime();
  }

  if (chore.freq === "daily") return true;

  const interval = freqInterval(chore.freq);
  const lastDoneStr = completions[chore.id]?.date || chore.lastDone;
  const lastDone = parseDate(lastDoneStr);

  // Manual reschedule for this period
  const pk = getPeriodKey(chore, date, completions);
  if (chore.reschedules?.[pk]) {
    const rd = parseDate(chore.reschedules[pk]);
    return rd && rd.getTime() === date.getTime();
  }

  if (chore.freq === "3day") {
    const base = lastDone ? addDays(lastDone, 3) : addDays(EPOCH, 0);
    return base.getTime() === date.getTime();
  }

  if (["weekly","biweekly","triweekly"].includes(chore.freq)) {
    const dow = chore.dow ?? 0;
    if (date.getDay() !== dow) return false;
    const weekNum = Math.floor(daysBetween(EPOCH, date) / 7);
    if (chore.freq === "biweekly" && weekNum % 2 !== (chore.weekOffset ?? 0)) return false;
    if (chore.freq === "triweekly" && weekNum % 3 !== (chore.weekOffset ?? 0)) return false;
    if (lastDone) return daysBetween(lastDone, date) >= interval - 1;
    return date >= EPOCH;
  }

  // monthly+, custom:N
  const nudge = chore.nudgeDays ?? 14;
  const firstDue = lastDone ? addDays(lastDone, interval) : addDays(EPOCH, nudge);
  if (firstDue > date) return false;
  return daysBetween(firstDue, date) % interval === 0;
}

export function getPeriodKey(chore, date, completions) {
  if (chore.freq === "once") return chore.onceDate || dateStr(date);
  const interval = freqInterval(chore.freq);
  const lastDoneStr = completions[chore.id]?.date || chore.lastDone;
  const lastDone = parseDate(lastDoneStr);
  const nudge = chore.nudgeDays ?? 14;
  let firstDue;
  if (chore.freq === "3day") {
    firstDue = lastDone ? addDays(lastDone, 3) : addDays(EPOCH, 0);
  } else if (["weekly","biweekly","triweekly"].includes(chore.freq)) {
    const dow = chore.dow ?? 0;
    const diff = ((dow - EPOCH.getDay()) + 7) % 7;
    firstDue = addDays(EPOCH, diff);
  } else {
    firstDue = lastDone ? addDays(lastDone, interval) : addDays(EPOCH, nudge);
  }
  if (firstDue > date) return dateStr(firstDue);
  const idx = Math.floor(daysBetween(firstDue, date) / interval);
  return dateStr(addDays(firstDue, idx * interval));
}

export function getChoresForDate(schedule, date, completions) {
  return schedule.filter(c => choreIsOnDate(c, date, completions));
}

export function isCompletedOnDate(chore, date, completions) {
  const c = completions[chore.id];
  if (!c) return false;
  const d = parseDate(c.date);
  if (!d) return false;
  if (chore.freq === "daily") return d.getTime() === date.getTime();
  if (chore.freq === "once") return d.getTime() === date.getTime();
  const interval = freqInterval(chore.freq);
  return d >= addDays(date, -(interval - 1)) && d <= date;
}

export function getNextDueDays(chore, completions) {
  const today = todayDate();
  if (chore.freq === "daily") return 0;
  if (chore.freq === "once") {
    const due = parseDate(chore.onceDate);
    if (!due) return 0;
    return Math.max(0, daysBetween(today, due));
  }
  const interval = freqInterval(chore.freq);
  const lastDoneStr = completions[chore.id]?.date || chore.lastDone;
  const lastDone = parseDate(lastDoneStr);

  if (chore.freq === "3day") {
    const base = lastDone ? addDays(lastDone, 3) : addDays(EPOCH, 0);
    return Math.max(0, daysBetween(today, base));
  }
  if (["weekly","biweekly","triweekly"].includes(chore.freq)) {
    for (let i = 0; i <= interval * 2; i++) {
      const d = addDays(today, i);
      if (d.getDay() === (chore.dow ?? 0)) {
        const wn = Math.floor(daysBetween(EPOCH, d) / 7);
        let ok = true;
        if (chore.freq === "biweekly" && wn % 2 !== (chore.weekOffset ?? 0)) ok = false;
        if (chore.freq === "triweekly" && wn % 3 !== (chore.weekOffset ?? 0)) ok = false;
        if (ok && (!lastDone || daysBetween(lastDone, d) >= interval - 1)) return i;
      }
    }
    return interval;
  }
  const nudge = chore.nudgeDays ?? 14;
  const firstDue = lastDone ? addDays(lastDone, interval) : addDays(EPOCH, nudge);
  if (firstDue <= today) return 0;
  return daysBetween(today, firstDue);
}

// Returns cats as array — handles both string (legacy) and array (new multi-cat)
export function getCats(chore) {
  if (!chore.cat) return ["Misc"];
  if (Array.isArray(chore.cat)) return chore.cat;
  return [chore.cat];
}
