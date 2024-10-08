import React from 'react';
import SingleFileUploader from './SingleFileUploader';

interface LogoUploaderProps {
  onLogoUpload: (file: { name: string; url: string } | null) => void;
  onUploadError: (error: string) => void;
  initialLogo?: string | null;
}

const LogoUploader: React.FC<LogoUploaderProps> = ({ onLogoUpload, onUploadError, initialLogo }) => {
  const renderPreview = (file: { name: string; url: string }, onReplace: () => void) => (
    <div className="w-full">
      <div className="relative w-32 h-32 border rounded-md overflow-hidden">
        <img 
          src={file.url} 
          alt={file.name} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <button
            onClick={onReplace}
            className="bg-white text-gray-800 px-2 py-1 rounded-md text-sm"
          >
            Replace
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <SingleFileUploader
      onUploadSuccess={onLogoUpload}
      onUploadError={onUploadError}
      maxFileSize={1024 * 1024} // 1MB
      validTypes={['image/jpeg', 'image/png', 'image/gif']}
      label="Drop or click to upload your community logo"
      name="logo"
      initialFile={initialLogo ? { name: 'Current Logo', url: initialLogo } : undefined}
      renderPreview={renderPreview}
    />
  );
};

export default LogoUploader;