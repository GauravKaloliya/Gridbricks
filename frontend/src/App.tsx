import { lazy } from "react";
import { Link, Route, Routes } from "react-router-dom";

import { DateRangeProvider } from "./components/DateRangeContext";
import { Layout } from "./components/Layout";

const OverviewPage = lazy(() =>
  import("./pages/OverviewPage").then((module) => ({
    default: module.OverviewPage,
  })),
);
const ForecastExplorerPage = lazy(() =>
  import("./pages/ForecastExplorerPage").then((module) => ({
    default: module.ForecastExplorerPage,
  })),
);
const AccuracyPage = lazy(() =>
  import("./pages/AccuracyPage").then((module) => ({
    default: module.AccuracyPage,
  })),
);
const DataPage = lazy(() =>
  import("./pages/DataPage").then((module) => ({
    default: module.DataPage,
  })),
);

function NotFoundPage() {
  return (
    <div className="mx-auto mt-10 max-w-xl border-t-2 border-ink pt-6 text-center">
      <p className="kicker">Error 404</p>
      <p className="mt-6 font-serif text-[96px] leading-none tracking-[-0.05em] text-ink">
        404
      </p>
      <h1 className="mt-4 font-serif text-[26px] leading-tight tracking-[-0.02em] text-ink">
        Page not found
      </h1>
      <p className="mx-auto mt-3 max-w-md text-[12px] leading-6 text-ink-soft">
        The page you requested does not exist. Return to the forecast overview
        to continue.
      </p>
      <Link to="/" className="btn-primary mt-6">
        Back to overview
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <DateRangeProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<OverviewPage />} />
          <Route path="forecasts" element={<ForecastExplorerPage />} />
          <Route path="accuracy" element={<AccuracyPage />} />
          <Route path="data" element={<DataPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </DateRangeProvider>
  );
}
