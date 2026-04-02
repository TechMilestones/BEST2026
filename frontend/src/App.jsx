import { Routes, Route } from "react-router-dom";
import './App.css'
import DownloadPage from "./pages/DownloadPage/DownloadPage";
import VisualizationPage from "./pages/VisualizationPage/VisualizationPage";

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<DownloadPage />} />
        <Route path="/visual" element={<VisualizationPage />} />
      </Routes>
    </div>
  )
}

export default App
