import React, { useState, useCallback } from "react";
import axios from "axios";

// ErrorMessage component to display structured error feedback
const ErrorMessage = ({ message, details = [] }) => (
  <div
    className="mt-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg"
    role="alert"
  >
    <p className="font-bold">{message}</p>
    {details && details.length > 0 && (
      <ul className="mt-2 list-disc list-inside text-sm">
        {details.map((detail, index) => (
          <li key={index}>{detail}</li>
        ))}
      </ul>
    )}
  </div>
);


function FileUpload() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState({ message: "", details: [] });
  const [successMessage, setSuccessMessage] = useState("");

  const clearMessages = useCallback(() => {
    setError({ message: "", details: [] });
    setSuccessMessage("");
  }, []);

  const validateAndSetFile = useCallback(
    (selectedFile) => {
      clearMessages();
      if (
        selectedFile &&
        (selectedFile.type ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
          selectedFile.type === "application/vnd.ms-excel" ||
          selectedFile.type === "text/csv")
      ) {
        setFile(selectedFile);
      } else {
        setError({
          message:
            "Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.",
        });
        setFile(null);
      }
    },
    [clearMessages]
  );
    // ... (handler functions remain the same)
  const handleFileChange = (e) => {
    validateAndSetFile(e.target.files[0]);
  };

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        validateAndSetFile(e.dataTransfer.files[0]);
      }
    },
    [validateAndSetFile]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleUpload = async () => {
    if (!file) {
      setError({ message: "Please select a file first." });
      return;
    }

    clearMessages();
    setIsUploading(true);

    const formData = new FormData();
    formData.append("excel_file", file);

    try {
      const apiUrl = `${
        import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
      }/api/upload-excel`;
      const response = await axios.post(apiUrl, formData, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: response.headers["content-type"],
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;

      const contentDisposition = response.headers["content-disposition"];
      let fileName = "processed_data.xlsx";
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (fileNameMatch && fileNameMatch.length === 2)
          fileName = fileNameMatch[1];
      }
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setSuccessMessage("File processed and download started!");
      setFile(null);
    } catch (err) {
      let errorData = { message: "An unexpected error occurred.", details: [] };
      if (err.response && err.response.data instanceof Blob) {
        try {
          const errText = await err.response.data.text();
          const errJson = JSON.parse(errText);
          errorData = {
            message: errJson.message || "An error occurred during processing.",
            details: errJson.details || [],
          };
        } catch {
          // The error response was not JSON
        }
      }
      setError(errorData);
    } finally {
      setIsUploading(false);
    }
  };


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg p-4 font-sans">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-lg">
        <h2 className="text-3xl font-bold mb-8 text-center text-text">
          Label Data Organizer
        </h2>
        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors duration-300 ${
            isDragging ? "border-primary bg-bg" : "border-primary"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => document.getElementById("fileInput")?.click()}
        >
          <input
            type="file"
            id="fileInput"
            className="hidden"
            onChange={handleFileChange}
            accept=".xlsx, .xls, .csv"
          />
          <p className="text-text">
            {file
              ? `Selected: ${file.name}`
              : "Drag & drop a file or click to select"}
          </p>
           <p className="text-xs text-text mt-2">
            Accepts .xlsx, .xls, and .csv files.
          </p>
        </div>

        {file && (
          <div className="mt-8 text-center">
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full sm:w-auto px-8 py-3 rounded-lg font-semibold text-white bg-success hover:bg-green-700 disabled:bg-slate-400"
            >
              {isUploading ? "Processing..." : "Upload and Process File"}
            </button>
          </div>
        )}

        {error.message && (
          <ErrorMessage message={error.message} details={error.details} />
        )}

        {successMessage && (
          <p className="mt-6 text-sm text-center font-medium text-success">
            {successMessage}
          </p>
        )}
      </div>
    </div>
  );
}

export default FileUpload;
