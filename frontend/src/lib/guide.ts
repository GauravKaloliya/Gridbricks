export interface GuideStep {
  id: string;
  title: string;
  body: string;
  tip?: string;
  route?: string;
  target?: string;
}

/**
 * The order follows the way a reader would use the app: pick a window, read the
 * summary, audit one hour, study the error, then check the raw rows.
 */
export const GUIDE_STEPS: GuideStep[] = [
  {
    id: "welcome",
    title: "Welcome to Gridbricks",
    body: "Gridbricks shows how close the wind forecast was to the wind that actually arrived. This short guide walks through every page and points at the controls that matter. You can leave at any time with Exit.",
    tip: "About two minutes. The page pauses while the guide is open, and nothing here changes your data.",
  },
  {
    id: "date-range",
    route: "/",
    target: "date-range",
    title: "Choose your dates",
    body: "Use these two boxes to pick the delivery days you want to study. “First 7 days” jumps to the opening week and “Full January” loads the whole month. Every page follows the same window, so you only set it once.",
    tip: "The window is kept in the address bar, so a link always opens the same dates.",
  },
  {
    id: "navigation",
    route: "/",
    target: "primary-nav",
    title: "Four pages, four jobs",
    body: "Overview gives the headline result. Forecast explorer audits one hour in detail. Accuracy analysis studies the size and direction of errors. Data table lists every row and the raw half-hourly readings.",
  },
  {
    id: "theme",
    route: "/",
    target: "theme-trigger",
    title: "Change the look",
    body: "The appearance button switches between Paper, Light, and Dark. Choose the one that is easiest on your eyes. Your choice is saved on this device and reused the next time you visit.",
  },
  {
    id: "overview-kpis",
    route: "/",
    target: "overview-kpis",
    title: "The four headline numbers",
    body: "MAE is the typical miss in megawatts. RMSE punishes the biggest misses more. Mean signed error shows whether the forecast usually ran high or low. Matched coverage tells you how many hours could be scored at all.",
    tip: "Lower MAE and RMSE are better. A positive signed error means the forecast ran above what was delivered.",
  },
  {
    id: "overview-chart",
    route: "/",
    target: "overview-chart",
    title: "Forecast versus what happened",
    body: "The dashed orange line is the forecast that was available at the cutoff. The solid teal line is the wind that was actually generated. Hover a point to see both values and the interval status.",
    tip: "A gap means data was missing. It is never filled with zero.",
  },
  {
    id: "overview-provenance",
    route: "/",
    target: "overview-provenance",
    title: "Where the numbers came from",
    body: "This panel says whether the figures came live from Elexon, from a short-lived cache, or from a stored snapshot. It also shows the retrieval time and any warnings. If something looks wrong, check here first.",
  },
  {
    id: "cutoff",
    route: "/",
    target: "cutoff-method",
    title: "Why 09:30 the day before",
    body: "A forecast only counts if it was published by 09:30 Europe/London on the day before delivery. The most recent eligible version is used. Later revisions are kept for the audit trail but never change the score, which keeps the comparison honest.",
  },
  {
    id: "forecast-selected",
    route: "/forecasts",
    target: "forecast-selected",
    title: "One hour, fully unpacked",
    body: "The explorer studies a single delivery hour. The large figures show the selected forecast, the delivered wind, and the signed error, followed by the exact publication time and the cutoff that applied.",
  },
  {
    id: "forecast-picker",
    route: "/forecasts",
    target: "forecast-picker",
    title: "Pick any hour",
    body: "Choose a day from the menu, then click a time cell. Ochre cells mean the hour could not be fully matched; open one to read the exact reason. The number in each cell is the selected forecast in megawatts.",
  },
  {
    id: "forecast-revisions",
    route: "/forecasts",
    target: "forecast-revisions",
    title: "Every revision, side by side",
    body: "Elexon can publish the same hour more than once. This table lists every version, marks the one that was eligible at the cutoff, and shows the later ones that were not. It is the evidence behind each score.",
  },
  {
    id: "accuracy-chart",
    route: "/accuracy",
    target: "accuracy-chart",
    title: "The size and direction of misses",
    body: "Each bar is one matched hour. Vermilion bars above the line are overforecasts; teal bars below the line are underforecasts. Taller bars mean bigger misses, and hover shows the exact value.",
  },
  {
    id: "decision-support",
    route: "/accuracy",
    target: "decision-support",
    title: "Turning error into reserve cover",
    body: "P90 absolute error is the miss that nine out of ten hours stayed under. The P90 shortfall shows how much extra wind would have covered the forecast in those hours. The table groups accuracy by how far ahead each forecast was published.",
    tip: "Click a large miss to jump straight to that hour in the forecast explorer.",
  },
  {
    id: "accuracy-coverage",
    route: "/accuracy",
    target: "accuracy-coverage",
    title: "How to read the fine print",
    body: "Coverage breaks every candidate hour into matched, missing forecast, missing actual, or invalid. The definitions beside it explain each formula. Unusable hours are excluded, never guessed, so the metrics only describe real pairs.",
  },
  {
    id: "data-tabs",
    route: "/data",
    target: "data-tabs",
    title: "Two levels of detail",
    body: "Switch between hourly analysis intervals and raw half-hourly actuals. The first view is what the scoring uses. The second is the untouched Elexon FUELHH source for the same window.",
  },
  {
    id: "data-table",
    route: "/data",
    target: "data-table",
    title: "Audit every row",
    body: "Each row shows the chosen forecast, when it was published, the delivered generation, the signed and absolute error, and a status with the reason. Previous and Next page through the window; on a phone every row becomes a readable card.",
  },
  {
    id: "data-export",
    route: "/data",
    target: "data-export",
    title: "Take the data with you",
    body: "Export CSV downloads the current window with eleven columns, including publication time and status, ready for Excel or a notebook. It always follows the dates you selected.",
  },
  {
    id: "data-source",
    route: "/data",
    target: "data-source",
    title: "Source and honest limits",
    body: "The source panel repeats the attribution, the hourly-to-half-hourly matching rule, and the disclaimer. Gridbricks measures forecast accuracy only. It contains no prices, demand, or contract data.",
  },
  {
    id: "finish",
    title: "That is the whole tour",
    body: "You now know where every number comes from and how to audit it. The Guide button in the header reopens this tour whenever you like, and the appearance button changes the theme. Start with the Overview, then open the explorer to follow a single hour.",
    tip: "Continue returns you to the overview.",
  },
];
