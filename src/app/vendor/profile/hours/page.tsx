"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Save, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

const DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

interface DayHours {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

function StoreHoursContent() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [hours, setHours] = useState<Record<string, DayHours>>({
    monday: { isOpen: true, openTime: "09:00", closeTime: "21:00" },
    tuesday: { isOpen: true, openTime: "09:00", closeTime: "21:00" },
    wednesday: { isOpen: true, openTime: "09:00", closeTime: "21:00" },
    thursday: { isOpen: true, openTime: "09:00", closeTime: "21:00" },
    friday: { isOpen: true, openTime: "09:00", closeTime: "21:00" },
    saturday: { isOpen: true, openTime: "09:00", closeTime: "21:00" },
    sunday: { isOpen: false, openTime: "09:00", closeTime: "21:00" },
  });

  const updateDay = (day: string, field: keyof DayHours, value: boolean | string) => {
    setHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await apiClient.patch("/vendor/profile", { operatingHours: hours });
      toast.success("Store hours updated");
      router.push("/vendor/profile");
    } catch (error) {
      toast.error("Failed to save store hours");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-bold text-lg">Store Hours</h1>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>

      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Operating Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {DAYS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-4 pb-4 border-b last:border-0">
                <div className="w-28">
                  <Label className="font-medium">{label}</Label>
                </div>
                <Switch
                  checked={hours[key].isOpen}
                  onCheckedChange={(checked) => updateDay(key, "isOpen", checked)}
                />
                {hours[key].isOpen ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      value={hours[key].openTime}
                      onChange={(e) => updateDay(key, "openTime", e.target.value)}
                      className="w-32"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={hours[key].closeTime}
                      onChange={(e) => updateDay(key, "closeTime", e.target.value)}
                      className="w-32"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Closed</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          Customers won't be able to place orders outside your operating hours.
        </p>
      </div>
    </div>
  );
}

export default function StoreHoursPage() {
  return (
    <ProtectedRoute requiredRole="vendor">
      <StoreHoursContent />
    </ProtectedRoute>
  );
}
