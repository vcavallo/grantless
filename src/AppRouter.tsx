import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";

import GrantlessBrowse from "./pages/GrantlessBrowse";
import ApplicantProjects from "./pages/ApplicantProjects";
import CuratorContributors from "./pages/CuratorContributors";
import { TaskDetail } from "./pages/TaskDetail";
import About from "./pages/About";
import NotFound from "./pages/NotFound";

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
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
export default AppRouter;