import { lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import NotFound from "./pages/NotFound";

// Lazy-load route pages so the initial download isn't the whole app — each page
// (and its heavier deps) splits into its own chunk, fetched on demand. NotFound is
// tiny and the catch-all, so it stays eager.
const GrantlessBrowse = lazy(() => import("./pages/GrantlessBrowse"));
const ApplicantProjects = lazy(() => import("./pages/ApplicantProjects"));
const CuratorContributors = lazy(() => import("./pages/CuratorContributors"));
const TaskDetail = lazy(() => import("./pages/TaskDetail").then((m) => ({ default: m.TaskDetail })));
const About = lazy(() => import("./pages/About"));
const OperatorPanel = lazy(() => import("./pages/OperatorPanel"));

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<GrantlessBrowse />} />
        <Route path="/c/:npub" element={<GrantlessBrowse />} />
        <Route path="/c/:npub/contributors" element={<CuratorContributors />} />
        <Route path="/p/:npub" element={<ApplicantProjects />} />
        <Route path="/task/:nip19" element={<TaskDetail />} />
        <Route path="/about" element={<About />} />
        <Route path="/admin" element={<OperatorPanel />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
export default AppRouter;
