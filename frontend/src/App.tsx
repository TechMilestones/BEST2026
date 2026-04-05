import { Routes, Route } from "react-router-dom";
import './App.css'
import DownloadPage from "./pages/DownloadPage/DownloadPage";
import VisualizationPage from "./pages/VisualizationPage/VisualizationPage";
import { VisualizationProvider } from "./context/VisualizationContext";
import NotFoundPage from "./pages/NotFoundPage/NotFoundPage";

function App() {
  if (!window.location.hash) {
    window.location.replace('/#/')
  }

  return (
    <div className="app">
      <VisualizationProvider>
        <Routes>
          <Route path="/" element={<DownloadPage />} />
          <Route path="/visual" element={<VisualizationPage />} />
          <Route path="/*" element ={<NotFoundPage />}/>
        </Routes>
      </VisualizationProvider>
    </div>
  )
}

export default App
