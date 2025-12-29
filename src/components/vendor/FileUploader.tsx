"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileText, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface FileUploaderProps {
  onUpload: (url: string) => void;
  accept?: Record<string, string[]>;
  label: string;
  maxSize?: number;
}

export function FileUploader({ 
  onUpload, 
  accept = { "image/*": [".jpeg", ".png", ".jpg"], "application/pdf": [".pdf"] },
  label,
  maxSize = 5 * 1024 * 1024 // 5MB
}: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > maxSize) {
      toast.error("File size too large. Max 5MB allowed.");
      return;
    }

    try {
      setIsUploading(true);
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase client not available");

      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `vendor-docs/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from("vendor-assets")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("vendor-assets")
        .getPublicUrl(filePath);

      setFileUrl(publicUrl);
      onUpload(publicUrl);
      toast.success("File uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  }, [onUpload, maxSize]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: 1,
  });

  if (fileUrl) {
    return (
      <div className="relative flex items-center justify-between p-3 border rounded-lg bg-secondary/20">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium truncate max-w-[200px]">Document Uploaded</span>
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8" 
          onClick={() => setFileUrl(null)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div 
      {...getRootProps()} 
      className={`
        border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer
        flex flex-col items-center justify-center gap-2
        ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"}
        ${isUploading ? "pointer-events-none opacity-50" : ""}
      `}
    >
      <input {...getInputProps()} />
      {isUploading ? (
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      ) : (
        <Upload className={`w-8 h-8 ${isDragActive ? "text-primary" : "text-muted-foreground"}`} />
      )}
      <div className="text-center">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {isDragActive ? "Drop here" : "Click or drag to upload"}
        </p>
      </div>
    </div>
  );
}
