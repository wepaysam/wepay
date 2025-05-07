
import React from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { FormLabel } from "../components/ui/form";
import { Upload } from "lucide-react";

interface FileUploadProps {
  id: string;
  label: string;
  file: File | null;
  setFile: (file: File | null) => void;
  accept?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  id,
  label,
  file,
  setFile,
  accept = "image/*, application/pdf",
}) => {
  return (
    <div className="space-y-2">
      <FormLabel htmlFor={id}>{label}</FormLabel>
      <div className="flex items-center gap-2">
        <Input
          type="file"
          id={id}
          className="hidden"
          accept={accept}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              setFile(e.target.files[0]);
            }
          }}
        />
        <label
          htmlFor={id}
          className="flex items-center gap-2 w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium"
        >
          <Upload className="h-4 w-4" />
          {file ? file.name : `Upload ${label}`}
        </label>
        {file && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setFile(null)}
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
