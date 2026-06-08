import React from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useGetDoctor, useUpdateDoctorStatus } from "@workspace/api-client-react";
import { useRoute } from "wouter";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, XCircle, Clock, Star, Calendar, MessageSquare, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getGetDoctorQueryKey, getListDoctorsQueryKey } from "@workspace/api-client-react";

export default function DoctorDetail() {
  const [, params] = useRoute("/doctors/:id");
  const id = params?.id || "";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: doctor, isLoading } = useGetDoctor(id, {
    query: { enabled: !!id, queryKey: getGetDoctorQueryKey(id) }
  });

  const updateStatus = useUpdateDoctorStatus({
    mutation: {
      onSuccess: () => {
        toast({ title: "Status updated successfully" });
        queryClient.invalidateQueries({ queryKey: getGetDoctorQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListDoctorsQueryKey() });
      },
      onError: () => {
        toast({ title: "Failed to update status", variant: "destructive" });
      }
    }
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">Loading doctor profile...</div>
      </AdminLayout>
    );
  }

  if (!doctor) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">Doctor not found</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/doctors" className="p-2 -ml-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">Dr. {doctor.name}</h1>
              <StatusBadge status={doctor.status} />
            </div>
            <p className="text-muted-foreground">{doctor.specialty} • {doctor.city} • PMDC: {doctor.pmdc_number}</p>
          </div>
          <div className="flex gap-2">
            {(doctor.status === 'pending' || doctor.status === 'rejected') && (
              <>
                <Button 
                  variant="outline" 
                  className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  onClick={() => updateStatus.mutate({ id, data: { status: 'verified' } })}
                  disabled={updateStatus.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                </Button>
                <Button 
                  variant="outline" 
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => updateStatus.mutate({ id, data: { status: 'rejected', reason: 'Verification failed' } })}
                  disabled={updateStatus.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" /> Reject
                </Button>
              </>
            )}
            {doctor.status === 'verified' && (
              <Button 
                variant="outline" 
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => updateStatus.mutate({ id, data: { status: 'suspended', reason: 'Administrative action' } })}
                disabled={updateStatus.isPending}
              >
                <AlertTriangle className="h-4 w-4 mr-2" /> Suspend
              </Button>
            )}
            {doctor.status === 'suspended' && (
              <Button 
                variant="outline" 
                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                onClick={() => updateStatus.mutate({ id, data: { status: 'verified' } })}
                disabled={updateStatus.isPending}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" /> Reinstate
              </Button>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Appointments</p>
                <p className="text-2xl font-bold">{doctor.appointments_completed || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-full">
                <Star className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rating</p>
                <p className="text-2xl font-bold">{doctor.rating?.toFixed(1) || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-full">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">No Shows</p>
                <p className="text-2xl font-bold">{doctor.no_shows || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Response</p>
                <p className="text-2xl font-bold">{doctor.avg_response_time || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pmdc" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
            <TabsTrigger value="pmdc" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none py-3">PMDC Verification</TabsTrigger>
            <TabsTrigger value="clinic" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none py-3">Clinic Verification</TabsTrigger>
            <TabsTrigger value="performance" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none py-3">Performance Stats</TabsTrigger>
            <TabsTrigger value="activity" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none py-3">Activity Log</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pmdc" className="pt-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>PMDC Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Registration Number</p>
                      <p className="font-medium">{doctor.pmdc_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Verification Status</p>
                      <StatusBadge status={doctor.status} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date of Registration</p>
                      <p className="font-medium">12 May 2015</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Valid Upto</p>
                      <p className="font-medium text-amber-600">31 Dec 2025</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Document Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-muted rounded-md border flex items-center justify-center flex-col gap-2 text-muted-foreground">
                    <FileText className="h-10 w-10 opacity-50" />
                    <p>PMDC_Certificate.pdf</p>
                    <Button variant="outline" size="sm" className="mt-2">Download</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="clinic" className="pt-6">
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Clinic verification details will appear here.
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="performance" className="pt-6">
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Detailed performance charts and metrics will appear here.
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="activity" className="pt-6">
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Recent activity log for this doctor will appear here.
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

// Just an icon import fix
import { FileText } from "lucide-react";
