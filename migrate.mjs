import { initializeApp } from "firebase/app";
import { getDatabase, ref, set } from "firebase/database";
import { firebaseConfig, HOUSEHOLD_ID } from "./src/firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const newSchedule = {
  "3yr_1": {
    "cat": "Bedroom",
    "dow": 0,
    "freq": "3year",
    "id": "3yr_1",
    "nudgeDays": 120,
    "task": "Wash comforter"
  },
  "ann_c1": {
    "cat": "Closet",
    "dow": 6,
    "freq": "annual",
    "id": "ann_c1",
    "nudgeDays": 56,
    "task": "Pull everything out of hallway closet & clean floors"
  },
  "ann_c2": {
    "cat": "Closet",
    "dow": 0,
    "freq": "annual",
    "id": "ann_c2",
    "nudgeDays": 77,
    "task": "Go through clothing & donate"
  },
  "ann_c3": {
    "cat": "Closet",
    "dow": 6,
    "freq": "annual",
    "id": "ann_c3",
    "nudgeDays": 84,
    "task": "Reorganize/refold clothing; vacuum closet shelving & drawers"
  },
  "ann_k1": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "annual",
    "id": "ann_k1",
    "lastDone": "2026-02-14",
    "nudgeDays": 7,
    "task": "Clean refrigerator condenser coils"
  },
  "ann_l1": {
    "cat": "Litter",
    "dow": 6,
    "freq": "annual",
    "id": "ann_l1",
    "lastDone": "2025-02-01",
    "nudgeDays": 28,
    "task": "Replace litter box"
  },
  "ann_m1": {
    "cat": "Misc",
    "dow": 6,
    "freq": "annual",
    "id": "ann_m1",
    "nudgeDays": 42,
    "task": "Clean heating vents"
  },
  "ann_w1": {
    "cat": "Walls",
    "dow": 0,
    "freq": "annual",
    "id": "ann_w1",
    "nudgeDays": 70,
    "task": "Dust walls"
  },
  "ann_w2": {
    "cat": "Windows",
    "dow": 0,
    "freq": "annual",
    "id": "ann_w2",
    "nudgeDays": 90,
    "task": "Clean window screens"
  },
  "b2m0a": {
    "cat": "Bathroom",
    "dow": 5,
    "freq": "biweekly",
    "id": "b2m0a",
    "task": "Wipe down outsides of bathroom cabinets/drawers & handles",
    "weekOffset": 0
  },
  "b2m1a": {
    "cat": "Floors",
    "dow": 4,
    "freq": "biweekly",
    "id": "b2m1a",
    "lastDone": "2026-02-07",
    "task": "Dust baseboards (vacuum)",
    "weekOffset": 1
  },
  "b2m1b": {
    "cat": "Floors",
    "dow": 4,
    "freq": "biweekly",
    "id": "b2m1b",
    "task": "Deep clean white area rug (de-lint)",
    "weekOffset": 1
  },
  "b2s0a": {
    "cat": "Shelving",
    "dow": 1,
    "freq": "biweekly",
    "id": "b2s0a",
    "lastDone": "2026-02-06",
    "task": "Deep clean living room cabinet",
    "weekOffset": 0
  },
  "b2s0b": {
    "cat": "Shelving",
    "dow": 2,
    "freq": "biweekly",
    "id": "b2s0b",
    "lastDone": "2026-02-06",
    "task": "Deep clean bedroom shelf & windowsill",
    "weekOffset": 0
  },
  "b2s1a": {
    "cat": "Shelving",
    "dow": 1,
    "freq": "biweekly",
    "id": "b2s1a",
    "task": "Deep clean TV room shelf by window",
    "weekOffset": 1
  },
  "b2s1b": {
    "cat": "Shelving",
    "dow": 2,
    "freq": "biweekly",
    "id": "b2s1b",
    "lastDone": "2026-02-07",
    "task": "Dust shelves & trinkets on TV stand",
    "weekOffset": 1
  },
  "b2s1c": {
    "cat": "Misc",
    "dow": 1,
    "freq": "biweekly",
    "id": "b2s1c",
    "task": "Deep vacuum couch/cushions",
    "weekOffset": 1
  },
  "b2s1d": {
    "cat": "Misc",
    "dow": 2,
    "freq": "biweekly",
    "id": "b2s1d",
    "lastDone": "2026-02-07",
    "task": "Vacuum bar stools & dining chairs",
    "weekOffset": 1
  },
  "b2t0a": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "biweekly",
    "id": "b2t0a",
    "task": "Disinfect kitchen counters w/ dilute vinegar",
    "weekOffset": 0
  },
  "b2t0b": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "biweekly",
    "id": "b2t0b",
    "task": "Moisturize kitchen counters w/ mineral oil",
    "weekOffset": 0
  },
  "b2t0c": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "biweekly",
    "id": "b2t0c",
    "lastDone": "2026-02-04",
    "task": "Clean front of oven & handle; Clean stove dials ",
    "weekOffset": 0
  },
  "b2t0d": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "biweekly",
    "id": "b2t0d",
    "task": "Polish chrome parts of oven & hood",
    "weekOffset": 0
  },
  "b2t1a": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "biweekly",
    "id": "b2t1a",
    "lastDone": "2026-02-17",
    "task": "Clean out fridge & freezer",
    "weekOffset": 1
  },
  "b2t1b": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "biweekly",
    "id": "b2t1b",
    "lastDone": "2026-02-16",
    "task": "Polish exterior of dishwasher",
    "weekOffset": 1
  },
  "b2t1c": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "biweekly",
    "id": "b2t1c",
    "lastDone": "2026-02-10",
    "task": "Polish exterior of kitchen trash can",
    "weekOffset": 1
  },
  "b2t1d": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "biweekly",
    "id": "b2t1d",
    "task": "Wipe kitchen cabinet & drawer doors/handles",
    "weekOffset": 1
  },
  "b2t1e": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "biweekly",
    "id": "b2t1e",
    "task": "Wipe cork coasters; deep clean utensil holder",
    "weekOffset": 1
  },
  "b2th0a": {
    "cat": "Litter",
    "dow": 0,
    "freq": "biweekly",
    "id": "b2th0a",
    "lastDone": "2026-02-19",
    "task": "Replace litter completely",
    "weekOffset": 0
  },
  "b2th0b": {
    "cat": "Litter",
    "dow": 6,
    "freq": "biweekly",
    "id": "b2th0b",
    "lastDone": "2026-02-07",
    "task": "Wash litter box, scoop & holder, and lid",
    "weekOffset": 0
  },
  "b2th1a": {
    "cat": "Outdoor",
    "dow": 6,
    "freq": "biweekly",
    "id": "b2th1a",
    "task": "Sweep deck; dust cobwebs around doors/porch; shake out welcome mat",
    "weekOffset": 1
  },
  "b2th1b": {
    "cat": "Outdoor",
    "dow": 0,
    "freq": "biweekly",
    "id": "b2th1b",
    "task": "Wipe down outdoor chairs & tables",
    "weekOffset": 1
  },
  "c1tk71f": {
    "cat": "Laundry",
    "cats": [
      "Misc"
    ],
    "customDays": "",
    "dow": 1,
    "freq": "once",
    "id": "c1tk71f",
    "nudgeDays": 7,
    "onceDate": "2026-02-21",
    "task": "Wash sheets",
    "timeOfDay": "anytime"
  },
  "d10": {
    "cat": "Kitchen",
    "freq": "daily",
    "id": "d10",
    "task": "Wipe crumbs from kitchen counters"
  },
  "d11": {
    "cat": "Kitchen",
    "freq": "daily",
    "id": "d11",
    "task": "Rinse food from kitchen sink"
  },
  "d12": {
    "cat": "Kitchen",
    "freq": "daily",
    "id": "d12",
    "task": "Wipe crumbs from stove"
  },
  "d13": {
    "cat": "Kitchen",
    "freq": "daily",
    "id": "d13",
    "task": "Rinse out coffee carafe & filter basket"
  },
  "d14": {
    "cat": "Misc",
    "freq": "daily",
    "id": "d14",
    "task": "Pick up clutter"
  },
  "d2": {
    "cat": "Floors",
    "freq": "daily",
    "id": "d2",
    "task": "Sweep kitchen floors & entryway"
  },
  "d3": {
    "cat": "Litter",
    "freq": "daily",
    "id": "d3",
    "task": "Vacuum carpet around litter box"
  },
  "d4": {
    "cat": "Bathroom",
    "freq": "daily",
    "id": "d4",
    "task": "Wipe down bathroom counters & sink"
  },
  "d5": {
    "cat": "Litter",
    "freq": "daily",
    "id": "d5",
    "task": "Wash cat food bowls"
  },
  "d6": {
    "cat": "Litter",
    "freq": "daily",
    "id": "d6",
    "task": "Replace cat water"
  },
  "d7": {
    "cat": "Litter",
    "freq": "daily",
    "id": "d7",
    "task": "Scoop litter"
  },
  "d8": {
    "cat": "Bedroom",
    "freq": "daily",
    "id": "d8",
    "task": "Make bed"
  },
  "d9": {
    "cat": "Misc",
    "freq": "daily",
    "id": "d9",
    "task": "Wipe down dining table"
  },
  "e2m_f1": {
    "cat": "Floors",
    "dow": 0,
    "freq": "2month",
    "id": "e2m_f1",
    "nudgeDays": 21,
    "task": "Deep clean baseboards (scrub)"
  },
  "e2m_f2": {
    "cat": "Floors",
    "dow": 0,
    "freq": "2month",
    "id": "e2m_f2",
    "nudgeDays": 42,
    "task": "Deep clean floor corners (scrub)"
  },
  "e2m_k1": {
    "cat": "Kitchen",
    "dow": 0,
    "freq": "2month",
    "id": "e2m_k1",
    "nudgeDays": 14,
    "task": "Deep clean kitchen trash can interior"
  },
  "e3d1": {
    "cat": "Kitchen",
    "freq": "3day",
    "id": "e3d1",
    "lastDone": "2026-02-18",
    "reschedules": {
      "2026-02-24": "2026-02-21"
    },
    "task": "Disinfect sponge (run through dishwasher)"
  },
  "e3m_b1": {
    "cat": "Bathroom",
    "dow": 5,
    "freq": "3month",
    "id": "e3m_b1",
    "nudgeDays": 14,
    "task": "Deep clean shower tile & grout"
  },
  "e3m_b2": {
    "cat": "Bathroom",
    "dow": 6,
    "freq": "3month",
    "id": "e3m_b2",
    "nudgeDays": 14,
    "task": "Deep clean showerhead"
  },
  "e3m_b3": {
    "cat": "Bathroom",
    "dow": 5,
    "freq": "3month",
    "id": "e3m_b3",
    "nudgeDays": 14,
    "task": "Deep clean tub"
  },
  "e3m_b4": {
    "cat": "Bathroom",
    "dow": 6,
    "freq": "3month",
    "id": "e3m_b4",
    "lastDone": "2026-02-04",
    "nudgeDays": 56,
    "task": "Vacuum shower fan"
  },
  "e3m_b5": {
    "cat": "Bathroom",
    "dow": 5,
    "freq": "3month",
    "id": "e3m_b5",
    "nudgeDays": 35,
    "task": "Deep clean bathroom trash can"
  },
  "e3m_f1": {
    "cat": "Floors",
    "dow": 0,
    "freq": "3month",
    "id": "e3m_f1",
    "nudgeDays": 21,
    "task": "Vacuum/mop under rugs, couch, shoe cabinet, behind mirror, under fridge & stove"
  },
  "e3m_f2": {
    "cat": "Floors",
    "dow": 0,
    "freq": "3month",
    "id": "e3m_f2",
    "nudgeDays": 42,
    "task": "Deep clean green rug (baking soda)"
  },
  "e3m_f3": {
    "cat": "Floors",
    "dow": 0,
    "freq": "3month",
    "id": "e3m_f3",
    "nudgeDays": 63,
    "task": "Deep clean bedroom carpet (baking soda)"
  },
  "e3m_k1": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "3month",
    "id": "e3m_k1",
    "nudgeDays": 35,
    "task": "Deep clean fridge interior & shelving"
  },
  "e3m_k2": {
    "cat": "Kitchen",
    "dow": 0,
    "freq": "3month",
    "id": "e3m_k2",
    "lastDone": "2026-01-15",
    "nudgeDays": 42,
    "task": "Descale coffee maker"
  },
  "e3m_k3": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "3month",
    "id": "e3m_k3",
    "nudgeDays": 14,
    "task": "Wash toaster exterior & crumb tray; clean inner slots"
  },
  "e3m_k4": {
    "cat": "Kitchen",
    "dow": 0,
    "freq": "3month",
    "id": "e3m_k4",
    "nudgeDays": 28,
    "task": "Deep clean cutting boards w/ lemon + salt"
  },
  "e3m_k5": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "3month",
    "id": "e3m_k5",
    "nudgeDays": 28,
    "task": "Wipe down & deep clean stand mixer"
  },
  "e3m_w1": {
    "cat": "Windows",
    "dow": 0,
    "freq": "3month",
    "id": "e3m_w1",
    "nudgeDays": 35,
    "task": "Clean window exteriors (remove cobwebs, wash glass under screens)"
  },
  "e3rrrsj": {
    "cat": "Laundry",
    "cats": [
      "Laundry"
    ],
    "customDays": "",
    "dow": 1,
    "freq": "once",
    "id": "e3rrrsj",
    "nudgeDays": 7,
    "onceDate": "2026-02-21",
    "task": "Hand wash pants",
    "timeOfDay": "anytime"
  },
  "e6m_b1": {
    "cat": "Bathroom",
    "dow": 6,
    "freq": "6month",
    "id": "e6m_b1",
    "lastDone": "2025-08-01",
    "nudgeDays": 7,
    "task": "Replace toilet brush"
  },
  "e6m_b2": {
    "cat": "Bathroom",
    "dow": 5,
    "freq": "6month",
    "id": "e6m_b2",
    "nudgeDays": 35,
    "task": "Vacuum inside bathroom cabinets/drawers & wipe clean"
  },
  "e6m_bd1": {
    "cat": "Bedroom",
    "dow": 0,
    "freq": "6month",
    "id": "e6m_bd1",
    "nudgeDays": 70,
    "task": "Wash mattress protector"
  },
  "e6m_bd2": {
    "cat": "Bedroom",
    "dow": 0,
    "freq": "6month",
    "id": "e6m_bd2",
    "nudgeDays": 77,
    "task": "Baking soda/vacuum mattress"
  },
  "e6m_bd3": {
    "cat": "Bedroom",
    "dow": 0,
    "freq": "6month",
    "id": "e6m_bd3",
    "nudgeDays": 84,
    "task": "Wash inner pillow covers + whole pillows (non-foam)"
  },
  "e6m_c1": {
    "cat": "Closet",
    "dow": 0,
    "freq": "6month",
    "id": "e6m_c1",
    "lastDone": "2026-02-04",
    "nudgeDays": 14,
    "task": "Reorganize hallway closet"
  },
  "e6m_c2": {
    "cat": "Closet",
    "dow": 6,
    "freq": "6month",
    "id": "e6m_c2",
    "nudgeDays": 42,
    "task": "Deep clean shoe cabinet"
  },
  "e6m_k1": {
    "cat": "Kitchen",
    "dow": 0,
    "freq": "6month",
    "id": "e6m_k1",
    "nudgeDays": 56,
    "task": "Clean oven broiler pan & oven interior"
  },
  "e6m_k2": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "6month",
    "id": "e6m_k2",
    "nudgeDays": 63,
    "task": "Run self-cleaning cycle on dishwasher"
  },
  "e6m_k3": {
    "cat": "Kitchen",
    "dow": 0,
    "freq": "6month",
    "id": "e6m_k3",
    "nudgeDays": 70,
    "task": "Deep clean inside kitchen cabinets/drawers"
  },
  "e6m_p1": {
    "cat": "Pantry",
    "dow": 6,
    "freq": "6month",
    "id": "e6m_p1",
    "nudgeDays": 28,
    "task": "Vacuum inside pantry shelving & wipe down"
  },
  "e6m_s1": {
    "cat": "Shelving",
    "dow": 0,
    "freq": "6month",
    "id": "e6m_s1",
    "nudgeDays": 56,
    "task": "Deep clean bookshelves & dust books"
  },
  "giy2zox": {
    "cat": "Misc",
    "dow": 1,
    "freq": "once",
    "id": "giy2zox",
    "nudgeDays": 7,
    "onceDate": "2026-02-22",
    "task": "Clean out mini fridge and move to garage",
    "timeOfDay": "anytime"
  },
  "hrzfwwn": {
    "cat": "Laundry",
    "dow": 1,
    "freq": "once",
    "id": "hrzfwwn",
    "nudgeDays": 7,
    "onceDate": "2026-02-21",
    "task": "Wash and fold towels",
    "timeOfDay": "anytime"
  },
  "mo_bat1": {
    "cat": "Bathroom",
    "dow": 6,
    "freq": "monthly",
    "id": "mo_bat1",
    "lastDone": "2026-02-08",
    "nudgeDays": 7,
    "task": "Wash shower curtain"
  },
  "mo_bat2": {
    "cat": "Bathroom",
    "dow": 5,
    "freq": "monthly",
    "id": "mo_bat2",
    "lastDone": "2025-11-01",
    "nudgeDays": 21,
    "task": "Reorganize/throw out old stuff in bathroom cabinets"
  },
  "mo_bed1": {
    "cat": "Bedroom",
    "dow": 0,
    "freq": "monthly",
    "id": "mo_bed1",
    "nudgeDays": 7,
    "task": "Wash outer pillow covers (foam pillows)"
  },
  "mo_bed2": {
    "cat": "Bedroom",
    "dow": 0,
    "freq": "monthly",
    "id": "mo_bed2",
    "nudgeDays": 21,
    "task": "Run comforter through dryer (20min high + 40min low)"
  },
  "mo_bed3": {
    "cat": "Bedroom",
    "dow": 0,
    "freq": "monthly",
    "id": "mo_bed3",
    "nudgeDays": 14,
    "task": "Wash duvet cover"
  },
  "mo_kit1": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "monthly",
    "id": "mo_kit1",
    "nudgeDays": 21,
    "task": "Deep clean range hood (vent, light covers, removable parts)"
  },
  "mo_kit2": {
    "cat": "Kitchen",
    "dow": 0,
    "freq": "monthly",
    "id": "mo_kit2",
    "nudgeDays": 14,
    "task": "Wipe dishwasher control panel, door edge & gasket; spot clean interior"
  },
  "mo_kit3": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "monthly",
    "id": "mo_kit3",
    "nudgeDays": 14,
    "task": "Clean dishwasher filter"
  },
  "mo_kit4": {
    "cat": "Kitchen",
    "dow": 0,
    "freq": "monthly",
    "id": "mo_kit4",
    "lastDone": "2025-12-01",
    "nudgeDays": 28,
    "task": "Reorganize/tidy kitchen cabinets & drawers"
  },
  "mo_kit5": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "monthly",
    "id": "mo_kit5",
    "nudgeDays": 5,
    "task": "Wipe down silver part of bar"
  },
  "mo_kit6": {
    "cat": "Kitchen",
    "dow": 0,
    "freq": "monthly",
    "id": "mo_kit6",
    "lastDone": "2026-01-15",
    "nudgeDays": 5,
    "task": "Oil & condition cutting boards"
  },
  "mo_lau1": {
    "cat": "Laundry",
    "dow": 0,
    "freq": "monthly",
    "id": "mo_lau1",
    "nudgeDays": 7,
    "task": "Deep clean washer/dryer exterior; run sanitizing cycle"
  },
  "mo_lau2": {
    "cat": "Laundry",
    "dow": 0,
    "freq": "monthly",
    "id": "mo_lau2",
    "nudgeDays": 7,
    "task": "Deep clean lint trap; sweep laundry floor; shake out mat; dust cobwebs"
  },
  "mo_lit1": {
    "cat": "Litter",
    "dow": 0,
    "freq": "monthly",
    "id": "mo_lit1",
    "nudgeDays": 14,
    "task": "Wash cat toys & hair ties"
  },
  "mo_mis1": {
    "cat": "Misc",
    "dow": 0,
    "freq": "monthly",
    "id": "mo_mis1",
    "nudgeDays": 14,
    "task": "Deep clean front door trim & threshold"
  },
  "mo_mis2": {
    "cat": "Misc",
    "dow": 6,
    "freq": "monthly",
    "id": "mo_mis2",
    "lastDone": "2026-02-04",
    "nudgeDays": 21,
    "task": "Dust curtains"
  },
  "mo_mis3": {
    "cat": "Misc",
    "dow": 0,
    "freq": "monthly",
    "id": "mo_mis3",
    "nudgeDays": 7,
    "task": "Wipe down wood frames of barstools & dining chairs"
  },
  "mo_pan1": {
    "cat": "Pantry",
    "dow": 0,
    "freq": "monthly",
    "id": "mo_pan1",
    "lastDone": "2026-02-04",
    "nudgeDays": 7,
    "task": "Organize pantry / throw out old stuff"
  },
  "mo_win1": {
    "cat": "Windows",
    "dow": 0,
    "freq": "monthly",
    "id": "mo_win1",
    "nudgeDays": 10,
    "task": "Clean window tracks & framing"
  },
  "mo_win2": {
    "cat": "Windows",
    "dow": 0,
    "freq": "monthly",
    "id": "mo_win2",
    "nudgeDays": 10,
    "task": "Wash interior window glass"
  },
  "rqkohve": {
    "cat": "Laundry",
    "dow": 1,
    "freq": "once",
    "id": "rqkohve",
    "nudgeDays": 7,
    "onceDate": "2026-02-21",
    "task": "Wash and fold clothes",
    "timeOfDay": "anytime"
  },
  "t3s0": {
    "cat": "Shelving",
    "dow": 1,
    "freq": "triweekly",
    "id": "t3s0",
    "lastDone": "2026-02-07",
    "task": "Dust bookshelves & trinkets",
    "weekOffset": 0
  },
  "t3sa0": {
    "cat": "Misc",
    "dow": 1,
    "freq": "triweekly",
    "id": "t3sa0",
    "lastDone": "2026-02-07",
    "task": "Clear out & dust key/wallet holder by door",
    "weekOffset": 0
  },
  "t3sa1": {
    "cat": "Misc",
    "dow": 2,
    "freq": "triweekly",
    "id": "t3sa1",
    "task": "Clean coasters",
    "weekOffset": 1
  },
  "t3sa2": {
    "cat": "Misc",
    "dow": 1,
    "freq": "triweekly",
    "id": "t3sa2",
    "task": "Wipe down posters/paintings (living room, bathroom, TV room)",
    "weekOffset": 2
  },
  "t3t0a": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "triweekly",
    "id": "t3t0a",
    "lastDone": "2026-02-08",
    "task": "Deep clean dish soap dispenser; replace sponge",
    "weekOffset": 0
  },
  "t3t0b": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "triweekly",
    "id": "t3t0b",
    "lastDone": "2026-02-10",
    "task": "Wipe down top & sides of fridge; polish fridge/freezer doors",
    "weekOffset": 0
  },
  "t3t1a": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "triweekly",
    "id": "t3t1a",
    "task": "Wipe underneath kitchen cabinets",
    "weekOffset": 1
  },
  "t3t1b": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "triweekly",
    "id": "t3t1b",
    "task": "Wipe down kitchen backsplash",
    "weekOffset": 1
  },
  "t3t2a": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "triweekly",
    "id": "t3t2a",
    "task": "Thoroughly wash all removable coffee maker parts",
    "weekOffset": 2
  },
  "wm1": {
    "cat": "Bathroom",
    "dow": 5,
    "freq": "weekly",
    "id": "wm1",
    "lastDone": "2026-02-16",
    "task": "Deep clean toilet (interior & exterior)"
  },
  "wm2": {
    "cat": "Bathroom",
    "dow": 5,
    "freq": "weekly",
    "id": "wm2",
    "lastDone": "2026-02-16",
    "task": "Disinfect toilet brush & holder"
  },
  "wm3": {
    "cat": "Bathroom",
    "dow": 5,
    "freq": "weekly",
    "id": "wm3",
    "task": "Spray/wipe down shower walls & tub"
  },
  "wm4": {
    "cat": "Bathroom",
    "dow": 5,
    "freq": "weekly",
    "id": "wm4",
    "task": "Polish chrome shower fixtures"
  },
  "wm5": {
    "cat": "Bathroom",
    "dow": 5,
    "freq": "weekly",
    "id": "wm5",
    "lastDone": "2026-02-16",
    "task": "Dust bathroom surfaces & all trinkets"
  },
  "wm6": {
    "cat": "Bathroom",
    "dow": 5,
    "freq": "weekly",
    "id": "wm6",
    "lastDone": "2026-02-16",
    "task": "Deep clean bathroom counters"
  },
  "wm7": {
    "cat": "Bathroom",
    "dow": 5,
    "freq": "weekly",
    "id": "wm7",
    "lastDone": "2026-02-16",
    "task": "Deep clean bathroom sink"
  },
  "wm8": {
    "cat": "Bathroom",
    "dow": 5,
    "freq": "weekly",
    "id": "wm8",
    "lastDone": "2026-02-16",
    "task": "Polish bathroom faucet, handle & drain"
  },
  "wm9": {
    "cat": "Bathroom",
    "dow": 5,
    "freq": "weekly",
    "id": "wm9",
    "lastDone": "2026-02-16",
    "task": "Clean bathroom mirrors"
  },
  "ws1": {
    "cat": "Bedroom",
    "dow": 0,
    "freq": "weekly",
    "id": "ws1",
    "lastDone": "2026-02-15",
    "task": "Wash/change bed sheets"
  },
  "ws2": {
    "cat": "Misc",
    "dow": 2,
    "freq": "weekly",
    "id": "ws2",
    "lastDone": "2026-02-16",
    "task": "Dust all lamps"
  },
  "ws3": {
    "cat": "Bedroom",
    "dow": 0,
    "freq": "weekly",
    "id": "ws3",
    "lastDone": "2026-02-16",
    "task": "Wipe down dresser "
  },
  "ws4": {
    "cat": "Bedroom",
    "dow": 0,
    "freq": "weekly",
    "id": "ws4",
    "lastDone": "2026-02-16",
    "task": "Dust jewelry, perfume & bedroom trinkets"
  },
  "ws5": {
    "cat": "Misc",
    "dow": 1,
    "freq": "weekly",
    "id": "ws5",
    "lastDone": "2026-02-16",
    "task": "Wipe down wooden side tables, coffee table books, record player & records"
  },
  "ws6": {
    "cat": "Misc",
    "dow": 2,
    "freq": "weekly",
    "id": "ws6",
    "lastDone": "2026-02-16",
    "task": "Clean mirrors (large + hallway)"
  },
  "ws7": {
    "cat": "Shelving",
    "dow": 2,
    "freq": "weekly",
    "id": "ws7",
    "lastDone": "2026-02-06",
    "task": "Wipe down/vacuum living room cabinet"
  },
  "ws8": {
    "cat": "Shelving",
    "dow": 1,
    "freq": "weekly",
    "id": "ws8",
    "lastDone": "2026-02-06",
    "task": "Wipe down bedroom shelf"
  },
  "ws9": {
    "cat": "Shelving",
    "dow": 2,
    "freq": "weekly",
    "id": "ws9",
    "lastDone": "2026-02-07",
    "task": "Wipe down/dust TV room shelf by window"
  },
  "wsa1": {
    "cat": "Floors",
    "dow": 4,
    "freq": "weekly",
    "id": "wsa1",
    "task": "Thorough vacuum/sweep of whole house"
  },
  "wsa2": {
    "cat": "Floors",
    "dow": 4,
    "freq": "weekly",
    "id": "wsa2",
    "task": "Wet mop tile floors"
  },
  "wsa3": {
    "cat": "Floors",
    "dow": 4,
    "freq": "weekly",
    "id": "wsa3",
    "task": "Wipe down front door threshold"
  },
  "wsa4": {
    "cat": "Windows",
    "dow": 1,
    "freq": "weekly",
    "id": "wsa4",
    "task": "Windex interior window/door glass"
  },
  "wsa5": {
    "cat": "Windows",
    "dow": 2,
    "freq": "weekly",
    "id": "wsa5",
    "task": "Dust window sills"
  },
  "wsa6": {
    "cat": "Litter",
    "dow": 6,
    "freq": "weekly",
    "id": "wsa6",
    "lastDone": "2026-02-19",
    "task": "Top off litter & dust litter box lid/exterior"
  },
  "wsa7": {
    "cat": "Misc",
    "dow": 1,
    "freq": "weekly",
    "id": "wsa7",
    "lastDone": "2026-02-16",
    "task": "Wipe down shoe cabinet & trinkets/vase on top"
  },
  "wsa8": {
    "cat": "Misc",
    "dow": 2,
    "freq": "weekly",
    "id": "wsa8",
    "lastDone": "2026-02-16",
    "task": "Wipe down TV"
  },
  "wsa9": {
    "cat": "Litter",
    "dow": 0,
    "freq": "weekly",
    "id": "wsa9",
    "lastDone": "2026-02-16",
    "task": "Wipe down cat scratcher"
  },
  "wt1": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "weekly",
    "id": "wt1",
    "task": "Scrub kitchen counters w/ baking soda & soap"
  },
  "wt10": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "weekly",
    "id": "wt10",
    "lastDone": "2026-02-08",
    "task": "Wash & dry fruit bowl, wooden stand & spoon rest"
  },
  "wt11": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "weekly",
    "id": "wt11",
    "lastDone": "2026-02-10",
    "task": "Clean microwave interior & exterior; wash plate & disc"
  },
  "wt12": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "weekly",
    "id": "wt12",
    "lastDone": "2026-02-14",
    "task": "Dust/wipe coffee maker exterior"
  },
  "wt13": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "weekly",
    "id": "wt13",
    "task": "Empty toaster crumb tray; wipe toaster exterior & top"
  },
  "wt2": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "weekly",
    "id": "wt2",
    "task": "Treat counter stains w/ lemon + salt"
  },
  "wt3": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "weekly",
    "id": "wt3",
    "lastDone": "2026-02-16",
    "task": "Scrub kitchen sink basin, drain & faucet"
  },
  "wt4": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "weekly",
    "id": "wt4",
    "task": "Run sink drain covers & brushes through dishwasher"
  },
  "wt5": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "weekly",
    "id": "wt5",
    "lastDone": "2026-02-08",
    "task": "Wash sink blue tray; wipe soap & hand soap bottles"
  },
  "wt6": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "weekly",
    "id": "wt6",
    "lastDone": "2026-02-16",
    "task": "Scrub stovetop w/ baking soda & soap"
  },
  "wt7": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "weekly",
    "id": "wt7",
    "lastDone": "2026-02-04",
    "task": "Wipe stove control panel, top & front edges"
  },
  "wt8": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "weekly",
    "id": "wt8",
    "lastDone": "2026-02-04",
    "task": "Wipe down range hood exterior"
  },
  "wt9": {
    "cat": "Kitchen",
    "dow": 6,
    "freq": "weekly",
    "id": "wt9",
    "lastDone": "2026-02-08",
    "task": "Dust kitchen lamp, salt pig, utensil holder, oils, coffee jar, mortar & pestle"
  }
};

console.log("Writing", Object.keys(newSchedule).length, "tasks to Firebase...");
set(ref(db, `households/${HOUSEHOLD_ID}/schedule`), newSchedule)
  .then(() => { console.log("✓ Migration complete!"); process.exit(0); })
  .catch(e => { console.error("✗ Error:", e.message); process.exit(1); });
