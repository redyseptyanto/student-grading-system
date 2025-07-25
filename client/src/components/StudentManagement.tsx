import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, Users, UserPlus, School, Calendar, Search, Filter, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BulkStudentAddDialog from "./BulkStudentAddDialog";
import FilterBar from "@/components/ui/FilterBar";
import PaginatedTable from "@/components/ui/PaginatedTable";

const studentFormSchema = z.object({
  nsp: z.string().optional(),
  nis: z.string().optional(),
  noAbsence: z.number().default(0),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  nickname: z.string().optional(),
  gender: z.string().optional(),
  schoolId: z.string().min(1, "Please select a school"),
  schoolCode: z.string().optional(),
  academicYear: z.string().min(1, "Academic year is required"),
  classId: z.string().min(1, "Please select a class"),
  status: z.string().default("active"),
  dateOfBirth: z.string().optional(),
  parentContact: z.string().optional(),
  address: z.string().optional(),
  isActive: z.boolean().default(true),
});

type StudentFormData = z.infer<typeof studentFormSchema>;

export default function StudentManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSchool, setFilterSchool] = useState<string>("ALL_SCHOOLS");
  const [filterClass, setFilterClass] = useState<string>("ALL_CLASSES");
  const [filterYear, setFilterYear] = useState<string>("ALL_YEARS");
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['/api/admin/students'],
  });

  const { data: classes, isLoading: classesLoading } = useQuery({
    queryKey: ['/api/classes'],
  });

  const { data: schools, isLoading: schoolsLoading } = useQuery({
    queryKey: ['/api/schools'],
  });

  // Form setup
  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      nsp: "",
      nis: "",
      noAbsence: 0,
      fullName: "",
      nickname: "",
      gender: "",
      schoolId: "",
      schoolCode: "",
      academicYear: "2024-2025",
      classId: "",
      status: "active",
      dateOfBirth: "",
      parentContact: "",
      address: "",
      isActive: true,
    },
  });

  // Mutations
  const createStudentMutation = useMutation({
    mutationFn: async (data: StudentFormData) => {
      return apiRequest('POST', '/api/admin/students', {
        ...data,
        classId: parseInt(data.classId),
        schoolId: parseInt(data.schoolId),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Student created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create student",
        variant: "destructive",
      });
    },
  });

  const updateStudentMutation = useMutation({
    mutationFn: async (data: StudentFormData & { id: number }) => {
      return apiRequest('PATCH', `/api/admin/students/${data.id}`, {
        ...data,
        classId: parseInt(data.classId),
        schoolId: parseInt(data.schoolId),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      setIsDialogOpen(false);
      setEditingStudent(null);
      form.reset();
      toast({
        title: "Success",
        description: "Student updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update student",
        variant: "destructive",
      });
    },
  });

  const deleteStudentMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/admin/students/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      toast({
        title: "Success",
        description: "Student deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete student",
        variant: "destructive",
      });
    },
  });

  const toggleStudentStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return apiRequest('PATCH', `/api/admin/students/${id}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      toast({
        title: "Success",
        description: "Student status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update student status",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: StudentFormData) => {
    if (editingStudent) {
      updateStudentMutation.mutate({ ...data, id: editingStudent.id });
    } else {
      createStudentMutation.mutate(data);
    }
  };

  const handleEdit = (student: any) => {
    setEditingStudent(student);
    form.reset({
      nsp: student.nsp || "",
      nis: student.nis || "",
      noAbsence: student.noAbsence || 0,
      fullName: student.fullName || "",
      nickname: student.nickname || "",
      gender: student.gender || "",
      schoolId: student.schoolId?.toString() || "",
      schoolCode: student.schoolCode || "",
      academicYear: student.academicYear || "2024-2025",
      classId: student.classId?.toString() || "",
      status: student.status || "active",
      dateOfBirth: student.dateOfBirth || "",
      parentContact: student.parentContact || "",
      address: student.address || "",
      isActive: student.isActive !== false,
    });
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingStudent(null);
    form.reset();
    setIsDialogOpen(true);
  };

  // Get unique academic years
  const academicYears = [...new Set(students?.map((s: any) => s.academicYear).filter(Boolean))] || [];

  // Filter students
  const filteredStudents = students?.filter((student: any) => {
    const matchesSearch = student.fullName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSchool = filterSchool === "ALL_SCHOOLS" || student.schoolId?.toString() === filterSchool;
    const matchesClass = filterClass === "ALL_CLASSES" || student.classId?.toString() === filterClass;
    const matchesYear = filterYear === "ALL_YEARS" || student.academicYear === filterYear;
    return matchesSearch && matchesSchool && matchesClass && matchesYear;
  }) || [];

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setFilterSchool("ALL_SCHOOLS");
    setFilterClass("ALL_CLASSES");
    setFilterYear("ALL_YEARS");
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm || (filterSchool && filterSchool !== "ALL_SCHOOLS") || (filterClass && filterClass !== "ALL_CLASSES") || (filterYear && filterYear !== "ALL_YEARS");

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Student Management</h2>
          <p className="text-gray-600">Manage all students across classes and academic years</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAdd} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Student
          </Button>
          <Button 
            onClick={() => setIsBulkDialogOpen(true)} 
            variant="outline" 
            className="flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Bulk Add
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search Field on Top */}
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search students by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {(filteredStudents.length !== undefined && students?.length !== undefined) && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Filter className="h-4 w-4" />
                  <span>
                    {filteredStudents.length} of {students?.length || 0} students
                  </span>
                </div>
              )}
            </div>

            {/* Filters Row - Schools, Classes, Years */}
            <div className="flex items-center gap-4">
              {/* School Filter */}
              <div className="flex items-center gap-2 flex-1">
                <School className="h-4 w-4 text-gray-500" />
                <Select value={filterSchool} onValueChange={setFilterSchool}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="All Schools" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL_SCHOOLS">All Schools</SelectItem>
                    {schools?.map((school: any) => (
                      <SelectItem key={school.id} value={school.id.toString()}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Class Filter */}
              <div className="flex items-center gap-2 flex-1">
                <Users className="h-4 w-4 text-gray-500" />
                <Select value={filterClass} onValueChange={setFilterClass}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL_CLASSES">All Classes</SelectItem>
                    {classes?.map((cls: any) => (
                      <SelectItem key={cls.id} value={cls.id.toString()}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Academic Year Filter */}
              <div className="flex items-center gap-2 flex-1">
                <Calendar className="h-4 w-4 text-gray-500" />
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL_YEARS">All Years</SelectItem>
                    {academicYears.map((year: string) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Students List</CardTitle>
          <CardDescription>
            View and manage all students in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PaginatedTable
            data={filteredStudents}
            loading={studentsLoading}
            itemsPerPage={10}
            emptyMessage="No students found"
            columns={[
              { key: "nsp", label: "NSP", render: (student) => student.nsp || "-" },
              { key: "nis", label: "NIS", render: (student) => student.nis || "-" },
              { key: "fullName", label: "Full Name", render: (student) => <span className="font-medium">{student.fullName}</span> },
              { key: "nickname", label: "Nickname", render: (student) => student.nickname || "-" },
              { key: "gender", label: "Gender", render: (student) => student.gender || "-" },
              { key: "school", label: "School", render: (student) => schools?.find((s: any) => s.id === student.schoolId)?.schoolCode || "-" },
              { key: "class", label: "Class", render: (student) => classes?.find((c: any) => c.id === student.classId)?.name || 'Unassigned' },
              { key: "group", label: "Group", render: (student) => student.groupId ? `Group ${student.groupId}` : "-" },
              { key: "academicYear", label: "Academic Year", render: (student) => student.academicYear || '2024-2025' },
              { key: "noAbsence", label: "No Absence", render: (student) => student.noAbsence || 0 },
              { 
                key: "status", 
                label: "Status", 
                render: (student) => (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={student.isActive !== false}
                      onCheckedChange={(checked) => 
                        toggleStudentStatusMutation.mutate({ 
                          id: student.id, 
                          isActive: checked 
                        })
                      }
                    />
                    <Badge variant={student.isActive !== false ? "default" : "secondary"}>
                      {student.status || (student.isActive !== false ? "Active" : "Inactive")}
                    </Badge>
                  </div>
                )
              },
              { 
                key: "actions", 
                label: "Actions", 
                render: (student) => (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(student)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteStudentMutation.mutate(student.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )
              }
            ]}
          />
        </CardContent>
      </Card>

      {/* Add/Edit Student Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingStudent ? "Edit Student" : "Add New Student"}
            </DialogTitle>
            <DialogDescription>
              {editingStudent 
                ? "Update student information below"
                : "Fill in the student details below"
              }
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nsp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NSP</FormLabel>
                      <FormControl>
                        <Input placeholder="Student NSP number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NIS</FormLabel>
                      <FormControl>
                        <Input placeholder="Student NIS number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name*</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter student's full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nickname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nickname</FormLabel>
                      <FormControl>
                        <Input placeholder="Student's nickname" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="schoolId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>School*</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a school" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {schoolsLoading ? (
                            <SelectItem value="loading" disabled>Loading schools...</SelectItem>
                          ) : (
                            schools?.map((school: any) => (
                              <SelectItem key={school.id} value={school.id.toString()}>
                                {school.schoolCode} - {school.name} ({school.program})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="classId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class*</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a class" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {classesLoading ? (
                            <SelectItem value="loading" disabled>Loading classes...</SelectItem>
                          ) : (
                            classes?.map((cls: any) => (
                              <SelectItem key={cls.id} value={cls.id.toString()}>
                                {cls.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="academicYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Academic Year*</FormLabel>
                      <FormControl>
                        <Input placeholder="2024-2025" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="schoolCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>School Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Auto-filled from school selection" {...field} disabled />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="graduated">Graduated</SelectItem>
                          <SelectItem value="transferred">Transferred</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="noAbsence"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>No Absence</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="parentContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Contact</FormLabel>
                      <FormControl>
                        <Input placeholder="Parent phone or email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Student's home address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" disabled={createStudentMutation.isPending || updateStudentMutation.isPending}>
                  {createStudentMutation.isPending || updateStudentMutation.isPending
                    ? "Saving..."
                    : editingStudent
                    ? "Update Student"
                    : "Add Student"
                  }
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Bulk Student Add Dialog */}
      <BulkStudentAddDialog 
        isOpen={isBulkDialogOpen}
        onClose={() => setIsBulkDialogOpen(false)}
      />
    </div>
  );
}