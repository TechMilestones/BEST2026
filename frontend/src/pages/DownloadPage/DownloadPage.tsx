import { useState } from "react";
import { useVisualizationContext } from "../../context/VisualizationContext";
import "./DownloadPage.css";
import { useNavigate } from "react-router-dom";

const logApiUrl = import.meta.env.VITE_API_URL || "";

export default function DownloadPage() {
  const { setFlightData, setMetrics } = useVisualizationContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleClick = () => {
    const input = document.getElementById("fileInput") as HTMLInputElement | null;
    input?.click();
  };

  const processFile = async (file: File) => {
    if (!file) return
    setLoading(true)

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        `${logApiUrl}/api/upload-log`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Помилка завантаження");
      }

      const data = await response.json();
      // console.log(data);

      if ("metrics" in data) {
        setMetrics(data.metrics);
      } else {
        console.error("Invalid data format: no metrics found");
        setError("Некоректний формат файлу: метрики не знайдено");
        return;
      }

      if ("visualization_data" in data) {
        setFlightData(data.visualization_data);
      } else {
        console.error("Invalid data format: no visualization data found");
        setError("Некоректний формат файлу: даних для візуалізації не знайдено");
        return;
      }

      navigate("/visual");
    } catch (error) {
      console.error("Error uploading file:", error);
      setError(`${error}`);
    } finally {
      setLoading(false)
    }
  };

  const getData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    if (!selectedFile) return;
    processFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    const droppedFile = e.dataTransfer.files?.[0] || null;
    if (!droppedFile) return;
    processFile(droppedFile);
  };

  return (
    <div className="container">
      <div
        className="drag-and-drop"
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        Перетягніть файл або натисніть, щоб завантажити
      </div>

      <input
        id="fileInput"
        type="file"
        accept=".BIN, .bin"
        className="drag-and-drop_input"
        onChange={getData}
        disabled={loading}
      />

      {error && (<p className="error-message">{error}</p>)}
      

      {loading && (
        <div className="loader-overlay">
          <div className="loader-box">
            <div className="spinner"></div>
            <p>Сервер обробляє лог-файл...</p>
          </div>
        </div>
      )}
    </div>
  );
}
