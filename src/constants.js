export const DEFAULT_CAT_COLORS = {
  Bathroom:"#7ECFC0", Kitchen:"#F4A261", Floors:"#C4A882",
  Bedroom:"#B09EE8", Litter:"#F0A0C0", Misc:"#7BAFD4",
  Windows:"#74C0FC", Shelving:"#9DC97A", Outdoor:"#52B788",
  Pantry:"#F0C850", Laundry:"#90B8D8", Walls:"#D4A5A5", Closet:"#D4B84A",
};

// catColors is now stored in Firebase and passed in at runtime
// Fall back to a palette for new/unknown categories
export const PALETTE = [
  "#7ECFC0","#F4A261","#C4A882","#B09EE8","#F0A0C0","#7BAFD4",
  "#74C0FC","#9DC97A","#52B788","#F0C850","#90B8D8","#D4A5A5",
  "#D4B84A","#E8C547","#FF8080","#A0C4FF","#BDB2FF","#CAFFBF",
];

export function getCatColor(cat, catColors) {
  return (catColors && catColors[cat]) || DEFAULT_CAT_COLORS[cat] || "#888";
}

export const FREQ_COLOR = {
  daily:"#E8C547", "3day":"#F4A261", weekly:"#7ECFC0",
  biweekly:"#9DC97A", triweekly:"#74C0FC", monthly:"#B09EE8",
  "2month":"#F0A0C0", "3month":"#90B8D8", "6month":"#D4B84A",
  annual:"#D4A5A5", "3year":"#aaa", once:"#fff",
};

export const FREQ_LABEL = {
  daily:"Daily", "3day":"Every 3 Days", weekly:"Weekly",
  biweekly:"Every 2 Weeks", triweekly:"Every 3 Weeks", monthly:"Monthly",
  "2month":"Every 2 Months", "3month":"Every 3 Months",
  "6month":"Every 6 Months", annual:"Annually", "3year":"Every 3 Years",
  once:"One-time",
};

export const FREQ_OPTIONS = [
  "once","daily","3day","weekly","biweekly","triweekly",
  "monthly","2month","3month","6month","annual","3year",
];

export const DEFAULT_CATS = [
  "Bathroom","Bedroom","Closet","Floors","Kitchen","Laundry",
  "Litter","Misc","Outdoor","Pantry","Shelving","Walls","Windows",
];

export const CAT_ORDER = [
  "Litter","Kitchen","Bathroom","Bedroom","Floors","Misc",
  "Shelving","Windows","Outdoor","Pantry","Laundry","Walls","Closet",
];

export const TIME_OF_DAY = ["anytime","morning","afternoon","evening"];
export const TIME_LABEL  = { anytime:"Anytime", morning:"Morning", afternoon:"Afternoon", evening:"Evening" };
export const TIME_ICON   = { anytime:"◎", morning:"🌅", afternoon:"☀️", evening:"🌙" };

export const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
export const DAYS_FULL  = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
export const MONTHS     = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export const DEFAULT_USERS = [
  { id:"A", name:"Me",      color:"#F4A261" },
  { id:"B", name:"Partner", color:"#7ECFC0" },
];

export const USER_COLORS = [
  "#F4A261","#7ECFC0","#B09EE8","#F0A0C0","#9DC97A",
  "#74C0FC","#E8C547","#D4A5A5","#FF8080","#A0C4FF",
];
