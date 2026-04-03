import { useState } from "react";
import "./DownloadPage.css";
import { useNavigate } from "react-router-dom";

export default function DownloadPage() {
  const [file, setFile] = useState(null);
  const navigate = useNavigate();

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleClick = () => {
    document.getElementById("fileInput").click();
  };

  const processFile = (file) => {
    if (!file) return;

    setFile(file);
    console.log(file.name);
    navigate('/visual');
  };

  // in future it will be deleted, now just to show that works
  const getData = (e) => {
    const selectedFile = e.target.files[0];
    processFile(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();

    const droppedFile = e.dataTransfer.files[0];
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
        {!file && (
          "Drop file here or click to upload"
        )}
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