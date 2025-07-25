import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, BookOpen, TrendingUp, Clock, School, UserCheck, FileText, BarChart3 } from "lucide-react";

interface DashboardStats {
  totalStudents?: number;
  completedAssessments?: number;
  pendingReviews?: number;
  averageProgress?: number;
  totalClasses?: number;
  activeTeachers?: number;
  systemUsage?: number;
}

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ["/api/students"],
    enabled: !!user,
    retry: false,
  });

  const { data: classes, isLoading: classesLoading } = useQuery({
    queryKey: ["/api/classes"],
    enabled: !!user && (user as any).roles?.includes("admin"),
    retry: false,
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return null;
  }

  // Calculate stats based on role
  const stats: DashboardStats = {
    totalStudents: students?.length || 0,
    completedAssessments: 89, // This would be calculated from actual grade data
    pendingReviews: 3,
    averageProgress: 4.2,
    totalClasses: classes?.length || 8,
    activeTeachers: 12, // This would come from a teachers query
    systemUsage: 94,
  };

  const renderTeacherDashboard = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Total Students"
          value={stats.totalStudents?.toString() || "0"}
          icon={Users}
          iconColor="text-blue-600"
          bgColor="bg-blue-100"
        />
        <StatCard
          title="Completed Assessments"
          value={`${stats.completedAssessments}%`}
          icon={BookOpen}
          iconColor="text-green-600"
          bgColor="bg-green-100"
        />
        <StatCard
          title="Pending Reviews"
          value={stats.pendingReviews?.toString() || "0"}
          icon={Clock}
          iconColor="text-yellow-600"
          bgColor="bg-yellow-100"
        />
        <StatCard
          title="Average Progress"
          value={stats.averageProgress?.toString() || "0"}
          icon={TrendingUp}
          iconColor="text-purple-600"
          bgColor="bg-purple-100"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivityCard />
        <QuickActionsCard />
      </div>
    </>
  );

  const renderAdminDashboard = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Total Classes"
          value={stats.totalClasses?.toString() || "0"}
          icon={School}
          iconColor="text-blue-600"
          bgColor="bg-blue-100"
        />
        <StatCard
          title="Active Teachers"
          value={stats.activeTeachers?.toString() || "0"}
          icon={UserCheck}
          iconColor="text-green-600"
          bgColor="bg-green-100"
        />
        <StatCard
          title="Total Students"
          value={stats.totalStudents?.toString() || "0"}
          icon={Users}
          iconColor="text-purple-600"
          bgColor="bg-purple-100"
        />
        <StatCard
          title="System Usage"
          value={`${stats.systemUsage}%`}
          icon={BarChart3}
          iconColor="text-yellow-600"
          bgColor="bg-yellow-100"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SystemOverviewCard />
        <UserManagementCard />
      </div>
    </>
  );

  const renderParentDashboard = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <ProgressCard
          title="Language & Literacy"
          score={4.2}
          status="Excellent progress"
          color="green"
        />
        <ProgressCard
          title="Mathematics"
          score={3.8}
          status="Good progress"
          color="blue"
        />
        <ProgressCard
          title="Social Skills"
          score={4.5}
          status="Outstanding"
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivityCard />
        <ChildProgressCard />
      </div>
    </>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {(user as any).roles?.includes("admin") && "Admin Dashboard"}
          {(user as any).roles?.includes("teacher") && !((user as any).roles?.includes("admin")) && "Teacher Dashboard"}
          {(user as any).roles?.includes("parent") && !((user as any).roles?.includes("admin")) && !((user as any).roles?.includes("teacher")) && "Parent Dashboard"}
        </h1>
        <p className="text-gray-600">
          Welcome back, {user.firstName} {user.lastName}
        </p>
      </div>

      {(user as any).roles?.includes("admin") && renderAdminDashboard()}
      {(user as any).roles?.includes("teacher") && !((user as any).roles?.includes("admin")) && renderTeacherDashboard()}
      {(user as any).roles?.includes("parent") && !((user as any).roles?.includes("admin")) && !((user as any).roles?.includes("teacher")) && renderParentDashboard()}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, iconColor, bgColor }: {
  title: string;
  value: string;
  icon: any;
  iconColor: string;
  bgColor: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center">
          <div className={`p-2 ${bgColor} rounded-lg`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressCard({ title, score, status, color }: {
  title: string;
  score: number;
  status: string;
  color: "green" | "blue" | "purple";
}) {
  const colorClasses = {
    green: "bg-green-100 text-green-600",
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
  };

  return (
    <Card>
      <CardContent className="p-6 text-center">
        <div className={`w-20 h-20 mx-auto ${colorClasses[color]} rounded-full flex items-center justify-center mb-3`}>
          <span className="text-2xl font-bold">{score}</span>
        </div>
        <h4 className="font-medium text-gray-900">{title}</h4>
        <p className="text-sm text-gray-500">{status}</p>
      </CardContent>
    </Card>
  );
}

function RecentActivityCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest updates and assessments</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Reading assessment completed</p>
              <p className="text-xs text-gray-500">2 hours ago</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Progress report generated</p>
              <p className="text-xs text-gray-500">Yesterday</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActionsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks and shortcuts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <p className="font-medium">Input Grades</p>
            <p className="text-sm text-gray-500">Add new assessments for students</p>
          </button>
          <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <p className="font-medium">Generate Report</p>
            <p className="text-sm text-gray-500">Create progress charts and reports</p>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function SystemOverviewCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>System Overview</CardTitle>
        <CardDescription>Platform usage and performance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Active Users</span>
            <span className="text-sm font-medium">156</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Assessments This Week</span>
            <span className="text-sm font-medium">847</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">System Uptime</span>
            <span className="text-sm font-medium">99.8%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function UserManagementCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>Recent user activities</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">New teacher registered</p>
                <p className="text-xs text-gray-500">2 hours ago</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChildProgressCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Progress Overview</CardTitle>
        <CardDescription>Your child's learning journey</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">Overall progress this semester</p>
          <div className="w-24 h-24 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-green-600">4.1</span>
          </div>
          <p className="text-sm font-medium mt-2">Excellent Progress</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Skeleton className="w-12 h-12 rounded-lg" />
                <div className="ml-4 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
