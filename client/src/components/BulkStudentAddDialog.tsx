import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X, Users, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const bulkStudentSchema = z.object({
  schoolId: z.string().min(1, "Please select a school"),
  classId: z.string().min(1, "Please select a class"),
  groupId: z.string().optional(),
  academicYear: z.string().min(1, "Academic year is required"),
  studentsText: z.string().min(1, "Please enter student names"),
});

type BulkStudentFormData = z.infer<typeof bulkStudentSchema>;

interface BulkStudentAddDialogProps {
  isOpen: boolean;
  onClose: () => void;
  effectiveSchool?: any;
  schools?: any[];
}

export default function BulkStudentAddDialog({ isOpen, onClose, effectiveSchool, schools = [] }: BulkStudentAddDialogProps) {
  const [parsedStudents, setParsedStudents] = useState<Array<{ fullName: string; parentContact?: string; address?: string }>>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: classes, isLoading: classesLoading } = useQuery({
    queryKey: ['/api/classes'],
  });

  // Form setup
  const form = useForm<BulkStudentFormData>({
    resolver: zodResolver(bulkStudentSchema),
    defaultValues: {
      schoolId: effectiveSchool ? effectiveSchool.id.toString() : "",
      classId: "",
      groupId: "no-group",
      academicYear: "2025/2026",
      studentsText: "",
    },
  });

  const { data: studentGroups, isLoading: groupsLoading } = useQuery({
    queryKey: ['/api/student-groups'],
    enabled: !!form.watch('classId'),
  });

  // Parse students from text input
  const parseStudentsText = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    const students = lines.map(line => {
      const parts = line.split(',').map(part => part.trim());
      const fullName = parts[0];
      const parentContact = parts[1] || "";
      const address = parts[2] || "";
      
      return {
        fullName,
        parentContact: parentContact || undefined,
        address: address || undefined,
      };
    }).filter(student => student.fullName);
    
    setParsedStudents(students);
  };

  // Bulk creation mutation
  const bulkCreateMutation = useMutation({
    mutationFn: async (data: BulkStudentFormData) => {
      const studentsData = parsedStudents.map(student => ({
        ...student,
        classId: parseInt(data.classId),
        groupId: data.groupId && data.groupId !== "no-group" ? parseInt(data.groupId) : null,
        academicYear: data.academicYear,
        schoolId: parseInt(data.schoolId),
        isActive: true,
      }));

      return apiRequest('POST', '/api/admin/students/bulk', { studentsData });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      onClose();
      form.reset();
      setParsedStudents([]);
      toast({
        title: "Success",
        description: `${parsedStudents.length} students created successfully`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create students",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: BulkStudentFormData) => {
    if (parsedStudents.length === 0) {
      toast({
        title: "Error",
        description: "Please enter student names",
        variant: "destructive",
      });
      return;
    }
    bulkCreateMutation.mutate(data);
  };

  const handleTextChange = (text: string) => {
    form.setValue('studentsText', text);
    parseStudentsText(text);
  };

  const removeStudent = (index: number) => {
    const updated = parsedStudents.filter((_, i) => i !== index);
    setParsedStudents(updated);
    // Update form text to reflect the removal
    const newText = updated.map(s => 
      [s.fullName, s.parentContact, s.address].filter(Boolean).join(', ')
    ).join('\n');
    form.setValue('studentsText', newText);
  };

  // Filter groups by selected class
  const filteredGroups = (studentGroups as any[])?.filter((group: any) => 
    group.classId === parseInt(form.watch('classId') || '0')
  ) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Add Multiple Students
          </DialogTitle>
          <DialogDescription>
            Add multiple students at once to a class and group. Enter student information one per line.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* School, Class and Group Selection */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="schoolId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select school" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {schools.map((school: any) => (
                          <SelectItem key={school.id} value={school.id.toString()}>
                            {school.name}
                          </SelectItem>
                        ))}
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
                    <FormLabel>Class *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classes?.map((cls: any) => (
                          <SelectItem key={cls.id} value={cls.id.toString()}>
                            {cls.name} ({cls.academicYear})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="groupId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group (Optional)</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select group" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="no-group">No group</SelectItem>
                        {(filteredGroups as any[]).map((group: any) => (
                          <SelectItem key={group.id} value={group.id.toString()}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="academicYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Academic Year *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="2025/2026" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Student Names Input */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="studentsText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student Information *</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          onChange={(e) => handleTextChange(e.target.value)}
                          placeholder="Enter one student per line:&#10;John Smith&#10;Mary Johnson, +1234567890, 123 Main St&#10;David Wilson, +9876543210"
                          className="min-h-[200px] font-mono text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                      <div className="text-xs text-gray-500">
                        Format: Name, Phone (optional), Address (optional)
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {/* Parsed Students Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Preview ({parsedStudents.length} students)</h4>
                  {parsedStudents.length > 0 && (
                    <Badge variant="secondary">
                      {parsedStudents.length} student{parsedStudents.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                
                <Card className="max-h-[200px] overflow-y-auto">
                  <CardContent className="p-3">
                    {parsedStudents.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Enter student names to see preview</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {parsedStudents.map((student, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{student.fullName}</div>
                              {(student.parentContact || student.address) && (
                                <div className="text-xs text-gray-500 truncate">
                                  {[student.parentContact, student.address].filter(Boolean).join(' • ')}
                                </div>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeStudent(index)}
                              className="h-6 w-6 p-0 ml-2"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={bulkCreateMutation.isPending || parsedStudents.length === 0}
                className="flex items-center gap-2"
              >
                {bulkCreateMutation.isPending ? (
                  "Creating..."
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add {parsedStudents.length} Student{parsedStudents.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}