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
import { Plus, Search, Edit, Trash2, GraduationCap, Users, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: teachers, isLoading: teachersLoading } = useQuery({
    queryKey: ['/api/admin/teachers'],
  });

  const { data: classes, isLoading: classesLoading } = useQuery({
    queryKey: ['/api/classes'],
  });

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

  // Filter teachers
  const filteredTeachers = teachers?.filter((teacher: any) => {
    const matchesSearch = teacher.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         teacher.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];

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

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search teachers by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {filteredTeachers.length} teachers
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teachers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Teachers List</CardTitle>
          <CardDescription>
            View and manage all teaching staff
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teachersLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p>Loading teachers...</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Subjects</TableHead>
                    <TableHead>Assigned Classes</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers.map((teacher: any) => (
                    <TableRow key={teacher.id}>
                      <TableCell className="font-medium">
                        {teacher.fullName}
                      </TableCell>
                      <TableCell>
                        {teacher.email || "Not provided"}
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {teacher.assignedClasses?.map((classId: number) => {
                            const className = classes?.find((c: any) => c.id === classId)?.name;
                            return className ? (
                              <Badge key={classId} variant="secondary" className="text-xs">
                                {className}
                              </Badge>
                            ) : null;
                          })}
                          {!teacher.assignedClasses?.length && (
                            <span className="text-sm text-gray-500">No classes</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">
                            {teacher.studentCount || 0}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(teacher)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteTeacherMutation.mutate(teacher.id)}
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
                      {classesLoading ? (
                        <p className="text-sm text-gray-500">Loading classes...</p>
                      ) : (
                        classes?.map((cls: any) => (
                          <FormField
                            key={cls.id}
                            control={form.control}
                            name="assignedClasses"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={cls.id}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(cls.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...(field.value || []), cls.id])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== cls.id
                                              )
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal">
                                    {cls.name} ({cls.academicYear || '2024-2025'})
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))
                      )}
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