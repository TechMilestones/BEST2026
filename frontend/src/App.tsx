import { Routes, Route } from "react-router-dom";
import './App.css'
import DownloadPage from "./pages/DownloadPage/DownloadPage";
import VisualizationPage from "./pages/VisualizationPage/VisualizationPage";
import { VisualizationProvider } from "./context/VisualizationContext";

function App() {
  return (
    <div className="app">
      <VisualizationProvider>
        <Routes>
          <Route path="/" element={<DownloadPage />} />
          <Route path="/visual" element={<VisualizationPage />} />
        </Routes>
      </VisualizationProvider>
    </div>
  )
}

export default App
