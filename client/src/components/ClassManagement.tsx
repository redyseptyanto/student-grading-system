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
  Search,
  Filter,
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
  const [newGroupMaxStudents, setNewGroupMaxStudents] = useState("10");
  const [editingInlineGroup, setEditingInlineGroup] = useState<StudentGroup | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set());
  const [assignToGroupId, setAssignToGroupId] = useState<string>("no-group");
  const { toast } = useToast();

  // Get groups for this specific class
  const { data: classGroups, isLoading: groupsLoading } = useQuery<StudentGroup[]>({
    queryKey: ['/api/student-groups', 'classId', classId],
    queryFn: () => apiRequest('GET', `/api/student-groups?classId=${classId}`),
  });

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
      onGroupChange();
      setNewGroupName("");
      setNewGroupTeacherId("no-teacher");
      setNewGroupDescription("");
      setNewGroupMaxStudents("10");
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
      maxStudents: parseInt(newGroupMaxStudents),
      schoolId: 1, // TODO: Get from user context
    };
    createInlineGroupMutation.mutate(data);
  };

  const handleUpdateInlineGroup = (group: StudentGroup, formData: FormData) => {
    const teacherId = formData.get('teacherId') as string;
    const data = {
      name: formData.get('name') as string,
      teacherId: teacherId && teacherId !== "no-teacher" ? parseInt(teacherId) : null,
      description: formData.get('description') as string,
      maxStudents: parseInt(formData.get('maxStudents') as string),
      isActive: formData.get('isActive') === 'on',
    };
    updateInlineGroupMutation.mutate({ id: group.id, data });
  };

  const getTeacherName = (teacherId?: number) => {
    const teacher = teachers.find((t: Teacher) => t.id === teacherId);
    return teacher ? teacher.fullName : 'Unassigned';
  };

  const getGroupName = (groupId?: number) => {
    if (!groupId) return 'No Group';
    const group = (classGroups as StudentGroup[])?.find(g => g.id === groupId);
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
    if (selectedStudents.size === (classStudents as Student[])?.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set((classStudents as Student[])?.map(s => s.id) || []));
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
                    {teachers.map((teacher: Teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id.toString()}>
                        {teacher.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="inlineGroupMaxStudents">Max Students</Label>
                <Input
                  id="inlineGroupMaxStudents"
                  type="number"
                  value={newGroupMaxStudents}
                  onChange={(e) => setNewGroupMaxStudents(e.target.value)}
                  placeholder="10"
                  required
                />
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
          <CardTitle className="text-base">Existing Groups ({(classGroups as StudentGroup[])?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {groupsLoading ? (
            <div className="flex justify-center p-4">Loading groups...</div>
          ) : (classGroups as StudentGroup[])?.length === 0 ? (
            <div className="text-center p-6 text-gray-500">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No groups created yet</p>
              <p className="text-sm">Use the form above to create the first group</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(classGroups as StudentGroup[])?.map((group: StudentGroup) => (
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
                              {teachers.map((teacher: Teacher) => (
                                <SelectItem key={teacher.id} value={teacher.id.toString()}>
                                  {teacher.fullName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Max Students</Label>
                          <Input name="maxStudents" type="number" defaultValue={group.maxStudents} required />
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
                          <span className="mx-2">•</span>
                          <span>Max: {group.maxStudents} students</span>
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
          ) : (classStudents as Student[])?.length === 0 ? (
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
                      {(classGroups as StudentGroup[])?.filter(g => g.isActive).map((group: StudentGroup) => (
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
                    {selectedStudents.size === (classStudents as Student[])?.length ? 'Deselect All' : 'Select All'}
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
                  Students in {className} ({(classStudents as Student[])?.length || 0} total)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {(classStudents as Student[])?.map((student: Student) => (
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
  id: number;
  fullName: string;
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