"use client";

import { useState } from "react";
import { Upload, X, Image as ImageIcon, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Image from "next/image";
import { logger } from "@/lib/utils/logger";
import { appConfig } from "@/lib/config/app";

interface MockupUploaderProps {
  orderId: string;
  productId: string;
  productName: string;
  onUpload: (urls: string[]) => void;
  initialUrls?: string[];
}

export function MockupUploader({ 
  orderId, 
  productId, 
  productName, 
  onUpload,
  initialUrls = []
}: MockupUploaderProps) {
  const [images, setImages] = useState<string[]>(initialUrls);
  const [isUploading, setIsUploading] = useState(false);
  const uploadConfig = appConfig.uploads.mockupImage;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error("Supabase client not available");

      const newUrls: string[] = [...images];

      for (const file of Array.from(files)) {
        // Validate file size
        if (file.size > uploadConfig.maxSize) {
          toast.error(`File too large`, `Maximum size is ${uploadConfig.maxSize / (1024 * 1024)}MB`);
          continue;
        }

        // Validate file type
        const fileExt = file.name.split(".").pop()?.toLowerCase();
        const fileType = file.type;
        
        const isValidType = uploadConfig.allowedTypes.includes(fileType) || 
                           (fileExt && uploadConfig.allowedExtensions.includes(`.${fileExt}`));
        
        if (!isValidType) {
          toast.error(`Invalid file type`, `Only ${uploadConfig.allowedExtensions.join(', ')} files are allowed`);
          continue;
        }
        const fileName = `${orderId}/${productId}/${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `mockups/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("order-assets")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("order-assets")
          .getPublicUrl(filePath);

        newUrls.push(publicUrl);
      }

      setImages(newUrls);
      onUpload(newUrls);
      toast.success("Images uploaded successfully");
    } catch (error) {
      logger.error("[MockupUploader] Upload error", error);
      toast.error("Failed to upload images");
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const newUrls = images.filter((_, i) => i !== index);
    setImages(newUrls);
    onUpload(newUrls);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{productName}</p>
        <p className="text-xs text-muted-foreground">
          {images.length}/5 images • Max {uploadConfig.maxSize / (1024 * 1024)}MB each
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {images.map((url, index) => (
          <div key={url} className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
            <Image 
              src={url} 
              alt="Mockup" 
              fill 
              className="object-cover"
            />
            <button 
              onClick={() => removeImage(index)}
              className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        
        {images.length < 5 && (
          <label className={`
            aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-primary/5 transition-colors
            ${isUploading ? "opacity-50 pointer-events-none" : ""}
          `}>
            <input 
              type="file" 
              multiple 
              accept={appConfig.uploads.mockupImage.allowedExtensions.join(',')} 
              className="hidden" 
              onChange={handleUpload} 
              disabled={isUploading}
            />
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            ) : (
              <>
                <Plus className="w-5 h-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground mt-1">Add Photo</span>
              </>
            )}
          </label>
        )}
      </div>
    </div>
  );
}
