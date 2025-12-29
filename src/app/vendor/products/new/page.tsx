"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Package, 
  Tag, 
  Info, 
  Truck, 
  Plus, 
  X, 
  Check, 
  Loader2, 
  ArrowLeft,
  Settings2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FileUploader } from "@/components/vendor/FileUploader";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";

const CATEGORIES = ["Cakes", "Tech Gadgets", "Home Decor", "Fashion", "Stationery", "Flowers"];
const SLA_OPTIONS = [
  { value: 2, label: "2 Hours" },
  { value: 4, label: "4 Hours" },
  { value: 6, label: "6 Hours" },
  { value: 12, label: "12 Hours" },
  { value: 24, label: "24 Hours" }
];

export default function NewProductPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    price: 0,
    image: "",
    images: [] as string[],
    isPersonalizable: false,
    hsnCode: "",
    materialComposition: "",
    dimensions: { length: 0, width: 0, height: 0 },
    weightGrams: 0,
    careInstructions: "",
    warranty: "No warranty",
    countryOfOrigin: "India",
    mockupSlaHours: 4,
    customizationSchema: {
      requiresText: false,
      requiresPhoto: false,
      maxTextLength: 30
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.image) {
      toast.error("Please upload at least one product image");
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.post("/vendor/products", formData);
      toast.success("Product published successfully!");
      router.push("/vendor/products");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create product");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-bold text-lg">List New Product</h1>
          </div>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="rounded-full px-6"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Publish"}
          </Button>
        </div>
      </div>

      <div className="container max-w-2xl mx-auto px-4 py-8 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name*</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Custom Engraved AirPods Pro"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category*</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={val => setFormData(prev => ({ ...prev, category: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Base Price (₹)*</Label>
                  <Input 
                    id="price" 
                    type="number"
                    value={formData.price || ""} 
                    onChange={e => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                    placeholder="1299"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description*</Label>
                <Textarea 
                  id="description" 
                  value={formData.description} 
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Tell customers about your product..."
                  className="h-24"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Product Images* (Min 1, Max 5)</Label>
                <div className="grid grid-cols-2 gap-4">
                  <FileUploader 
                    label="Main Photo" 
                    onUpload={url => setFormData(prev => ({ ...prev, image: url, images: [url, ...prev.images] }))} 
                  />
                  {formData.image && (
                    <div className="relative aspect-square rounded-xl overflow-hidden border">
                      <img src={formData.image} alt="Preview" className="object-cover w-full h-full" />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personalization */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />
                Personalization Add-ons
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">Enable Personalization</Label>
                  <p className="text-xs text-muted-foreground">Allow customers to add custom text or photos</p>
                </div>
                <Switch 
                  checked={formData.isPersonalizable}
                  onCheckedChange={val => setFormData(prev => ({ ...prev, isPersonalizable: val }))}
                />
              </div>

              {formData.isPersonalizable && (
                <div className="pt-4 border-t space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="engraving" className="text-sm">Allow Custom Text/Engraving</Label>
                    </div>
                    <Switch 
                      id="engraving"
                      checked={formData.customizationSchema.requiresText}
                      onCheckedChange={val => setFormData(prev => ({ 
                        ...prev, 
                        customizationSchema: { ...prev.customizationSchema, requiresText: val } 
                      }))}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="photo" className="text-sm">Allow Custom Photo Upload</Label>
                    </div>
                    <Switch 
                      id="photo"
                      checked={formData.customizationSchema.requiresPhoto}
                      onCheckedChange={val => setFormData(prev => ({ 
                        ...prev, 
                        customizationSchema: { ...prev.customizationSchema, requiresPhoto: val } 
                      }))}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Compliance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                Compliance & Shipping
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hsn">HSN Code (6 digits)*</Label>
                  <Input 
                    id="hsn" 
                    value={formData.hsnCode} 
                    onChange={e => setFormData(prev => ({ ...prev, hsnCode: e.target.value.slice(0, 6) }))}
                    placeholder="851830"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (Grams)*</Label>
                  <Input 
                    id="weight" 
                    type="number"
                    value={formData.weightGrams || ""} 
                    onChange={e => setFormData(prev => ({ ...prev, weightGrams: parseInt(e.target.value) }))}
                    placeholder="45"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dimensions (cm)*</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Input 
                    type="number" 
                    placeholder="L" 
                    onChange={e => setFormData(prev => ({ ...prev, dimensions: { ...prev.dimensions, length: parseFloat(e.target.value) } }))}
                    required
                  />
                  <Input 
                    type="number" 
                    placeholder="W" 
                    onChange={e => setFormData(prev => ({ ...prev, dimensions: { ...prev.dimensions, width: parseFloat(e.target.value) } }))}
                    required
                  />
                  <Input 
                    type="number" 
                    placeholder="H" 
                    onChange={e => setFormData(prev => ({ ...prev, dimensions: { ...prev.dimensions, height: parseFloat(e.target.value) } }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="material">Material Composition*</Label>
                <Input 
                  id="material" 
                  value={formData.materialComposition} 
                  onChange={e => setFormData(prev => ({ ...prev, materialComposition: e.target.value }))}
                  placeholder="e.g. Plastic, Silicone"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="origin">Country of Origin*</Label>
                <Select 
                  value={formData.countryOfOrigin} 
                  onValueChange={val => setFormData(prev => ({ ...prev, countryOfOrigin: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="India">India</SelectItem>
                    <SelectItem value="China">China</SelectItem>
                    <SelectItem value="Vietnam">Vietnam</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Delivery SLA */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" />
                Delivery SLA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sla">Mockup SLA (Time to show mockup)*</Label>
                <Select 
                  value={formData.mockupSlaHours.toString()} 
                  onValueChange={val => setFormData(prev => ({ ...prev, mockupSlaHours: parseInt(val) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select SLA" />
                  </SelectTrigger>
                  <SelectContent>
                    {SLA_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value.toString()}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  This is the maximum time you'll take to upload a mockup after accepting an order.
                </p>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
