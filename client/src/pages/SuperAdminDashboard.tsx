import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { School, User, Teacher, Student, InsertSchool, UpsertUser } from "@shared/schema";
import { Trash2, Edit, Plus, Users, GraduationCap, School as SchoolIcon, Settings, Search, Filter, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function SuperAdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [schoolDialogOpen, setSchoolDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Search and Filter states
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userSchoolFilter, setUserSchoolFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  
  const [schoolSearchTerm, setSchoolSearchTerm] = useState("");
  const [schoolStatusFilter, setSchoolStatusFilter] = useState("all");

  // Queries
  const { data: schools = [], isLoading: schoolsLoading } = useQuery({
    queryKey: ["/api/superadmin/schools"],
    enabled: !authLoading && (user as any)?.roles?.includes("superadmin"),
  });

  const { data: allUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/superadmin/users"],
    enabled: !authLoading && (user as any)?.roles?.includes("superadmin"),
  });

  const { data: systemStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/superadmin/stats"],
    enabled: !authLoading && (user as any)?.roles?.includes("superadmin"),
  });

  // Mutations
  const createSchoolMutation = useMutation({
    mutationFn: async (schoolData: InsertSchool) => {
      return await apiRequest("POST", "/api/superadmin/schools", schoolData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/schools"] });
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/stats"] });
      setSchoolDialogOpen(false);
      setEditingSchool(null);
      toast({ title: "Success", description: "School created successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({ title: "Error", description: "Failed to create school", variant: "destructive" });
    },
  });

  const updateSchoolMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<School> }) => {
      return await apiRequest("PUT", `/api/superadmin/schools/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/schools"] });
      setSchoolDialogOpen(false);
      setEditingSchool(null);
      toast({ title: "Success", description: "School updated successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({ title: "Error", description: "Failed to update school", variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      return await apiRequest("PUT", `/api/superadmin/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/users"] });
      setUserDialogOpen(false);
      setEditingUser(null);
      toast({ title: "Success", description: "User updated successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({ title: "Error", description: "Failed to update user", variant: "destructive" });
    },
  });

  const deleteSchoolMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/superadmin/schools/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/schools"] });
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/stats"] });
      toast({ title: "Success", description: "School deleted successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({ title: "Error", description: "Failed to delete school", variant: "destructive" });
    },
  });

  // Role management functions
  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return await apiRequest("POST", `/api/superadmin/users/${userId}/roles`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/users"] });
      toast({ title: "Success", description: "Role added successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({ title: "Error", description: "Failed to add role", variant: "destructive" });
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return await apiRequest("DELETE", `/api/superadmin/users/${userId}/roles/${role}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/users"] });
      toast({ title: "Success", description: "Role removed successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({ title: "Error", description: "Failed to remove role", variant: "destructive" });
    },
  });

  const handleAddRole = (userId: string, role: string) => {
    addRoleMutation.mutate({ userId, role });
  };

  const handleRemoveRole = (userId: string, role: string) => {
    removeRoleMutation.mutate({ userId, role });
  };

  const handleSchoolSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const schoolData = {
      name: formData.get("name") as string,
      address: formData.get("address") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      principalName: formData.get("principalName") as string,
      establishedYear: parseInt(formData.get("establishedYear") as string),
      isActive: formData.get("isActive") === "on",
    };

    if (editingSchool) {
      updateSchoolMutation.mutate({ id: editingSchool.id, data: schoolData });
    } else {
      createSchoolMutation.mutate(schoolData);
    }
  };

  // Check authorization
  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!user || !(user as any).roles?.includes("superadmin")) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You don't have permission to access the SuperAdmin Dashboard.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleUserRoleUpdate = (userId: string, newRole: string, schoolId: number | null) => {
    updateUserMutation.mutate({
      id: userId,
      data: { roles: [newRole], schoolId },
    });
  };

  const handleUserStatusToggle = (userId: string, isActive: boolean) => {
    updateUserMutation.mutate({
      id: userId,
      data: { isActive },
    });
  };

  // Filter and search functions
  const filteredUsers = (allUsers as User[]).filter((user: User) => {
    const searchMatch = userSearchTerm === "" || 
      user.firstName?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(userSearchTerm.toLowerCase());
    
    const roleMatch = userRoleFilter === "all" || 
      (user as any).roles?.includes(userRoleFilter) || 
      (user as any).role === userRoleFilter;
    
    const schoolMatch = userSchoolFilter === "all" || 
      (user as any).schoolId?.toString() === userSchoolFilter;
    
    const statusMatch = userStatusFilter === "all" || 
      (userStatusFilter === "active" && (user as any).isActive !== false) ||
      (userStatusFilter === "inactive" && (user as any).isActive === false);
    
    return searchMatch && roleMatch && schoolMatch && statusMatch;
  });

  const filteredSchools = (schools as School[]).filter((school: School) => {
    const searchMatch = schoolSearchTerm === "" ||
      school.name.toLowerCase().includes(schoolSearchTerm.toLowerCase()) ||
      school.address?.toLowerCase().includes(schoolSearchTerm.toLowerCase()) ||
      school.principalName?.toLowerCase().includes(schoolSearchTerm.toLowerCase());
    
    const statusMatch = schoolStatusFilter === "all" ||
      (schoolStatusFilter === "active" && school.isActive !== false) ||
      (schoolStatusFilter === "inactive" && school.isActive === false);
    
    return searchMatch && statusMatch;
  });

  // Clear all filters
  const clearUserFilters = () => {
    setUserSearchTerm("");
    setUserRoleFilter("all");
    setUserSchoolFilter("all");
    setUserStatusFilter("all");
  };

  const clearSchoolFilters = () => {
    setSchoolSearchTerm("");
    setSchoolStatusFilter("all");
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">SuperAdmin Dashboard</h1>
        <p className="text-gray-600">Manage schools, users, and system-wide settings</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schools">Schools</TabsTrigger>
          <TabsTrigger value="users">Users & Roles</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
                <SchoolIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(systemStats as any)?.totalSchools || 0}</div>
                <p className="text-xs text-muted-foreground">Active schools in system</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(systemStats as any)?.totalUsers || 0}</div>
                <p className="text-xs text-muted-foreground">All users across schools</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(systemStats as any)?.totalStudents || 0}</div>
                <p className="text-xs text-muted-foreground">Students across all schools</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Healthy</div>
                <p className="text-xs text-muted-foreground">All systems operational</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm">New school "Sunshine Elementary" created</p>
                    <p className="text-xs text-gray-500">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm">User role updated for teacher@example.com</p>
                    <p className="text-xs text-gray-500">4 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm">System backup completed successfully</p>
                    <p className="text-xs text-gray-500">1 day ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schools" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">School Management</h2>
            <Dialog open={schoolDialogOpen} onOpenChange={setSchoolDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingSchool(null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add School
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingSchool ? "Edit School" : "Add New School"}</DialogTitle>
                  <DialogDescription>
                    {editingSchool ? "Update school information" : "Create a new school in the system"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSchoolSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">School Name</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={editingSchool?.name || ""}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      name="address"
                      defaultValue={editingSchool?.address || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      defaultValue={editingSchool?.phone || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      defaultValue={editingSchool?.email || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="principalName">Principal Name</Label>
                    <Input
                      id="principalName"
                      name="principalName"
                      defaultValue={editingSchool?.principalName || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="establishedYear">Established Year</Label>
                    <Input
                      id="establishedYear"
                      name="establishedYear"
                      type="number"
                      defaultValue={editingSchool?.establishedYear || ""}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      name="isActive"
                      defaultChecked={editingSchool?.isActive ?? true}
                    />
                    <Label htmlFor="isActive">Active</Label>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createSchoolMutation.isPending || updateSchoolMutation.isPending}>
                      {editingSchool ? "Update" : "Create"} School
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* School Search and Filter Controls */}
          <Card className="p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search schools by name, address, or principal..."
                  value={schoolSearchTerm}
                  onChange={(e) => setSchoolSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 items-center">
                <Select value={schoolStatusFilter} onValueChange={setSchoolStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={clearSchoolFilters}
                  className="px-3"
                  title="Clear filters"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {(schoolSearchTerm || schoolStatusFilter !== "all") && (
              <div className="mt-2 text-sm text-gray-600">
                Showing {filteredSchools.length} of {(schools as School[]).length} schools
              </div>
            )}
          </Card>

          {schoolsLoading ? (
            <div>Loading schools...</div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>School Name</TableHead>
                      <TableHead>Principal</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSchools.map((school: School) => (
                      <TableRow key={school.id}>
                        <TableCell className="font-medium">{school.name}</TableCell>
                        <TableCell>{school.principalName}</TableCell>
                        <TableCell>
                          <div>
                            <div>{school.email}</div>
                            <div className="text-sm text-gray-500">{school.phone}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={school.isActive ? "default" : "secondary"}>
                            {school.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingSchool(school);
                                setSchoolDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <ConfirmDialog
                              title="Delete School"
                              description={`Are you sure you want to delete "${school.name}"? This action cannot be undone and will remove all associated classes, students, and data.`}
                              onConfirm={() => deleteSchoolMutation.mutate(school.id)}
                              disabled={deleteSchoolMutation.isPending}
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </ConfirmDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">User & Role Management</h2>
          </div>

          {/* User Search and Filter Controls */}
          <Card className="p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search users by name or email..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="superadmin">SuperAdmin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={userSchoolFilter} onValueChange={setUserSchoolFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="School" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Schools</SelectItem>
                    {(schools as School[]).map((school: School) => (
                      <SelectItem key={school.id} value={school.id.toString()}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={userStatusFilter} onValueChange={setUserStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={clearUserFilters}
                  className="px-3"
                  title="Clear filters"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {(userSearchTerm || userRoleFilter !== "all" || userSchoolFilter !== "all" || userStatusFilter !== "all") && (
              <div className="mt-2 text-sm text-gray-600">
                Showing {filteredUsers.length} of {(allUsers as User[]).length} users
              </div>
            )}
          </Card>

          {usersLoading ? (
            <div>Loading users...</div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>School</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user: User & { school?: School }) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.firstName} {user.lastName}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(user.roles || []).map((role: string) => (
                              <Badge 
                                key={role}
                                variant={role === "superadmin" ? "default" : role === "admin" ? "secondary" : "outline"}
                                className="flex items-center gap-1"
                              >
                                {role}
                                {(user.roles?.length || 1) > 1 && (
                                  <button
                                    className="ml-1 text-xs hover:bg-red-500 hover:text-white rounded-full w-3 h-3 flex items-center justify-center"
                                    onClick={() => handleRemoveRole(user.id, role)}
                                    disabled={(user.roles?.length || 1) <= 1}
                                  >
                                    ×
                                  </button>
                                )}
                              </Badge>
                            ))}
                            <Select onValueChange={(role) => handleAddRole(user.id, role)}>
                              <SelectTrigger className="w-8 h-6 p-0">
                                <SelectValue placeholder="+" />
                              </SelectTrigger>
                              <SelectContent>
                                {["superadmin", "admin", "teacher", "parent"].filter(role => 
                                  !user.roles?.includes(role)
                                ).map(role => (
                                  <SelectItem key={role} value={role}>
                                    {role}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.roles?.includes("superadmin") ? (
                            <Badge variant="outline">All Schools</Badge>
                          ) : (
                            <Select
                              value={user.schoolId?.toString() || ""}
                              onValueChange={(schoolId) => 
                                updateUserMutation.mutate({ 
                                  id: user.id, 
                                  data: { schoolId: parseInt(schoolId) } 
                                })
                              }
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue placeholder="Select school" />
                              </SelectTrigger>
                              <SelectContent>
                                {(schools as School[]).map((school: School) => (
                                  <SelectItem key={school.id} value={school.id.toString()}>
                                    {school.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={user.isActive ?? true}
                            onCheckedChange={(checked) => 
                              updateUserMutation.mutate({ 
                                id: user.id, 
                                data: { isActive: checked } 
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-500">
                            {user.school?.name || (user.schoolId ? "School not found" : "No school assigned")}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <h2 className="text-2xl font-bold">System Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
                <CardDescription>Global system settings and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="maintenance">Maintenance Mode</Label>
                  <Switch id="maintenance" />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="registration">Allow New School Registration</Label>
                  <Switch id="registration" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="backup">Auto Backup</Label>
                  <Switch id="backup" defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>System security and access controls</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="2fa">Require 2FA for Admins</Label>
                  <Switch id="2fa" />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="session">Extended Sessions</Label>
                  <Switch id="session" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="audit">Audit Logging</Label>
                  <Switch id="audit" defaultChecked />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}