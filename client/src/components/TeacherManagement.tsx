import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, GraduationCap, Users, BookOpen, School, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import FilterBar from "@/components/ui/FilterBar";
import PaginatedTable from "@/components/ui/PaginatedTable";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const teacherFormSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  subjects: z.array(z.string()).min(1, "Please select at least one subject"),
  assignedClasses: z.array(z.number()).optional(),
  phone: z.string().optional(),
  qualifications: z.string().optional(),
});

type TeacherFormData = z.infer<typeof teacherFormSchema>;

const subjectOptions = [
  "Language & Literacy",
  "Mathematics",
  "Science",
  "Social Studies",
  "Art & Creativity",
  "Physical Education",
  "Music",
  "Character Development",
];

export default function TeacherManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSchool, setSelectedSchool] = useState("ALL_SCHOOLS");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("ALL_YEARS");
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Queries
  const { data: teachers, isLoading: teachersLoading } = useQuery({
    queryKey: ['/api/admin/teachers'],
  });

  const { data: studentGroups, isLoading: groupsLoading } = useQuery({
    queryKey: ['/api/student-groups'],
  });

  const { data: allSchools, isLoading: schoolsLoading } = useQuery({
    queryKey: ['/api/schools'],
  });
  
  // Get effective school from user data
  const effectiveSchool = (user as any)?.effectiveSchool;
  
  // Limit schools to effective school for non-superadmin users
  const schools = effectiveSchool ? [effectiveSchool] : (allSchools || []);

  // Form setup
  const form = useForm<TeacherFormData>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      subjects: [],
      assignedClasses: [],
      phone: "",
      qualifications: "",
    },
  });

  // Mutations
  const createTeacherMutation = useMutation({
    mutationFn: async (data: TeacherFormData) => {
      return apiRequest('POST', '/api/admin/teachers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/teachers'] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Teacher created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create teacher",
        variant: "destructive",
      });
    },
  });

  const updateTeacherMutation = useMutation({
    mutationFn: async (data: TeacherFormData & { id: number }) => {
      return apiRequest('PATCH', `/api/admin/teachers/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/teachers'] });
      setIsDialogOpen(false);
      setEditingTeacher(null);
      form.reset();
      toast({
        title: "Success",
        description: "Teacher updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update teacher",
        variant: "destructive",
      });
    },
  });

  const deleteTeacherMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/admin/teachers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/teachers'] });
      toast({
        title: "Success",
        description: "Teacher deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete teacher",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: TeacherFormData) => {
    if (editingTeacher) {
      updateTeacherMutation.mutate({ ...data, id: editingTeacher.id });
    } else {
      createTeacherMutation.mutate(data);
    }
  };

  const handleEdit = (teacher: any) => {
    setEditingTeacher(teacher);
    form.reset({
      fullName: teacher.fullName,
      email: teacher.email || "",
      subjects: teacher.subjects || [],
      assignedClasses: teacher.assignedClasses || [],
      phone: teacher.phone || "",
      qualifications: teacher.qualifications || "",
    });
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingTeacher(null);
    form.reset();
    setIsDialogOpen(true);
  };

  // Get unique academic years from all teacher assignments
  const academicYears = Array.from(new Set(
    (teachers || []).flatMap((teacher: any) => 
      teacher.assignments?.map((assignment: any) => assignment.academicYear) || 
      (teacher.academicYear ? [teacher.academicYear] : [])
    ).filter(Boolean)
  )) || [];
  
  // Ensure current year is included and at the top
  if (!academicYears.includes("2025/2026")) {
    academicYears.unshift("2025/2026");
  } else {
    // Move 2025/2026 to the front if it exists
    const currentIndex = academicYears.indexOf("2025/2026");
    if (currentIndex > 0) {
      academicYears.splice(currentIndex, 1);
      academicYears.unshift("2025/2026");
    }
  }

  // Filter teachers
  const filteredTeachers = (teachers || []).filter((teacher: any) => {
    const teacherName = teacher.fullName || `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.email || '';
    const matchesSearch = teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         teacher.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSchool = !selectedSchool || selectedSchool === "ALL_SCHOOLS" || teacher.schoolName === selectedSchool;
    
    // Check if teacher has assignment for selected academic year
    const matchesAcademicYear = !selectedAcademicYear || selectedAcademicYear === "ALL_YEARS" || 
      (teacher.assignments && teacher.assignments.some((assignment: any) => assignment.academicYear === selectedAcademicYear)) ||
      (teacher.academicYear === selectedAcademicYear);
    
    return matchesSearch && matchesSchool && matchesAcademicYear;
  });

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedSchool("ALL_SCHOOLS");
    setSelectedAcademicYear("ALL_YEARS");
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm || (selectedSchool && selectedSchool !== "ALL_SCHOOLS") || (selectedAcademicYear && selectedAcademicYear !== "ALL_YEARS");

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Teacher Management</h2>
          <p className="text-gray-600">Manage teaching staff and class assignments</p>
        </div>
        <Button onClick={handleAdd} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Teacher
        </Button>
      </div>

      {/* Search and Filters */}
      <FilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search teachers by name or email..."
        filters={[
          {
            id: "school",
            label: "School",
            value: selectedSchool,
            onChange: setSelectedSchool,
            options: [
              { value: "ALL_SCHOOLS", label: "All Schools" },
              ...((schools || []).map((school: any) => ({
                value: school.name,
                label: school.name
              })))
            ],
            placeholder: "All Schools",
            icon: <School className="h-4 w-4 text-gray-500" />
          },
          {
            id: "academicYear",
            label: "Academic Year",
            value: selectedAcademicYear,
            onChange: setSelectedAcademicYear,
            options: [
              { value: "ALL_YEARS", label: "All Years" },
              ...academicYears.map((year) => ({
                value: year,
                label: year
              }))
            ],
            placeholder: "All Years",
            icon: <Calendar className="h-4 w-4 text-gray-500" />
          }
        ]}
        onClearFilters={clearFilters}
        hasActiveFilters={!!hasActiveFilters}
        resultCount={filteredTeachers.length}
        totalCount={(teachers || []).length}
        itemName="teachers"
      />

      {/* Teachers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Teachers List</CardTitle>
          <CardDescription>
            View and manage all teaching staff
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PaginatedTable
            data={filteredTeachers}
            loading={teachersLoading}
            itemsPerPage={10}
            emptyMessage="No teachers found"
            columns={[
              { key: "fullName", label: "Name", render: (teacher) => <span className="font-medium">{teacher.fullName}</span> },
              { key: "email", label: "Email", render: (teacher) => teacher.email || "Not provided" },
              { 
                key: "school", 
                label: "School", 
                render: (teacher) => (
                  <div className="flex items-center gap-1">
                    <School className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{teacher.schoolName || "Not assigned"}</span>
                  </div>
                )
              },
              { 
                key: "academicYear", 
                label: "Academic Year", 
                render: (teacher) => (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{teacher.academicYear || "2025/2026"}</span>
                  </div>
                )
              },
              { 
                key: "subjects", 
                label: "Subjects", 
                render: (teacher) => (
                  <div className="flex flex-wrap gap-1">
                    {teacher.subjects?.slice(0, 2).map((subject: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {subject}
                      </Badge>
                    ))}
                    {teacher.subjects?.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{teacher.subjects.length - 2} more
                      </Badge>
                    )}
                  </div>
                )
              },
              { 
                key: "assignedClasses", 
                label: "Assigned Classes", 
                render: (teacher) => (
                  <div className="flex flex-wrap gap-1">
                    {teacher.assignedClasses?.map((className: string) => (
                      <Badge key={className} variant="secondary" className="text-xs">
                        {className}
                      </Badge>
                    ))}
                    {!teacher.assignedClasses?.length && (
                      <span className="text-sm text-gray-500">No classes</span>
                    )}
                  </div>
                )
              },
              { 
                key: "students", 
                label: "Students",
                render: (teacher) => (
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{teacher.studentCount || 0}</span>
                  </div>
                )
              },
              { 
                key: "actions", 
                label: "Actions", 
                render: (teacher) => (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(teacher)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <ConfirmDialog
                      title="Delete Teacher"
                      description={`Are you sure you want to delete ${teacher.fullName}? This action cannot be undone.`}
                      onConfirm={() => deleteTeacherMutation.mutate(teacher.id)}
                      disabled={deleteTeacherMutation.isPending}
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

      {/* Add/Edit Teacher Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTeacher ? "Edit Teacher" : "Add New Teacher"}
            </DialogTitle>
            <DialogDescription>
              {editingTeacher 
                ? "Update teacher information below"
                : "Fill in the teacher details below"
              }
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter teacher's full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="teacher@school.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subjects"
                render={() => (
                  <FormItem>
                    <FormLabel>Subjects</FormLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {subjectOptions.map((subject) => (
                        <FormField
                          key={subject}
                          control={form.control}
                          name="subjects"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={subject}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(subject)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, subject])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== subject
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  {subject}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="assignedClasses"
                render={() => (
                  <FormItem>
                    <FormLabel>Assigned Classes</FormLabel>
                    <div className="grid grid-cols-1 gap-2">
                      <p className="text-sm text-gray-500">Class assignments are managed through the user's school assignments.</p>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="qualifications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qualifications</FormLabel>
                    <FormControl>
                      <Input placeholder="Teaching qualifications" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createTeacherMutation.isPending || updateTeacherMutation.isPending}>
                  {createTeacherMutation.isPending || updateTeacherMutation.isPending
                    ? "Saving..."
                    : editingTeacher
                    ? "Update Teacher"
                    : "Add Teacher"
                  }
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}