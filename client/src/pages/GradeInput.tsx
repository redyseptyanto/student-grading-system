import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, X, Save } from "lucide-react";

const gradeInputSchema = z.object({
  studentId: z.string().min(1, "Please select a student"),
  aspect: z.string().min(1, "Please select an assessment aspect"),
  grades: z.array(z.number().min(1).max(6)).min(1, "At least one grade is required").max(7, "Maximum 7 grades allowed"),
});

type GradeInputFormData = z.infer<typeof gradeInputSchema>;

export default function GradeInput() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [gradeInputs, setGradeInputs] = useState<string[]>([""]);

  // Redirect to home if not authenticated or not a teacher
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== "teacher")) {
      toast({
        title: "Unauthorized",
        description: "Only teachers can access grade input.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = user ? "/dashboard" : "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ["/api/students"],
    enabled: !!user && user.role === "teacher",
    retry: false,
  });

  const { data: aspects, isLoading: aspectsLoading } = useQuery({
    queryKey: ["/api/assessment-aspects"],
    enabled: !!user,
    retry: false,
  });

  const form = useForm<GradeInputFormData>({
    resolver: zodResolver(gradeInputSchema),
    defaultValues: {
      studentId: "",
      aspect: "",
      grades: [],
    },
  });

  const gradeMutation = useMutation({
    mutationFn: async (data: GradeInputFormData) => {
      await apiRequest("POST", "/api/grades", {
        studentId: parseInt(data.studentId),
        aspect: data.aspect,
        grades: data.grades,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Grades saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      form.reset();
      setGradeInputs([""]);
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
      toast({
        title: "Error",
        description: "Failed to save grades. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addGradeInput = () => {
    if (gradeInputs.length < 7) {
      setGradeInputs([...gradeInputs, ""]);
    }
  };

  const removeGradeInput = (index: number) => {
    if (gradeInputs.length > 1) {
      const newInputs = gradeInputs.filter((_, i) => i !== index);
      setGradeInputs(newInputs);
      
      // Update form values
      const currentGrades = form.getValues("grades");
      const newGrades = currentGrades.filter((_, i) => i !== index);
      form.setValue("grades", newGrades);
    }
  };

  const updateGrade = (index: number, value: string) => {
    const newInputs = [...gradeInputs];
    newInputs[index] = value;
    setGradeInputs(newInputs);

    // Convert to numbers and update form
    const grades = newInputs
      .filter(input => input !== "")
      .map(input => parseInt(input))
      .filter(num => !isNaN(num) && num >= 1 && num <= 6);
    
    form.setValue("grades", grades);
  };

  const onSubmit = (data: GradeInputFormData) => {
    gradeMutation.mutate(data);
  };

  if (isLoading) {
    return <GradeInputSkeleton />;
  }

  if (!user || user.role !== "teacher") {
    return null;
  }

  const finalGrade = form.watch("grades");
  const currentFinalGrade = finalGrade?.length > 0 ? finalGrade[finalGrade.length - 1] : null;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Grade Input</h1>
        <p className="text-gray-600">Input multiple grades per assessment aspect for your students</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grade Input Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Assessment Grade Entry</CardTitle>
              <CardDescription>
                Enter up to 7 grades per aspect. The final grade will be the last value entered.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="studentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Student</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a student" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {studentsLoading ? (
                              <SelectItem value="loading" disabled>Loading students...</SelectItem>
                            ) : (
                              students?.map((student: any) => (
                                <SelectItem key={student.id} value={student.id.toString()}>
                                  {student.fullName}
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
                    name="aspect"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assessment Aspect</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an assessment aspect" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-60">
                            {aspectsLoading ? (
                              <SelectItem value="loading" disabled>Loading aspects...</SelectItem>
                            ) : (
                              aspects?.map((aspect: string) => (
                                <SelectItem key={aspect} value={aspect}>
                                  {aspect}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <FormLabel>Grade Array (1-6 scale)</FormLabel>
                    <div className="mt-2 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {gradeInputs.map((value, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <Input
                              type="number"
                              min="1"
                              max="6"
                              placeholder={`Grade ${index + 1}`}
                              value={value}
                              onChange={(e) => updateGrade(index, e.target.value)}
                              className="w-20"
                            />
                            {gradeInputs.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeGradeInput(index)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        {gradeInputs.length < 7 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addGradeInput}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Grade
                          </Button>
                        )}
                      </div>
                      
                      {currentFinalGrade && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">Final Grade:</span>
                          <Badge variant="outline" className="text-lg font-semibold">
                            {currentFinalGrade}
                          </Badge>
                        </div>
                      )}
                      
                      <p className="text-xs text-gray-500">
                        Enter grades from 1 (Beginning) to 6 (Advanced). The final grade will be the last value in the array.
                      </p>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={gradeMutation.isPending}
                    className="w-full"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {gradeMutation.isPending ? "Saving..." : "Save Grades"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Grade Scale Reference */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Grading Scale</CardTitle>
              <CardDescription>Standards-based assessment scale</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <span className="font-medium">1</span>
                  <span className="text-sm text-gray-600">Beginning</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <span className="font-medium">2</span>
                  <span className="text-sm text-gray-600">Developing</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <span className="font-medium">3</span>
                  <span className="text-sm text-gray-600">Approaching</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="font-medium">4</span>
                  <span className="text-sm text-gray-600">Meeting</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="font-medium">5</span>
                  <span className="text-sm text-gray-600">Exceeding</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <span className="font-medium">6</span>
                  <span className="text-sm text-gray-600">Advanced</span>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600">
                  <strong>Note:</strong> You can enter multiple grades per aspect to track progress over time. 
                  The final grade will be the last value in the array.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function GradeInputSkeleton() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
