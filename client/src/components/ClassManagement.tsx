import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
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
import FilterBar from "@/components/ui/FilterBar";
import PaginatedTable from "@/components/ui/PaginatedTable";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Edit,
  Trash2,
  Users,
  UserPlus,
  Settings,
  School,
  BookOpen,
  Calendar,
} from "lucide-react";

// ClassGroupManager Component
interface ClassGroupManagerProps {
  classId: number;
  className: string;
  teachers: Teacher[];
  onGroupChange: () => void;
}

function ClassGroupManager({ classId, className, teachers, onGroupChange }: ClassGroupManagerProps) {
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupTeacherId, setNewGroupTeacherId] = useState<string>("no-teacher");
  const [newGroupDescription, setNewGroupDescription] = useState("");

  const [editingInlineGroup, setEditingInlineGroup] = useState<StudentGroup | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set());
  const [assignToGroupId, setAssignToGroupId] = useState<string>("no-group");
  const { toast } = useToast();

  // Ensure teachers is available
  if (!teachers || !Array.isArray(teachers)) {
    console.warn('ClassGroupManager: teachers prop is not an array:', teachers);
  }

  // Get all groups and filter by class on frontend for now
  const { data: allGroups, isLoading: groupsLoading } = useQuery<StudentGroup[]>({
    queryKey: ['/api/student-groups'],
  });
  
  // Filter groups for this specific class
  const classGroups = allGroups?.filter(group => group.classId === classId) || [];
  
  // Debug log
  console.log('All groups:', allGroups, 'Class groups for', classId, ':', classGroups, 'Loading:', groupsLoading);

  // Get students in this class  
  const { data: classStudents, isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ['/api/students'],
    select: (data: Student[]) => data.filter((student: Student) => student.classId === classId),
  });

  // Create group mutation
  const createInlineGroupMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/student-groups', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/student-groups'] });
      onGroupChange();
      setNewGroupName("");
      setNewGroupTeacherId("no-teacher");
      setNewGroupDescription("");

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

  // Update group mutation
  const updateInlineGroupMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest('PUT', `/api/student-groups/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/student-groups'] });
      onGroupChange();
      setEditingInlineGroup(null);
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

  // Delete group mutation
  const deleteInlineGroupMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/student-groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/student-groups'] });
      onGroupChange();
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

  // Assign students to group mutation
  const assignStudentsMutation = useMutation({
    mutationFn: async ({ studentIds, groupId }: { studentIds: number[]; groupId: number | null }) => {
      const promises = studentIds.map(studentId => 
        apiRequest('PUT', `/api/students/${studentId}/assign-group`, { groupId })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      setSelectedStudents(new Set());
      setAssignToGroupId("no-group");
      toast({ title: "Success", description: "Students assigned to group successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign students to group",
        variant: "destructive",
      });
    },
  });

  const handleCreateInlineGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const data = {
      name: newGroupName,
      classId: classId,
      teacherId: newGroupTeacherId && newGroupTeacherId !== "no-teacher" ? parseInt(newGroupTeacherId) : null,
      description: newGroupDescription,
      schoolId: teachers[0]?.schoolId || 1, // Use teacher's school ID as fallback
    };
    createInlineGroupMutation.mutate(data);
  };

  const handleUpdateInlineGroup = (group: StudentGroup, formData: FormData) => {
    const teacherId = formData.get('teacherId') as string;
    const data = {
      name: formData.get('name') as string,
      teacherId: teacherId && teacherId !== "no-teacher" ? parseInt(teacherId) : null,
      description: formData.get('description') as string,
      isActive: formData.get('isActive') === 'on',
    };
    updateInlineGroupMutation.mutate({ id: group.id, data });
  };

  const getTeacherName = (teacherId?: number) => {
    const teacher = teachers.find((t: Teacher) => t.id == teacherId);
    return teacher ? (teacher.fullName || `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.email) : 'Unassigned';
  };

  const getGroupName = (groupId?: number) => {
    if (!groupId) return 'No Group';
    if (!Array.isArray(classGroups)) return 'Unknown Group';
    const group = classGroups.find(g => g.id === groupId);
    return group ? group.name : 'Unknown Group';
  };

  const handleStudentToggle = (studentId: number) => {
    const newSelection = new Set(selectedStudents);
    if (newSelection.has(studentId)) {
      newSelection.delete(studentId);
    } else {
      newSelection.add(studentId);
    }
    setSelectedStudents(newSelection);
  };

  const handleAssignStudents = () => {
    if (selectedStudents.size === 0) {
      toast({
        title: "Error",
        description: "Please select at least one student to assign",
        variant: "destructive",
      });
      return;
    }

    const groupId = assignToGroupId === "no-group" ? null : parseInt(assignToGroupId);
    assignStudentsMutation.mutate({
      studentIds: Array.from(selectedStudents),
      groupId
    });
  };

  const handleSelectAll = () => {
    if (Array.isArray(classStudents) && selectedStudents.size === classStudents.length) {
      setSelectedStudents(new Set());
    } else if (Array.isArray(classStudents)) {
      setSelectedStudents(new Set(classStudents.map(s => s.id)));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-medium mb-2">Groups in {className}</h4>
        <p className="text-sm text-gray-600 mb-4">
          Create and manage student groups within this class
        </p>
      </div>

      {/* Add New Group Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add New Group</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateInlineGroup} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="inlineGroupName">Group Name</Label>
                <Input
                  id="inlineGroupName"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., Reading Group A"
                  required
                />
              </div>
              <div>
                <Label htmlFor="inlineGroupTeacher">Assigned Teacher</Label>
                <Select value={newGroupTeacherId} onValueChange={setNewGroupTeacherId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select teacher (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-teacher">No teacher assigned</SelectItem>
                    {teachers && Array.isArray(teachers) && teachers.length > 0 ? (
                      teachers.map((teacher: any) => (
                        <SelectItem key={teacher.id} value={teacher.id.toString()}>
                          {teacher.fullName || `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.email}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="loading" disabled>Loading teachers...</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="inlineGroupDescription">Description</Label>
                <Input
                  id="inlineGroupDescription"
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="Brief description..."
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button 
                type="submit"
                disabled={createInlineGroupMutation.isPending || !newGroupName.trim()}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {createInlineGroupMutation.isPending ? 'Creating...' : 'Add Group'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Existing Groups */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Existing Groups ({Array.isArray(classGroups) ? classGroups.length : 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {groupsLoading ? (
            <div className="flex justify-center p-4">Loading groups...</div>
          ) : !Array.isArray(classGroups) || classGroups.length === 0 ? (
            <div className="text-center p-6 text-gray-500">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No groups created yet</p>
              <p className="text-sm">Use the form above to create the first group</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Array.isArray(classGroups) && classGroups.map((group: StudentGroup) => (
                <div key={group.id} className="border rounded-lg p-4">
                  {editingInlineGroup?.id === group.id ? (
                    // Edit form
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      handleUpdateInlineGroup(group, formData);
                    }} className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label>Group Name</Label>
                          <Input name="name" defaultValue={group.name} required />
                        </div>
                        <div>
                          <Label>Teacher</Label>
                          <Select name="teacherId" defaultValue={group.teacherId?.toString() || "no-teacher"}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="no-teacher">No teacher assigned</SelectItem>
                              {teachers && Array.isArray(teachers) && teachers.map((teacher: any) => (
                                <SelectItem key={teacher.id} value={teacher.id.toString()}>
                                  {teacher.fullName || `${teacher.firstName} ${teacher.lastName}`.trim() || teacher.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Description</Label>
                          <Input name="description" defaultValue={group.description || ""} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Switch name="isActive" defaultChecked={group.isActive} />
                          <Label>Active</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingInlineGroup(null)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit"
                            size="sm"
                            disabled={updateInlineGroupMutation.isPending}
                          >
                            {updateInlineGroupMutation.isPending ? 'Saving...' : 'Save'}
                          </Button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    // Display mode
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h5 className="font-medium">{group.name}</h5>
                          <Badge variant={group.isActive ? "default" : "secondary"}>
                            {group.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          <span>Teacher: {getTeacherName(group.teacherId)}</span>
                          {group.description && (
                            <>
                              <span className="mx-2">•</span>
                              <span>{group.description}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingInlineGroup(group)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteInlineGroupMutation.mutate(group.id)}
                          disabled={deleteInlineGroupMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Assignment Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assign Students to Groups</CardTitle>
          <p className="text-sm text-gray-600">
            Select students from {className} and assign them to groups
          </p>
        </CardHeader>
        <CardContent>
          {studentsLoading ? (
            <div className="flex justify-center p-4">Loading students...</div>
          ) : !Array.isArray(classStudents) || classStudents.length === 0 ? (
            <div className="text-center p-6 text-gray-500">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No students in this class</p>
              <p className="text-sm">Add students to this class first</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Assignment Controls */}
              <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="assignToGroup">Assign selected students to:</Label>
                  <Select value={assignToGroupId} onValueChange={setAssignToGroupId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-group">Remove from groups</SelectItem>
                      {Array.isArray(classGroups) && classGroups.filter(g => g.isActive).map((group: StudentGroup) => (
                        <SelectItem key={group.id} value={group.id.toString()}>
                          {group.name} ({getTeacherName(group.teacherId)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                  >
                    {Array.isArray(classStudents) && selectedStudents.size === classStudents.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button
                    onClick={handleAssignStudents}
                    disabled={selectedStudents.size === 0 || assignStudentsMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    {assignStudentsMutation.isPending ? 'Assigning...' : `Assign (${selectedStudents.size})`}
                  </Button>
                </div>
              </div>

              {/* Students List */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Students in {className} ({Array.isArray(classStudents) ? classStudents.length : 0} total)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {Array.isArray(classStudents) && classStudents.map((student: Student) => (
                    <div
                      key={student.id}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        selectedStudents.has(student.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleStudentToggle(student.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedStudents.has(student.id)}
                          onCheckedChange={() => handleStudentToggle(student.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{student.fullName}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Group: {getGroupName(student.groupId)}
                          </div>
                          <div className="text-xs text-gray-400">
                            ID: {student.id}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedStudents.size > 0 && (
                <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                  <strong>{selectedStudents.size}</strong> student{selectedStudents.size !== 1 ? 's' : ''} selected
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

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
  id: number | string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
}

interface Student {
  id: number;
  fullName: string;
  classId: number;
  groupId?: number | null;
  isActive: boolean;
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
  const { user } = useAuth();
  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [editingGroup, setEditingGroup] = useState<StudentGroup | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  
  // Get effective school from user data
  const effectiveSchool = (user as any)?.effectiveSchool;
  
  // Filter states
  const [classSearchTerm, setClassSearchTerm] = useState("");
  const [classAcademicYearFilter, setClassAcademicYearFilter] = useState("ALL_YEARS");
  const [classSchoolFilter, setClassSchoolFilter] = useState("ALL_SCHOOLS");
  const [groupSearchTerm, setGroupSearchTerm] = useState("");
  const [groupSchoolFilter, setGroupSchoolFilter] = useState("ALL_SCHOOLS");
  const [groupClassFilter, setGroupClassFilter] = useState("ALL_CLASSES");

  // Fetch data
  const { data: classes = [], isLoading: classesLoading } = useQuery<(Class & { studentCount?: number })[]>({
    queryKey: ['/api/classes'],
    queryFn: () => apiRequest('GET', '/api/classes?withStudentCount=true'),
  });

  const { data: teachersData, isLoading: teachersLoading } = useQuery<Teacher[]>({
    queryKey: ['/api/admin/teachers', effectiveSchool?.id],
    queryFn: () => {
      const schoolId = effectiveSchool?.id;
      return apiRequest('GET', schoolId ? `/api/admin/teachers?schoolId=${schoolId}` : '/api/admin/teachers');
    },
    enabled: true, // Always enable - API will handle school filtering
  });
  
  // Ensure teachers is always an array
  const teachers = Array.isArray(teachersData) ? teachersData : [];
  
  // Debug log teachers data
  console.log('ClassManagement teachers data:', { teachersData, teachers, teachersLoading, effectiveSchool });

  // For non-superadmin users, use their effective school instead of fetching all schools
  const schools = effectiveSchool ? [effectiveSchool] : [];
  const schoolsLoading = false;

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
      schoolId: effectiveSchool?.id || teachers[0]?.schoolId || 1,
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
      schoolId: effectiveSchool?.id || teachers[0]?.schoolId || 1,
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
    const teacher = teachers.find((t: Teacher) => t.id == teacherId);
    return teacher ? (teacher.fullName || `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.email) : 'Unassigned';
  };

  const getClassName = (classId: number) => {
    const classData = (classes || []).find((c: Class) => c.id === classId);
    return classData ? classData.name : 'Unknown Class';
  };

  const getSchoolName = (schoolId: number) => {
    // Use the effective school if it matches the requested schoolId
    if (effectiveSchool && effectiveSchool.id === schoolId) {
      return effectiveSchool.name;
    }
    // Fallback to searching in schools array (for superadmin users)
    const school = schools.find((s: School) => s.id === schoolId);
    return school ? school.name : (effectiveSchool?.name || 'School');
  };

  // Get unique academic years from classes (ensure classes is an array)
  const academicYears = Array.from(new Set((classes || []).map((c: Class) => c.academicYear)));

  // Filter functions (ensure classes is an array)
  const filteredClasses = (classes || []).filter((classData: Class) => {
    const matchesSearch = classData.name.toLowerCase().includes(classSearchTerm.toLowerCase());
    const matchesAcademicYear = classAcademicYearFilter === "ALL_YEARS" || classData.academicYear === classAcademicYearFilter;
    const matchesSchool = classSchoolFilter === "ALL_SCHOOLS" || classData.schoolId.toString() === classSchoolFilter;
    return matchesSearch && matchesAcademicYear && matchesSchool;
  });

  const filteredGroups = studentGroups.filter((group: StudentGroup) => {
    const matchesSearch = group.name.toLowerCase().includes(groupSearchTerm.toLowerCase());
    const matchesSchool = groupSchoolFilter === "ALL_SCHOOLS" || group.schoolId.toString() === groupSchoolFilter;
    const matchesClass = groupClassFilter === "ALL_CLASSES" || group.classId.toString() === groupClassFilter;
    return matchesSearch && matchesSchool && matchesClass;
  });

  // Clear filters functions
  const clearClassFilters = () => {
    setClassSearchTerm("");
    setClassAcademicYearFilter("ALL_YEARS");
    setClassSchoolFilter("ALL_SCHOOLS");
  };

  const clearGroupFilters = () => {
    setGroupSearchTerm("");
    setGroupSchoolFilter("ALL_SCHOOLS");
    setGroupClassFilter("ALL_CLASSES");
  };

  // Check if any filters are active
  const hasActiveClassFilters = classSearchTerm || (classAcademicYearFilter && classAcademicYearFilter !== "ALL_YEARS") || (classSchoolFilter && classSchoolFilter !== "ALL_SCHOOLS");
  const hasActiveGroupFilters = groupSearchTerm || (groupSchoolFilter && groupSchoolFilter !== "ALL_SCHOOLS") || (groupClassFilter && groupClassFilter !== "ALL_CLASSES");

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
                          placeholder="e.g., 2025/2026"
                          defaultValue="2025/2026"
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
              <FilterBar
                searchTerm={classSearchTerm}
                onSearchChange={setClassSearchTerm}
                searchPlaceholder="Search classes by name..."
                filters={[
                  {
                    id: "school",
                    label: "School",
                    value: classSchoolFilter,
                    onChange: setClassSchoolFilter,
                    options: [
                      { value: "ALL_SCHOOLS", label: "All Schools" },
                      ...(schools.map((school: School) => ({
                        value: school.id.toString(),
                        label: school.name
                      })))
                    ],
                    placeholder: "All Schools",
                    icon: <School className="h-4 w-4 text-gray-500" />
                  },
                  {
                    id: "academicYear",
                    label: "Academic Year",
                    value: classAcademicYearFilter,
                    onChange: setClassAcademicYearFilter,
                    options: [
                      { value: "ALL_YEARS", label: "All Years" },
                      ...academicYears.map((year: string) => ({
                        value: year,
                        label: year
                      }))
                    ],
                    placeholder: "All Years",
                    icon: <Calendar className="h-4 w-4 text-gray-500" />
                  }
                ]}
                onClearFilters={clearClassFilters}
                hasActiveFilters={hasActiveClassFilters}
                resultCount={filteredClasses.length}
                totalCount={classes.length}
                itemName="classes"
              />

              <PaginatedTable
                data={filteredClasses}
                loading={classesLoading}
                itemsPerPage={10}
                emptyMessage="No classes found"
                columns={[
                  { key: "name", label: "Class Name", render: (classData) => <span className="font-medium">{classData.name}</span> },
                  { key: "school", label: "School", render: (classData) => getSchoolName(classData.schoolId) },
                  { key: "academicYear", label: "Academic Year" },
                  { key: "studentCount", label: "Student Count", render: (classData) => <span className="font-medium">{classData.studentCount || 0} students</span> },
                  { 
                    key: "status", 
                    label: "Status", 
                    render: (classData) => (
                      <Badge variant={classData.isActive ? "default" : "secondary"}>
                        {classData.isActive ? "Active" : "Inactive"}
                      </Badge>
                    )
                  },
                  { 
                    key: "actions", 
                    label: "Actions", 
                    render: (classData) => (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingClass(classData)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <ConfirmDialog
                          title="Delete Class"
                          description={`Are you sure you want to delete "${classData.name}"? This action cannot be undone and will also delete all associated student groups.`}
                          onConfirm={() => deleteClassMutation.mutate(classData.id)}
                          disabled={deleteClassMutation.isPending}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </ConfirmDialog>
                      </div>
                    )
                  }
                ]}
              />
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
                      {(classes || []).map((classData: Class) => (
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
                              {(classes || []).map((classData: Class) => (
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
                                  {teacher.fullName || `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
              <FilterBar
                searchTerm={groupSearchTerm}
                onSearchChange={setGroupSearchTerm}
                searchPlaceholder="Search groups by name..."
                filters={[
                  {
                    id: "school",
                    label: "School",
                    value: groupSchoolFilter,
                    onChange: setGroupSchoolFilter,
                    options: [
                      { value: "ALL_SCHOOLS", label: "All Schools" },
                      ...(schools.map((school: School) => ({
                        value: school.id.toString(),
                        label: school.name
                      })))
                    ],
                    placeholder: "All Schools",
                    icon: <School className="h-4 w-4 text-gray-500" />
                  },
                  {
                    id: "class",
                    label: "Class",
                    value: groupClassFilter,
                    onChange: setGroupClassFilter,
                    options: [
                      { value: "ALL_CLASSES", label: "All Classes" },
                      ...((classes || []).map((classData: Class) => ({
                        value: classData.id.toString(),
                        label: classData.name
                      })))
                    ],
                    placeholder: "All Classes",
                    icon: <BookOpen className="h-4 w-4 text-gray-500" />
                  }
                ]}
                onClearFilters={clearGroupFilters}
                hasActiveFilters={hasActiveGroupFilters}
                resultCount={filteredGroups.length}
                totalCount={studentGroups.length}
                itemName="groups"
              />

              <PaginatedTable
                data={filteredGroups}
                loading={groupsLoading}
                itemsPerPage={10}
                emptyMessage="No student groups found"
                columns={[
                  { key: "name", label: "Group Name", render: (group) => <span className="font-medium">{group.name}</span> },
                  { key: "school", label: "School", render: (group) => getSchoolName(group.schoolId) },
                  { key: "class", label: "Class", render: (group) => getClassName(group.classId) },
                  { key: "teacher", label: "Assigned Teacher", render: (group) => getTeacherName(group.teacherId) },
                  { key: "maxStudents", label: "Max Students" },
                  { 
                    key: "status", 
                    label: "Status", 
                    render: (group) => (
                      <Badge variant={group.isActive ? "default" : "secondary"}>
                        {group.isActive ? "Active" : "Inactive"}
                      </Badge>
                    )
                  },
                  { 
                    key: "actions", 
                    label: "Actions", 
                    render: (group) => (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingGroup(group)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <ConfirmDialog
                          title="Delete Student Group"
                          description={`Are you sure you want to delete "${group.name}"? This action cannot be undone.`}
                          onConfirm={() => deleteGroupMutation.mutate(group.id)}
                          disabled={deleteGroupMutation.isPending}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </ConfirmDialog>
                      </div>
                    )
                  }
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Class Dialog */}
      {editingClass && (
        <Dialog open={!!editingClass} onOpenChange={() => setEditingClass(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Class: {editingClass.name}</DialogTitle>
              <DialogDescription>
                Update class information and manage student groups
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="class-details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="class-details">Class Details</TabsTrigger>
                <TabsTrigger value="manage-groups">Manage Groups</TabsTrigger>
              </TabsList>
              
              <TabsContent value="class-details" className="space-y-4">
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
                      placeholder="e.g., 2025/2026"
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
              </TabsContent>
              
              <TabsContent value="manage-groups" className="space-y-4">
                {/* Debug teachers before passing to ClassGroupManager */}
                {console.log('About to pass teachers to ClassGroupManager:', teachers, 'length:', teachers.length)}
                <ClassGroupManager 
                  classId={editingClass.id}
                  className={editingClass.name}
                  teachers={teachers}
                  onGroupChange={() => {
                    queryClient.invalidateQueries({ queryKey: ['/api/student-groups'] });
                  }}
                />
              </TabsContent>
            </Tabs>
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
                    {teachers && Array.isArray(teachers) && teachers.map((teacher: any) => (
                      <SelectItem key={teacher.id} value={teacher.id.toString()}>
                        {teacher.fullName || `${teacher.firstName} ${teacher.lastName}`.trim() || teacher.email}
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