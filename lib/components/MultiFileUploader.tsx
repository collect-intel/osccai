import React, { useState, useCallback, useRef } from "react";
import { FaSpinner, FaCloudUploadAlt, FaTrash } from "react-icons/fa";

interface MultiFileUploaderProps {
  onUploadSuccess: (files: { name: string; url: string }[]) => void;
  onUploadError: (error: string) => void;
  maxFileSize?: number;
  validTypes?: string[];
  label?: string;
  name?: string;
  maxFiles?: number;
}

const MultiFileUploader: React.FC<MultiFileUploaderProps> = ({
  onUploadSuccess,
  onUploadError,
  maxFileSize = 5 * 1024 * 1024, // 5 MB
  validTypes = [],
  label = "Drop or click to add files",
  name,
  maxFiles = Infinity,
}) => {
  const [files, setFiles] = useState<{ name: string; url: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(
    async (uploadFiles: File[]) => {
      if (files.length + uploadFiles.length > maxFiles) {
        onUploadError(`You can only upload a maximum of ${maxFiles} files`);
        return;
      }

      setIsUploading(true);

      const newFiles: { name: string; url: string }[] = [];

      for (const file of uploadFiles) {
        if (
          file.size > maxFileSize ||
          (validTypes.length && !validTypes.includes(file.type))
        ) {
          onUploadError(`Invalid file type or size: ${file.name}`);
          continue;
        }

        try {
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error("Upload failed");
          }

          const result = await response.json();
          newFiles.push(result);
        } catch (error) {
          onUploadError(`Upload failed for ${file.name}`);
        }
      }

      setFiles((prevFiles) => [...prevFiles, ...newFiles]);
      onUploadSuccess(newFiles);
      setIsUploading(false);
    },
    [files, maxFiles, maxFileSize, validTypes, onUploadSuccess, onUploadError],
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      const droppedFiles = Array.from(event.dataTransfer.files);
      handleFileUpload(droppedFiles);
    },
    [handleFileUpload],
  );

  const onClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(event.target.files || []);
      handleFileUpload(selectedFiles);
    },
    [handleFileUpload],
  );

  const handleDelete = useCallback((index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  }, []);

  return (
    <div className="multi-file-uploader">
      <div
        className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-teal-500 transition-colors ${
          isDragging ? "border-teal-500" : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={onClick}
      >
        <div className="space-y-1 text-center">
          {isUploading ? (
            <FaSpinner className="mx-auto h-12 w-12 text-gray-400 animate-spin" />
          ) : (
            <FaCloudUploadAlt className="mx-auto h-12 w-12 text-gray-400" />
          )}
          <div className="flex text-sm text-gray-600">
            <label className="relative cursor-pointer bg-white rounded-md font-medium text-teal-600 hover:text-teal-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-teal-500">
              <span>{isUploading ? "Uploading..." : label}</span>
              <input
                type="file"
                ref={fileInputRef}
                className="sr-only"
                onChange={onChange}
                multiple
                accept={validTypes.join(",")}
                name={name}
                disabled={isUploading}
              />
            </label>
          </div>
          <p className="text-xs text-gray-500">
            {validTypes.length > 0
              ? `${validTypes.join(", ")} up to ${maxFileSize / (1024 * 1024)}MB each`
              : `Up to ${maxFileSize / (1024 * 1024)}MB each`}
          </p>
        </div>
      </div>
      {files.length > 0 && (
        <ul className="mt-4 space-y-2">
          {files.map((file, index) => (
            <li key={index} className="flex items-center justify-between">
              <span className="truncate">{file.name}</span>
              <button
                onClick={() => handleDelete(index)}
                className="text-red-500 hover:text-red-700"
              >
                <FaTrash />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MultiFileUploader;
