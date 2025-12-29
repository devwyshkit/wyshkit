"use client";

import { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  Search, 
  Settings2, 
  Tag, 
  Building2, 
  Globe,
  Loader2,
  Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";

interface CashbackRule {
  id: string;
  type: 'global' | 'category' | 'vendor';
  entityId?: string;
  percentage: number;
  isActive: boolean;
}

export default function CashbackManagementPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<CashbackRule[]>([]);
  const [globalRate, setGlobalRate] = useState(10);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<CashbackRule[]>("/cashback/config");
      setRules(data);
      const global = data.find(r => r.type === 'global');
      if (global) setGlobalRate(global.percentage);
    } catch (error) {
      toast.error("Failed to load cashback settings");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGlobal = async () => {
    try {
      setSaving(true);
      await apiClient.post("/cashback/config", { type: 'global', percentage: globalRate });
      toast.success("Global cashback rate updated");
    } catch (error) {
      toast.error("Failed to update global rate");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Cashback Management</h1>
        <p className="text-muted-foreground mt-1">Configure customer rewards across categories and vendors.</p>
      </div>

      <div className="grid gap-6">
        {/* Global Settings */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Global Cashback Rate
            </CardTitle>
            <CardDescription>This rate applies to all products unless overridden below.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div className="space-y-2 flex-1 max-w-[200px]">
                <Label htmlFor="globalRate">Percentage (%)</Label>
                <div className="relative">
                  <Input 
                    id="globalRate" 
                    type="number" 
                    value={globalRate} 
                    onChange={e => setGlobalRate(parseFloat(e.target.value))}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                </div>
              </div>
              <Button onClick={handleUpdateGlobal} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Category Overrides */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Tag className="w-5 h-5 text-primary" />
                Category Overrides
              </CardTitle>
              <CardDescription>Special rates for specific product categories.</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Override
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 border rounded-xl">
                <div>
                  <p className="font-semibold">Cakes & Bakery</p>
                  <p className="text-xs text-muted-foreground">Applies to all products in Cakes category</p>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="text-sm px-3 py-1">15%</Badge>
                  <Button variant="ghost" size="icon" className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-xl">
                <div>
                  <p className="font-semibold">Electronics</p>
                  <p className="text-xs text-muted-foreground">Lower rate for high-value items</p>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="text-sm px-3 py-1">5%</Badge>
                  <Button variant="ghost" size="icon" className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vendor Overrides */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Vendor Spotlight Rates
              </CardTitle>
              <CardDescription>Promotional rates for specific partner stores.</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Spotlight
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-center py-10 border-2 border-dashed rounded-2xl bg-slate-50">
              <Settings2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No vendor overrides active</p>
              <Button variant="link" size="sm">Click here to add one</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
