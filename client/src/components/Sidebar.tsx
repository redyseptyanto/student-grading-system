import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  GraduationCap,
  UserCog,
  School,
  FileText,
  User,
  MessageCircle,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SidebarProps {
  className?: string;
}

const navigation = {
  superadmin: [
    { name: "SuperAdmin Dashboard", href: "/superadmin", icon: Settings },
    { name: "System Overview", href: "/dashboard", icon: BarChart3 },
  ],
  admin: [
    { name: "Admin Dashboard", href: "/admin", icon: UserCog },
    { name: "User Management", href: "/admin/users", icon: UserCog },
    { name: "School Management", href: "/admin/schools", icon: School },
    { name: "System Reports", href: "/admin/reports", icon: FileText },
  ],
  teacher: [
    { name: "Teacher Dashboard", href: "/dashboard", icon: BarChart3 },
    { name: "My Students", href: "/students", icon: Users },
    { name: "Grade Input", href: "/grades", icon: BookOpen },
    { name: "Reports & Charts", href: "/charts", icon: TrendingUp },
  ],
  parent: [
    { name: "Parent Dashboard", href: "/dashboard", icon: BarChart3 },
    { name: "My Child's Progress", href: "/progress", icon: User },
    { name: "View Report Cards", href: "/reports", icon: FileText },
    { name: "Communication", href: "/communication", icon: MessageCircle },
  ],
};

export function Sidebar({ className }: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [location] = useLocation();
  const { user, isLoading } = useAuth();

  if (isLoading || !user) return null;

  // Support multi-role users by combining navigation items from all their roles
  const userRoles = (user as any).roles || [(user as any).role];
  const userNavigation: Array<{name: string, href: string, icon: any}> = [];
  const seenHrefs = new Set<string>();

  userRoles.forEach((role: string) => {
    const roleNavigation = navigation[role as keyof typeof navigation] || [];
    roleNavigation.forEach(item => {
      if (!seenHrefs.has(item.href)) {
        seenHrefs.add(item.href);
        userNavigation.push(item);
      }
    });
  });

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getDisplayName = () => {
    // Priority: fullName > firstName + lastName > email
    if ((user as any)?.fullName) {
      return (user as any).fullName;
    }
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) {
      return user.firstName;
    }
    return user?.email?.split('@')[0] || 'User';
  };

  const getInitials = () => {
    const name = getDisplayName();
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
        >
          {isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          className
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="ml-3 text-lg font-semibold text-gray-900">GradeWise</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-6 py-4 space-y-2">
            {userNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              
              return (
                <Link key={item.name} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive
                        ? "text-primary bg-primary/10"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    )}
                    onClick={() => setIsMobileOpen(false)}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="border-t border-gray-200 p-6">
            <Link href="/profile">
              <div className="flex items-center hover:bg-gray-50 p-2 rounded-md transition-colors cursor-pointer mb-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={user.profileImageUrl || undefined} />
                  <AvatarFallback>
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-700">
                    {getDisplayName()}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{userRoles.join(", ")}</p>
                </div>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start text-gray-600 hover:text-gray-900"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
