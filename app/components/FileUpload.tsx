
import React from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { FormLabel } from "../components/ui/form";
import { Upload } from "lucide-react";

interface FileUploadProps {
  onUpload: (file: File) => void;
  label?: string;
  multiple?: boolean;
  accept?: string;
  id: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onUpload,
  label,
  multiple = false,
  accept = "image/*",
  id,
}) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      if (multiple) {
        Array.from(event.target.files).forEach((file) => onUpload(file));
      } else {
        onUpload(event.target.files[0]);
      }
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Input
        type="file"
        id={id}
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
        accept={accept}
      />
      <label
        htmlFor={id}
        className="flex items-center text-black gap-2 w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium"
      >
        <Upload className="h-4 w-4" />
        {label || "Upload File"}
      </label>
    </div>
  );
};

export default FileUpload;
