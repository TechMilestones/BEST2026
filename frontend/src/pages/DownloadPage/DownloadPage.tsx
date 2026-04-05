import { useVisualizationContext } from "../../context/VisualizationContext";
import "./DownloadPage.css";
import { useNavigate } from "react-router-dom";

const logApiUrl = import.meta.env.VITE_API_URL || "";

export default function DownloadPage() {
  const { setFlightData, setMetrics } = useVisualizationContext();
  const navigate = useNavigate();

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleClick = () => {
    const input = document.getElementById("fileInput") as HTMLInputElement | null;
    input?.click();
  };

  const processFile = async (file: File) => {
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
        throw new Error("Upload failed");
      }

      const data = await response.json();
      console.log(data);

      if ("metrics" in data) {
        setMetrics(data.metrics);
      } else {
        console.error("Invalid data format: no metrics found");
        return;
      }

      if ("visualization_data" in data) {
        setFlightData(data.visualization_data);
      } else {
        console.error("Invalid data format: no visualization data found");
        return;
      }

      navigate("/visual");
    } catch (error) {
      console.error("Error uploading file:", error);
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
        Drop file here or click to upload
      </div>

      <input
        id="fileInput"
        type="file"
        accept=".BIN"
        className="drag-and-drop_input"
        onChange={getData}
      />
    </div>
  );
}
