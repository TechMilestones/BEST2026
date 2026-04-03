import { useState } from "react";
import "./DownloadPage.css";
import { useNavigate } from "react-router-dom";

export default function DownloadPage() {
  const [file, setFile] = useState<File | null>(null);
  const navigate = useNavigate();

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleClick = () => {
    const input = document.getElementById("fileInput") as HTMLInputElement | null;
    input?.click();
  };

  const processFile = (file: File | null) => {
    if (!file) return;

    setFile(file);
    console.log(file.name);
    navigate('/visual');
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
        {!file && "Drop file here or click to upload"}
      </div>

      <input
        id="fileInput"
        type="file"
        className="drag-and-drop_input"
        onChange={getData}
      />
    </div>
  );
}