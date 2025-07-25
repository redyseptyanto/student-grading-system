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
import { Plus, Edit, Trash2, Users, UserPlus, School, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BulkStudentAddDialog from "./BulkStudentAddDialog";
import FilterBar from "@/components/ui/FilterBar";

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
    const matchesClass = filterClass === "ALL_CLASSES" || student.classId?.toString() === filterClass;
    const matchesYear = filterYear === "ALL_YEARS" || student.academicYear === filterYear;
    return matchesSearch && matchesClass && matchesYear;
  }) || [];

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setFilterClass("ALL_CLASSES");
    setFilterYear("ALL_YEARS");
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm || (filterClass && filterClass !== "ALL_CLASSES") || (filterYear && filterYear !== "ALL_YEARS");

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
      <FilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search students by name..."
        filters={[
          {
            id: "class",
            label: "Class",
            value: filterClass,
            onChange: setFilterClass,
            options: [
              { value: "ALL_CLASSES", label: "All Classes" },
              ...(classes?.map((cls: any) => ({
                value: cls.id.toString(),
                label: cls.name
              })) || [])
            ],
            placeholder: "All Classes",
            icon: <School className="h-4 w-4 text-gray-500" />
          },
          {
            id: "academicYear",
            label: "Academic Year",
            value: filterYear,
            onChange: setFilterYear,
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
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
        resultCount={filteredStudents.length}
        totalCount={students?.length || 0}
        itemName="students"
      />

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Students List</CardTitle>
          <CardDescription>
            View and manage all students in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {studentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p>Loading students...</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NSP</TableHead>
                    <TableHead>NIS</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Nickname</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Academic Year</TableHead>
                    <TableHead>No Absence</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student: any) => (
                    <TableRow key={student.id}>
                      <TableCell>{student.nsp || "-"}</TableCell>
                      <TableCell>{student.nis || "-"}</TableCell>
                      <TableCell className="font-medium">{student.fullName}</TableCell>
                      <TableCell>{student.nickname || "-"}</TableCell>
                      <TableCell>{student.gender || "-"}</TableCell>
                      <TableCell>
                        {schools?.find((s: any) => s.id === student.schoolId)?.schoolCode || "-"}
                      </TableCell>
                      <TableCell>
                        {classes?.find((c: any) => c.id === student.classId)?.name || 'Unassigned'}
                      </TableCell>
                      <TableCell>
                        {student.groupId ? `Group ${student.groupId}` : "-"}
                      </TableCell>
                      <TableCell>{student.academicYear || '2024-2025'}</TableCell>
                      <TableCell>{student.noAbsence || 0}</TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
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