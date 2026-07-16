import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import ProjectsPage from "./pages/ProjectsPage";
import DesignStudio from "./pages/DesignStudio";
import ScannerPage from "./pages/ScannerPage";
import "./index.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/design" element={<DesignStudio />} />
      <Route path="/scanner" element={<ScannerPage />} />
    </Routes>
  );
}

export default App;