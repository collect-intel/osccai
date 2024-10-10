import React, { useState, useCallback, useRef } from "react";
import { FaSpinner, FaCloudUploadAlt } from "react-icons/fa";

interface SingleFileUploaderProps {
  onUploadSuccess: (file: { name: string; url: string }) => void;
  onUploadError: (error: string) => void;
  maxFileSize?: number;
  validTypes?: string[];
  label?: string;
  name?: string;
  initialFile?: { name: string; url: string };
  renderPreview: (
    file: { name: string; url: string },
    onReplace: () => void,
  ) => React.ReactNode;
}

const SingleFileUploader: React.FC<SingleFileUploaderProps> = ({
  onUploadSuccess,
  onUploadError,
  maxFileSize = 5 * 1024 * 1024, // 5 MB
  validTypes = [],
  label = "Drop or click to add a file",
  name,
  initialFile,
  renderPreview,
}) => {
  const [file, setFile] = useState<{ name: string; url: string } | null>(
    initialFile || null,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(
    async (uploadFile: File) => {
      if (
        uploadFile.size > maxFileSize ||
        (validTypes.length && !validTypes.includes(uploadFile.type))
      ) {
        onUploadError("Invalid file type or size");
        return;
      }

      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", uploadFile);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const result = await response.json();
        setFile(result);
        onUploadSuccess(result);
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
      const droppedFile = event.dataTransfer.files[0];
      if (droppedFile) {
        handleFileUpload(droppedFile);
      }
    },
    [handleFileUpload],
  );

  const onClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0];
      if (selectedFile) {
        handleFileUpload(selectedFile);
      }
    },
    [handleFileUpload],
  );

  const handleReplace = useCallback(() => {
    setFile(null);
    onClick();
  }, [onClick]);

  return (
    <div className="single-file-uploader w-full">
      {file ? (
        renderPreview(file, handleReplace)
      ) : (
        <div
          className={`mt-1 flex flex-col items-center justify-center px-6 py-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-teal-500 transition-colors ${
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
      )}
    </div>
  );
};

export default SingleFileUploader;
