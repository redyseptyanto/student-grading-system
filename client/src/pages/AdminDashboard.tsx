import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Users, 
  GraduationCap, 
  FileText, 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  School,
  Calendar,
  BookOpen,
  UserCheck
} from "lucide-react";
import { useState } from "react";
import StudentManagement from "@/components/StudentManagement";
import TeacherManagement from "@/components/TeacherManagement";
import ReportManagement from "@/components/ReportManagement";

export default function AdminDashboard() {
  const { user } = useAuth();
  
  // Overview stats queries
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/stats'],
  });

  if (!user || !(user as any).roles?.includes('admin')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You need admin privileges to access this dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600">Manage students, teachers, and reports</p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.totalStudents || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active students across all classes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.totalTeachers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active teaching staff
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Classes</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.totalClasses || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active class groups
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Report Templates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.totalReportTemplates || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Available report layouts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="students" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="students" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Student Management
          </TabsTrigger>
          <TabsTrigger value="teachers" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Teacher Management
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Report Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          <StudentManagement />
        </TabsContent>

        <TabsContent value="teachers">
          <TeacherManagement />
        </TabsContent>

        <TabsContent value="reports">
          <ReportManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}