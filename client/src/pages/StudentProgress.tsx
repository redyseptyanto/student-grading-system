import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, BookOpen, Target } from "lucide-react";

interface Student {
  id: number;
  fullName: string;
  grades: Record<string, number[]>;
}

export default function StudentProgress() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [selectedStudent, setSelectedStudent] = useState<string>("");

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ["/api/students"],
    enabled: !!user,
    retry: false,
  });

  const { data: aspects } = useQuery({
    queryKey: ["/api/assessment-aspects"],
    enabled: !!user,
    retry: false,
  });

  if (isLoading) {
    return <StudentProgressSkeleton />;
  }

  if (!user) {
    return null;
  }

  const selectedStudentData = students?.find((s: Student) => s.id.toString() === selectedStudent);

  const getProgressTrend = (grades: number[]) => {
    if (grades.length < 2) return "none";
    const recent = grades.slice(-2);
    if (recent[1] > recent[0]) return "up";
    if (recent[1] < recent[0]) return "down";
    return "stable";
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 5) return "bg-green-100 text-green-800";
    if (grade >= 4) return "bg-blue-100 text-blue-800";
    if (grade >= 3) return "bg-yellow-100 text-yellow-800";
    if (grade >= 2) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  const getGradeLabel = (grade: number) => {
    const labels = {
      1: "Beginning",
      2: "Developing", 
      3: "Approaching",
      4: "Meeting",
      5: "Exceeding",
      6: "Advanced"
    };
    return labels[grade as keyof typeof labels] || "Unknown";
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {user.role === "parent" ? "My Child's Progress" : "Student Progress"}
        </h1>
        <p className="text-gray-600">
          Track learning progress across all assessment areas
        </p>
      </div>

      {/* Student Selector */}
      {user.role !== "parent" && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Student</CardTitle>
            <CardDescription>Choose a student to view their progress</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger className="w-full max-w-sm">
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {studentsLoading ? (
                  <SelectItem value="" disabled>Loading students...</SelectItem>
                ) : (
                  students?.map((student: Student) => (
                    <SelectItem key={student.id} value={student.id.toString()}>
                      {student.fullName}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Progress Overview */}
      {(selectedStudentData || (user.role === "parent" && students?.[0])) && (
        <div className="space-y-6">
          {(() => {
            const student = selectedStudentData || (user.role === "parent" ? students?.[0] : null);
            if (!student) return null;

            const gradesEntries = Object.entries(student.grades || {});
            const assessedAspects = gradesEntries.filter(([_, grades]) => grades.length > 0);
            const totalAspects = aspects?.length || 34;
            const completionRate = Math.round((assessedAspects.length / totalAspects) * 100);

            // Calculate overall progress
            const overallScores = assessedAspects.map(([_, grades]) => grades[grades.length - 1]);
            const averageScore = overallScores.length > 0 
              ? overallScores.reduce((sum, score) => sum + score, 0) / overallScores.length
              : 0;

            return (
              <>
                {/* Student Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BookOpen className="w-5 h-5 mr-2" />
                      {student.fullName} - Progress Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-3">
                          <span className="text-2xl font-bold text-blue-600">
                            {Math.round(averageScore * 10) / 10}
                          </span>
                        </div>
                        <h4 className="font-medium text-gray-900">Overall Score</h4>
                        <p className="text-sm text-gray-500">{getGradeLabel(Math.round(averageScore))}</p>
                      </div>
                      
                      <div className="text-center">
                        <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-3">
                          <span className="text-2xl font-bold text-green-600">{completionRate}%</span>
                        </div>
                        <h4 className="font-medium text-gray-900">Completion Rate</h4>
                        <p className="text-sm text-gray-500">{assessedAspects.length} of {totalAspects} aspects</p>
                      </div>

                      <div className="text-center">
                        <div className="w-20 h-20 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-3">
                          <Target className="w-8 h-8 text-purple-600" />
                        </div>
                        <h4 className="font-medium text-gray-900">Assessment Areas</h4>
                        <p className="text-sm text-gray-500">{assessedAspects.length} areas tracked</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Detailed Progress by Aspect */}
                <Card>
                  <CardHeader>
                    <CardTitle>Progress by Assessment Area</CardTitle>
                    <CardDescription>
                      Detailed breakdown showing grade history and trends
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {assessedAspects.length === 0 ? (
                      <div className="text-center py-8">
                        <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No assessments recorded yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {assessedAspects.map(([aspect, grades]) => {
                          const currentGrade = grades[grades.length - 1];
                          const trend = getProgressTrend(grades);
                          
                          return (
                            <div key={aspect} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium text-gray-900">{aspect}</h4>
                                <div className="flex items-center space-x-2">
                                  {getTrendIcon(trend)}
                                  <Badge className={getGradeColor(currentGrade)}>
                                    {currentGrade} - {getGradeLabel(currentGrade)}
                                  </Badge>
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap gap-2 mb-2">
                                <span className="text-sm text-gray-600">Grade History:</span>
                                {grades.map((grade, index) => (
                                  <Badge 
                                    key={index} 
                                    variant="outline"
                                    className={`text-xs ${index === grades.length - 1 ? 'border-primary' : ''}`}
                                  >
                                    {grade}
                                  </Badge>
                                ))}
                              </div>
                              
                              <div className="flex items-center text-xs text-gray-500">
                                <span>Total assessments: {grades.length}</span>
                                {grades.length > 1 && (
                                  <span className="ml-4">
                                    Change from first: {grades[grades.length - 1] - grades[0] > 0 ? '+' : ''}{grades[grades.length - 1] - grades[0]}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Missing Assessments */}
                {user.role === "teacher" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Missing Assessments</CardTitle>
                      <CardDescription>
                        Assessment areas that haven't been evaluated yet
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const missingAspects = aspects?.filter((aspect: string) => 
                          !student.grades[aspect] || student.grades[aspect].length === 0
                        ) || [];
                        
                        if (missingAspects.length === 0) {
                          return (
                            <div className="text-center py-4">
                              <p className="text-green-600 font-medium">
                                All assessment areas have been evaluated! 🎉
                              </p>
                            </div>
                          );
                        }
                        
                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {missingAspects.map((aspect: string) => (
                              <div key={aspect} className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-700">{aspect}</p>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* No Student Selected */}
      {!selectedStudentData && user.role !== "parent" && (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Select a student to view their progress</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StudentProgressSkeleton() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-64" />
        </CardContent>
      </Card>
      
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="border rounded-lg p-4">
                    <Skeleton className="h-5 w-full mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
