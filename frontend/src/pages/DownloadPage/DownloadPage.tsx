import "./DownloadPage.css";
import { useNavigate } from "react-router-dom";

export default function DownloadPage() {
  const navigate = useNavigate();

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleClick = () => {
    const input = document.getElementById("fileInput") as HTMLInputElement | null;
    input?.click();
  };

  const processFile = async (file: File | null) => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        `/upload-log?file_name=${encodeURIComponent(file.name)}`,
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

      navigate("/visual");
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  const getData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    processFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    const droppedFile = e.dataTransfer.files?.[0] || null;
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
        {"Drop file here or click to upload"}
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