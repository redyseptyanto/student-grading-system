import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Edit,
  Trash2,
  Users,
  UserPlus,
  Settings,
  School,
  BookOpen,
  Search,
  Filter,
} from "lucide-react";

interface Class {
  id: number;
  name: string;
  academicYear: string;
  schoolId: number;
  capacity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StudentGroup {
  id: number;
  name: string;
  classId: number;
  teacherId?: number;
  schoolId: number;
  description?: string;
  maxStudents: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Teacher {
  id: number;
  fullName: string;
  email: string;
}

interface School {
  id: number;
  name: string;
  address: string;
  principalName: string;
  isActive: boolean;
}

export default function ClassManagement() {
  const { toast } = useToast();
  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [editingGroup, setEditingGroup] = useState<StudentGroup | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  
  // Filter states
  const [classSearchTerm, setClassSearchTerm] = useState("");
  const [classAcademicYearFilter, setClassAcademicYearFilter] = useState("all-years");
  const [classSchoolFilter, setClassSchoolFilter] = useState("all-schools");
  const [groupSearchTerm, setGroupSearchTerm] = useState("");
  const [groupSchoolFilter, setGroupSchoolFilter] = useState("all-schools");
  const [groupClassFilter, setGroupClassFilter] = useState("all-classes");

  // Fetch data
  const { data: classes = [], isLoading: classesLoading } = useQuery<Class[]>({
    queryKey: ['/api/classes'],
  });

  const { data: teachers = [], isLoading: teachersLoading } = useQuery<Teacher[]>({
    queryKey: ['/api/admin/teachers'],
  });

  const { data: schools = [], isLoading: schoolsLoading } = useQuery<School[]>({
    queryKey: ['/api/superadmin/schools'],
  });

  const { data: studentGroups = [], isLoading: groupsLoading } = useQuery<StudentGroup[]>({
    queryKey: selectedClassId 
      ? ['/api/student-groups', `?classId=${selectedClassId}`]
      : ['/api/student-groups'],
  });

  // Class mutations
  const createClassMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/classes', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      setIsCreateClassOpen(false);
      toast({ title: "Success", description: "Class created successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create class",
        variant: "destructive",
      });
    },
  });

  const updateClassMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest('PUT', `/api/classes/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
      setEditingClass(null);
      toast({ title: "Success", description: "Class updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update class",
        variant: "destructive",
      });
    },
  });

  const deleteClassMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/classes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({ title: "Success", description: "Class deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete class",
        variant: "destructive",
      });
    },
  });

  // Student Group mutations
  const createGroupMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/student-groups', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/student-groups'] });
      setIsCreateGroupOpen(false);
      toast({ title: "Success", description: "Student group created successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create student group",
        variant: "destructive",
      });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest('PUT', `/api/student-groups/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/student-groups'] });
      setEditingGroup(null);
      toast({ title: "Success", description: "Student group updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update student group",
        variant: "destructive",
      });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/student-groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/student-groups'] });
      toast({ title: "Success", description: "Student group deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete student group",
        variant: "destructive",
      });
    },
  });

  const handleCreateClass = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      academicYear: formData.get('academicYear'),
      capacity: parseInt(formData.get('capacity') as string),
      schoolId: 1, // TODO: Get from user context
    };
    createClassMutation.mutate(data);
  };

  const handleUpdateClass = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingClass) return;
    
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      academicYear: formData.get('academicYear'),
      capacity: parseInt(formData.get('capacity') as string),
      isActive: formData.get('isActive') === 'on',
    };
    updateClassMutation.mutate({ id: editingClass.id, data });
  };

  const handleCreateGroup = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const teacherId = formData.get('teacherId');
    const data = {
      name: formData.get('name'),
      classId: parseInt(formData.get('classId') as string),
      teacherId: teacherId ? parseInt(teacherId as string) : null,
      description: formData.get('description'),
      maxStudents: parseInt(formData.get('maxStudents') as string),
      schoolId: 1, // TODO: Get from user context
    };
    createGroupMutation.mutate(data);
  };

  const handleUpdateGroup = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingGroup) return;
    
    const formData = new FormData(e.currentTarget);
    const teacherId = formData.get('teacherId');
    const data = {
      name: formData.get('name'),
      teacherId: teacherId ? parseInt(teacherId as string) : null,
      description: formData.get('description'),
      maxStudents: parseInt(formData.get('maxStudents') as string),
      isActive: formData.get('isActive') === 'on',
    };
    updateGroupMutation.mutate({ id: editingGroup.id, data });
  };

  const getTeacherName = (teacherId?: number) => {
    const teacher = teachers.find((t: Teacher) => t.id === teacherId);
    return teacher ? teacher.fullName : 'Unassigned';
  };

  const getClassName = (classId: number) => {
    const classData = classes.find((c: Class) => c.id === classId);
    return classData ? classData.name : 'Unknown Class';
  };

  const getSchoolName = (schoolId: number) => {
    const school = schools.find((s: School) => s.id === schoolId);
    return school ? school.name : 'Unknown School';
  };

  // Filter functions
  const filteredClasses = classes.filter((classData: Class) => {
    const matchesSearch = classData.name.toLowerCase().includes(classSearchTerm.toLowerCase());
    const matchesAcademicYear = classAcademicYearFilter === "all-years" || classData.academicYear === classAcademicYearFilter;
    const matchesSchool = classSchoolFilter === "all-schools" || classData.schoolId.toString() === classSchoolFilter;
    return matchesSearch && matchesAcademicYear && matchesSchool;
  });

  const filteredGroups = studentGroups.filter((group: StudentGroup) => {
    const matchesSearch = group.name.toLowerCase().includes(groupSearchTerm.toLowerCase());
    const matchesSchool = groupSchoolFilter === "all-schools" || group.schoolId.toString() === groupSchoolFilter;
    const matchesClass = groupClassFilter === "all-classes" || group.classId.toString() === groupClassFilter;
    return matchesSearch && matchesSchool && matchesClass;
  });

  // Get unique academic years from classes
  const academicYears = Array.from(new Set(classes.map((c: Class) => c.academicYear)));

  // Clear filters functions
  const clearClassFilters = () => {
    setClassSearchTerm("");
    setClassAcademicYearFilter("all-years");
    setClassSchoolFilter("all-schools");
  };

  const clearGroupFilters = () => {
    setGroupSearchTerm("");
    setGroupSchoolFilter("all-schools");
    setGroupClassFilter("all-classes");
  };

  if (classesLoading || teachersLoading || schoolsLoading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="classes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="classes" className="flex items-center gap-2">
            <School className="h-4 w-4" />
            Classes
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Student Groups
          </TabsTrigger>
        </TabsList>

        <TabsContent value="classes">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Class Management</CardTitle>
                  <CardDescription>
                    Create and manage classes for your school ({filteredClasses.length} of {classes.length} classes)
                  </CardDescription>
                </div>
                <Dialog open={isCreateClassOpen} onOpenChange={setIsCreateClassOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Class
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Class</DialogTitle>
                      <DialogDescription>
                        Add a new class to your school
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateClass} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Class Name</Label>
                        <Input
                          id="name"
                          name="name"
                          placeholder="e.g., Kindergarten A"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="academicYear">Academic Year</Label>
                        <Input
                          id="academicYear"
                          name="academicYear"
                          placeholder="e.g., 2024-2025"
                          defaultValue="2024-2025"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="capacity">Class Capacity</Label>
                        <Input
                          id="capacity"
                          name="capacity"
                          type="number"
                          placeholder="25"
                          defaultValue="25"
                          required
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsCreateClassOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit"
                          disabled={createClassMutation.isPending}
                        >
                          {createClassMutation.isPending ? 'Creating...' : 'Create Class'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {/* Class Filters */}
              <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center gap-2">
                  <Label htmlFor="classSearch" className="text-sm font-medium">Search:</Label>
                  <Input
                    id="classSearch"
                    placeholder="Search by class name..."
                    value={classSearchTerm}
                    onChange={(e) => setClassSearchTerm(e.target.value)}
                    className="w-48"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="classSchoolFilter" className="text-sm font-medium">School:</Label>
                  <Select value={classSchoolFilter} onValueChange={setClassSchoolFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Schools" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-schools">All Schools</SelectItem>
                      {schools.map((school: School) => (
                        <SelectItem key={school.id} value={school.id.toString()}>
                          {school.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="classAcademicYearFilter" className="text-sm font-medium">Academic Year:</Label>
                  <Select value={classAcademicYearFilter} onValueChange={setClassAcademicYearFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-years">All Years</SelectItem>
                      {academicYears.map((year: string) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearClassFilters}
                  className="ml-auto"
                >
                  Clear Filters
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class Name</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>Academic Year</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClasses.map((classData: Class) => (
                    <TableRow key={classData.id}>
                      <TableCell className="font-medium">
                        {classData.name}
                      </TableCell>
                      <TableCell>{getSchoolName(classData.schoolId)}</TableCell>
                      <TableCell>{classData.academicYear}</TableCell>
                      <TableCell>{classData.capacity}</TableCell>
                      <TableCell>
                        <Badge variant={classData.isActive ? "default" : "secondary"}>
                          {classData.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingClass(classData)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteClassMutation.mutate(classData.id)}
                            disabled={deleteClassMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Student Groups</CardTitle>
                  <CardDescription>
                    Manage student groups within classes ({filteredGroups.length} of {studentGroups.length} groups)
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedClassId?.toString() || "all"}
                    onValueChange={(value) => 
                      setSelectedClassId(value === "all" ? null : parseInt(value))
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {classes.map((classData: Class) => (
                        <SelectItem key={classData.id} value={classData.id.toString()}>
                          {classData.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Group
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Student Group</DialogTitle>
                        <DialogDescription>
                          Create a new student group within a class
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateGroup} className="space-y-4">
                        <div>
                          <Label htmlFor="groupName">Group Name</Label>
                          <Input
                            id="groupName"
                            name="name"
                            placeholder="e.g., Reading Group A"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="classId">Class</Label>
                          <Select name="classId" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a class" />
                            </SelectTrigger>
                            <SelectContent>
                              {classes.map((classData: Class) => (
                                <SelectItem key={classData.id} value={classData.id.toString()}>
                                  {classData.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="teacherId">Assigned Teacher</Label>
                          <Select name="teacherId">
                            <SelectTrigger>
                              <SelectValue placeholder="Select a teacher (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">No teacher assigned</SelectItem>
                              {teachers.map((teacher: Teacher) => (
                                <SelectItem key={teacher.id} value={teacher.id.toString()}>
                                  {teacher.fullName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="maxStudents">Max Students</Label>
                          <Input
                            id="maxStudents"
                            name="maxStudents"
                            type="number"
                            placeholder="10"
                            defaultValue="10"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            name="description"
                            placeholder="Brief description of the group..."
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsCreateGroupOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit"
                            disabled={createGroupMutation.isPending}
                          >
                            {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Group Filters */}
              <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center gap-2">
                  <Label htmlFor="groupSearch" className="text-sm font-medium">Search:</Label>
                  <Input
                    id="groupSearch"
                    placeholder="Search by group name..."
                    value={groupSearchTerm}
                    onChange={(e) => setGroupSearchTerm(e.target.value)}
                    className="w-48"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="groupSchoolFilter" className="text-sm font-medium">School:</Label>
                  <Select value={groupSchoolFilter} onValueChange={setGroupSchoolFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Schools" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-schools">All Schools</SelectItem>
                      {schools.map((school: School) => (
                        <SelectItem key={school.id} value={school.id.toString()}>
                          {school.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="groupClassFilter" className="text-sm font-medium">Class:</Label>
                  <Select value={groupClassFilter} onValueChange={setGroupClassFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Classes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-classes">All Classes</SelectItem>
                      {classes.map((classData: Class) => (
                        <SelectItem key={classData.id} value={classData.id.toString()}>
                          {classData.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearGroupFilters}
                  className="ml-auto"
                >
                  Clear Filters
                </Button>
              </div>

              {groupsLoading ? (
                <div className="flex justify-center p-4">Loading groups...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Group Name</TableHead>
                      <TableHead>School</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Assigned Teacher</TableHead>
                      <TableHead>Max Students</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGroups.map((group: StudentGroup) => (
                      <TableRow key={group.id}>
                        <TableCell className="font-medium">
                          {group.name}
                        </TableCell>
                        <TableCell>{getSchoolName(group.schoolId)}</TableCell>
                        <TableCell>{getClassName(group.classId)}</TableCell>
                        <TableCell>{getTeacherName(group.teacherId)}</TableCell>
                        <TableCell>{group.maxStudents}</TableCell>
                        <TableCell>
                          <Badge variant={group.isActive ? "default" : "secondary"}>
                            {group.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingGroup(group)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteGroupMutation.mutate(group.id)}
                              disabled={deleteGroupMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Class Dialog */}
      {editingClass && (
        <Dialog open={!!editingClass} onOpenChange={() => setEditingClass(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Class</DialogTitle>
              <DialogDescription>
                Update class information
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateClass} className="space-y-4">
              <div>
                <Label htmlFor="editName">Class Name</Label>
                <Input
                  id="editName"
                  name="name"
                  defaultValue={editingClass.name}
                  required
                />
              </div>
              <div>
                <Label htmlFor="editAcademicYear">Academic Year</Label>
                <Input
                  id="editAcademicYear"
                  name="academicYear"
                  defaultValue={editingClass.academicYear}
                  required
                />
              </div>
              <div>
                <Label htmlFor="editCapacity">Class Capacity</Label>
                <Input
                  id="editCapacity"
                  name="capacity"
                  type="number"
                  defaultValue={editingClass.capacity}
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="editIsActive"
                  name="isActive"
                  defaultChecked={editingClass.isActive}
                />
                <Label htmlFor="editIsActive">Active</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingClass(null)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateClassMutation.isPending}
                >
                  {updateClassMutation.isPending ? 'Updating...' : 'Update Class'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Group Dialog */}
      {editingGroup && (
        <Dialog open={!!editingGroup} onOpenChange={() => setEditingGroup(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Student Group</DialogTitle>
              <DialogDescription>
                Update student group information
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateGroup} className="space-y-4">
              <div>
                <Label htmlFor="editGroupName">Group Name</Label>
                <Input
                  id="editGroupName"
                  name="name"
                  defaultValue={editingGroup.name}
                  required
                />
              </div>
              <div>
                <Label htmlFor="editTeacherId">Assigned Teacher</Label>
                <Select name="teacherId" defaultValue={editingGroup.teacherId?.toString() || ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No teacher assigned</SelectItem>
                    {teachers.map((teacher: Teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id.toString()}>
                        {teacher.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="editMaxStudents">Max Students</Label>
                <Input
                  id="editMaxStudents"
                  name="maxStudents"
                  type="number"
                  defaultValue={editingGroup.maxStudents}
                  required
                />
              </div>
              <div>
                <Label htmlFor="editDescription">Description</Label>
                <Textarea
                  id="editDescription"
                  name="description"
                  defaultValue={editingGroup.description || ""}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="editGroupIsActive"
                  name="isActive"
                  defaultChecked={editingGroup.isActive}
                />
                <Label htmlFor="editGroupIsActive">Active</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingGroup(null)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateGroupMutation.isPending}
                >
                  {updateGroupMutation.isPending ? 'Updating...' : 'Update Group'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}