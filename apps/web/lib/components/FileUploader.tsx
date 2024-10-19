import React, { useState, useCallback, useRef } from "react";
import {
  FaSpinner,
  FaExclamationCircle,
  FaCloudUploadAlt,
} from "react-icons/fa";

interface FileUploaderProps {
  onUploadSuccess: (files: UploadedFile[]) => void;
  onUploadError: (error: string) => void;
  maxFileSize?: number;
  validTypes?: string[];
  allowMultiple?: boolean;
  label?: string;
  name?: string;
}

interface UploadedFile {
  name: string;
  url: string;
}

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const FileUploader: React.FC<FileUploaderProps> = ({
  onUploadSuccess,
  onUploadError,
  maxFileSize = DEFAULT_MAX_SIZE,
  validTypes = [],
  allowMultiple = false,
  label = "Drop or click to add a file here",
  name,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      const file = files[0]; // We only handle the first file for single file uploads

      if (
        file.size > maxFileSize ||
        (validTypes.length && !validTypes.includes(file.type))
      ) {
        onUploadError("Invalid file type or size");
        return;
      }

      setIsUploading(true);

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
        onUploadSuccess([{ name: result.name, url: result.url }]);
      } catch (error) {
        onUploadError("Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [maxFileSize, validTypes, onUploadSuccess, onUploadError],
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      const files = Array.from(event.dataTransfer.files);
      handleFileUpload(files);
    },
    [handleFileUpload],
  );

  const onClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      handleFileUpload(files);
    },
    [handleFileUpload],
  );

  return (
    <div className="file-uploader">
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
                multiple={allowMultiple}
                accept={validTypes.join(",")}
                name={name}
                disabled={isUploading}
              />
            </label>
          </div>
          <p className="text-xs text-gray-500">
            {validTypes.length > 0
              ? `${validTypes.join(", ")} up to ${maxFileSize / (1024 * 1024)}MB`
              : `Up to ${maxFileSize / (1024 * 1024)}MB`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FileUploader;
