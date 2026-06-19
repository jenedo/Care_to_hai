import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function Settings() {
  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Settings</h1>
          <p className="text-muted-foreground">Manage global platform configurations</p>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Commission & Fees</CardTitle>
            <CardDescription>Set the default platform fees and doctor commission splits.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Platform Fee (%)</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" defaultValue="15" className="w-24" />
                  <span className="text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">Percentage taken from every successful consultation.</p>
              </div>
              <div className="space-y-2">
                <Label>Fixed Transaction Fee (PKR)</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" defaultValue="50" className="w-24" />
                  <span className="text-muted-foreground">PKR</span>
                </div>
              </div>
            </div>
            <Button>Save Changes</Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Booking Rules</CardTitle>
            <CardDescription>Configure rules for patient bookings and cancellations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require payment upfront</Label>
                <p className="text-sm text-muted-foreground">Patients must pay before appointment is confirmed</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-cancel unpaid bookings</Label>
                <p className="text-sm text-muted-foreground">Cancel bookings if unpaid after 30 minutes</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow reschedules</Label>
                <p className="text-sm text-muted-foreground">Patients can reschedule up to 12 hours before</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
