import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, ChevronRight, Save, Users, BookOpen, FileText } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { ASSESSMENT_ASPECTS } from "@shared/schema";

interface Student {
  id: number;
  fullName: string;
  className: string;
  groupName: string;
  sakit?: number;
  izin?: number;
  alpa?: number;
  tinggiBadan?: number;
  beratBadan?: number;
}

interface AttendanceData {
  [studentId: number]: {
    sakit: number;
    izin: number;
    alpa: number;
    tinggiBadan: number;
    beratBadan: number;
  };
}

interface NarrationData {
  studentId: number;
  label: string;
  content: string;
}

interface GradeData {
  [studentId: number]: string; // Grade array as string like "2,2,3,4,5,6,5"
}

const NARRATION_LABELS = [
  "Kemampuan Akademik",
  "Kemampuan Sosial",
  "Kemampuan Motorik",
  "Kreativitas",
  "Kedisiplinan",
  "Kemandirian",
  "Komunikasi",
  "Kepemimpinan"
];

const TERMS = ["Term 1", "Term 2", "Term 3", "Term 4"];
const ACADEMIC_YEARS = ["2025/2026", "2024/2025", "2023/2024"];

export default function GradeInput() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filter states
  const [selectedYear, setSelectedYear] = useState("2025/2026");
  const [selectedTerm, setSelectedTerm] = useState("Term 1");
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [activeTab, setActiveTab] = useState("attendance");

  // Data states
  const [attendanceData, setAttendanceData] = useState<AttendanceData>({});
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [narrationLabel, setNarrationLabel] = useState("");
  const [narrationContent, setNarrationContent] = useState("");
  const [selectedAspect, setSelectedAspect] = useState("");
  const [gradeData, setGradeData] = useState<GradeData>({});

  // Get teacher's schools and classes
  const { data: teacherData } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: !!user,
  });

  const { data: schools = [] } = useQuery({
    queryKey: ["/api/schools"],
    enabled: !!user,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["/api/classes"],
    enabled: !!user,
  });

  // Get students based on filters
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ["/api/students", selectedYear, selectedClass, selectedSchool],
    enabled: !!selectedYear && !!selectedClass && !!selectedSchool,
  });

  // Set default school and class when teacher data loads
  useEffect(() => {
    if (teacherData?.effectiveSchool && !selectedSchool) {
      setSelectedSchool(teacherData.effectiveSchool.id.toString());
    }
  }, [teacherData, selectedSchool]);

  useEffect(() => {
    if (classes.length > 0 && !selectedClass) {
      // Set first available class as default
      const teacherClasses = classes.filter(c => 
        c.academicYear === selectedYear && 
        c.schoolId.toString() === selectedSchool
      );
      if (teacherClasses.length > 0) {
        setSelectedClass(teacherClasses[0].id.toString());
      }
    }
  }, [classes, selectedYear, selectedSchool, selectedClass]);

  // Initialize attendance data when students load
  useEffect(() => {
    if (students.length > 0) {
      const initialData: AttendanceData = {};
      students.forEach(student => {
        initialData[student.id] = {
          sakit: student.sakit || 0,
          izin: student.izin || 0,
          alpa: student.alpa || 0,
          tinggiBadan: student.tinggiBadan || 0,
          beratBadan: student.beratBadan || 0,
        };
      });
      setAttendanceData(initialData);

      // Set first student as selected for narration
      if (students.length > 0 && !selectedStudent) {
        setSelectedStudent(students[0].id);
      }
    }
  }, [students, selectedStudent]);

  // Mutations
  const saveAttendanceMutation = useMutation({
    mutationFn: async (data: AttendanceData) => {
      return await apiRequest("/api/attendance/batch", {
        method: "POST",
        body: JSON.stringify({
          attendanceData: data,
          academicYear: selectedYear,
          term: selectedTerm,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Attendance data saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save attendance data",
        variant: "destructive",
      });
    },
  });

  const saveNarrationMutation = useMutation({
    mutationFn: async (data: NarrationData) => {
      return await apiRequest("/api/narration", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          academicYear: selectedYear,
          term: selectedTerm,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Narration saved successfully",
      });
      setNarrationContent("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save narration",
        variant: "destructive",
      });
    },
  });

  const saveGradesMutation = useMutation({
    mutationFn: async (data: { aspect: string; grades: GradeData }) => {
      return await apiRequest("/api/grades/batch", {
        method: "POST",
        body: JSON.stringify({
          aspect: data.aspect,
          gradeData: data.grades,
          academicYear: selectedYear,
          term: selectedTerm,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Grades saved successfully",
      });
      setGradeData({});
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save grades",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const updateAttendanceData = (studentId: number, field: string, value: number) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      },
    }));
  };

  const updateGradeData = (studentId: number, gradeArray: string) => {
    setGradeData(prev => ({
      ...prev,
      [studentId]: gradeArray,
    }));
  };

  const navigateStudent = (direction: 'prev' | 'next') => {
    if (!selectedStudent || students.length === 0) return;
    
    const currentIndex = students.findIndex(s => s.id === selectedStudent);
    let newIndex;
    
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : students.length - 1;
    } else {
      newIndex = currentIndex < students.length - 1 ? currentIndex + 1 : 0;
    }
    
    setSelectedStudent(students[newIndex].id);
  };

  const saveAndNext = () => {
    if (selectedStudent && narrationLabel && narrationContent) {
      saveNarrationMutation.mutate({
        studentId: selectedStudent,
        label: narrationLabel,
        content: narrationContent,
      });
      navigateStudent('next');
    }
  };

  const getFinalGrade = (gradeArray: string) => {
    if (!gradeArray) return "";
    const grades = gradeArray.split(',').map(g => g.trim());
    return grades[grades.length - 1] || "";
  };

  if (isLoading || !user) {
    return <div>Loading...</div>;
  }

  if (!user.roles?.includes('teacher')) {
    return <div>Access denied. Only teachers can access this page.</div>;
  }

  const filteredClasses = classes.filter(c => 
    c.academicYear === selectedYear && 
    c.schoolId.toString() === selectedSchool
  );

  const selectedStudentData = students.find(s => s.id === selectedStudent);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teacher Input System</h1>
          <p className="text-gray-600">Manage student attendance, narrations, and grades</p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {students.length} Students
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Filter Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="academic-year">Academic Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {ACADEMIC_YEARS.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="term">Term</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger>
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {TERMS.map(term => (
                    <SelectItem key={term} value={term}>{term}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="school">School</Label>
              <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                <SelectTrigger>
                  <SelectValue placeholder="Select school" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map(school => (
                    <SelectItem key={school.id} value={school.id.toString()}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="class">Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {filteredClasses.map(cls => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Kehadiran & TB/BB
          </TabsTrigger>
          <TabsTrigger value="narration" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Narasi
          </TabsTrigger>
          <TabsTrigger value="grades" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Nilai
          </TabsTrigger>
        </TabsList>

        {/* Attendance Tab */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>Student Attendance & Health Data</CardTitle>
              <CardDescription>
                Input absence data (Sakit, Izin, Alpa) and health metrics (Height, Weight) for all students
              </CardDescription>
            </CardHeader>
            <CardContent>
              {studentsLoading ? (
                <div>Loading students...</div>
              ) : students.length === 0 ? (
                <div>No students found for the selected filters.</div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 p-2 text-left">Student Name</th>
                          <th className="border border-gray-300 p-2 text-center">Sakit</th>
                          <th className="border border-gray-300 p-2 text-center">Izin</th>
                          <th className="border border-gray-300 p-2 text-center">Alpa</th>
                          <th className="border border-gray-300 p-2 text-center">Tinggi (cm)</th>
                          <th className="border border-gray-300 p-2 text-center">Berat (kg)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map(student => (
                          <tr key={student.id}>
                            <td className="border border-gray-300 p-2 font-medium">
                              {student.fullName}
                              <div className="text-sm text-gray-500">
                                {student.className} - {student.groupName}
                              </div>
                            </td>
                            <td className="border border-gray-300 p-2">
                              <Input
                                type="number"
                                min="0"
                                value={attendanceData[student.id]?.sakit || 0}
                                onChange={(e) => updateAttendanceData(student.id, 'sakit', parseInt(e.target.value) || 0)}
                                className="w-16 text-center"
                              />
                            </td>
                            <td className="border border-gray-300 p-2">
                              <Input
                                type="number"
                                min="0"
                                value={attendanceData[student.id]?.izin || 0}
                                onChange={(e) => updateAttendanceData(student.id, 'izin', parseInt(e.target.value) || 0)}
                                className="w-16 text-center"
                              />
                            </td>
                            <td className="border border-gray-300 p-2">
                              <Input
                                type="number"
                                min="0"
                                value={attendanceData[student.id]?.alpa || 0}
                                onChange={(e) => updateAttendanceData(student.id, 'alpa', parseInt(e.target.value) || 0)}
                                className="w-16 text-center"
                              />
                            </td>
                            <td className="border border-gray-300 p-2">
                              <Input
                                type="number"
                                min="0"
                                step="0.1"
                                value={attendanceData[student.id]?.tinggiBadan || 0}
                                onChange={(e) => updateAttendanceData(student.id, 'tinggiBadan', parseFloat(e.target.value) || 0)}
                                className="w-20 text-center"
                              />
                            </td>
                            <td className="border border-gray-300 p-2">
                              <Input
                                type="number"
                                min="0"
                                step="0.1"
                                value={attendanceData[student.id]?.beratBadan || 0}
                                onChange={(e) => updateAttendanceData(student.id, 'beratBadan', parseFloat(e.target.value) || 0)}
                                className="w-20 text-center"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button
                      onClick={() => saveAttendanceMutation.mutate(attendanceData)}
                      disabled={saveAttendanceMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {saveAttendanceMutation.isPending ? "Saving..." : "Batch Save All"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Narration Tab */}
        <TabsContent value="narration">
          <Card>
            <CardHeader>
              <CardTitle>Student Narration</CardTitle>
              <CardDescription>
                Write detailed narrations for each student with categorical labels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {students.length === 0 ? (
                <div>No students found for the selected filters.</div>
              ) : (
                <>
                  {/* Student Navigation */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateStudent('prev')}
                      disabled={students.length <= 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-4">
                      <Select
                        value={selectedStudent?.toString() || ""}
                        onValueChange={(value) => setSelectedStudent(parseInt(value))}
                      >
                        <SelectTrigger className="w-64">
                          <SelectValue placeholder="Select student" />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map(student => (
                            <SelectItem key={student.id} value={student.id.toString()}>
                              {student.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {selectedStudentData && (
                        <Badge variant="outline">
                          {selectedStudentData.className} - {selectedStudentData.groupName}
                        </Badge>
                      )}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateStudent('next')}
                      disabled={students.length <= 1}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>

                  <Separator />

                  {/* Narration Form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="narration-label">Label Narasi</Label>
                      <Select value={narrationLabel} onValueChange={setNarrationLabel}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select narration category" />
                        </SelectTrigger>
                        <SelectContent>
                          {NARRATION_LABELS.map(label => (
                            <SelectItem key={label} value={label}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="narration-content">Narration Content</Label>
                    <Textarea
                      id="narration-content"
                      value={narrationContent}
                      onChange={(e) => setNarrationContent(e.target.value)}
                      placeholder="Write detailed narration about the student's progress, behavior, and development..."
                      rows={6}
                      className="mt-2"
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (selectedStudent && narrationLabel && narrationContent) {
                          saveNarrationMutation.mutate({
                            studentId: selectedStudent,
                            label: narrationLabel,
                            content: narrationContent,
                          });
                        }
                      }}
                      disabled={!selectedStudent || !narrationLabel || !narrationContent || saveNarrationMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    
                    <Button
                      onClick={saveAndNext}
                      disabled={!selectedStudent || !narrationLabel || !narrationContent || saveNarrationMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save & Next
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Grades Tab */}
        <TabsContent value="grades">
          <Card>
            <CardHeader>
              <CardTitle>Grade Input</CardTitle>
              <CardDescription>
                Input grade arrays for all students. Format: "2,2,3,4,5,6,5" (final grade is the last value)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {students.length === 0 ? (
                <div>No students found for the selected filters.</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="assessment-aspect">Aspek Penilaian</Label>
                      <Select value={selectedAspect} onValueChange={setSelectedAspect}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select assessment aspect" />
                        </SelectTrigger>
                        <SelectContent>
                          {ASSESSMENT_ASPECTS.map(aspect => (
                            <SelectItem key={aspect} value={aspect}>
                              {aspect}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  {selectedAspect && (
                    <div className="space-y-4">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-300">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border border-gray-300 p-2 text-left">Student Name</th>
                              <th className="border border-gray-300 p-2 text-center">Grade Array</th>
                              <th className="border border-gray-300 p-2 text-center">Final Grade</th>
                            </tr>
                          </thead>
                          <tbody>
                            {students.map(student => (
                              <tr key={student.id}>
                                <td className="border border-gray-300 p-2 font-medium">
                                  {student.fullName}
                                  <div className="text-sm text-gray-500">
                                    {student.className} - {student.groupName}
                                  </div>
                                </td>
                                <td className="border border-gray-300 p-2">
                                  <Input
                                    value={gradeData[student.id] || ""}
                                    onChange={(e) => updateGradeData(student.id, e.target.value)}
                                    placeholder="e.g., 2,2,3,4,5,6,5"
                                    className="text-center"
                                  />
                                </td>
                                <td className="border border-gray-300 p-2 text-center">
                                  <Badge variant="secondary">
                                    {getFinalGrade(gradeData[student.id]) || "-"}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      <div className="flex justify-end">
                        <Button
                          onClick={() => {
                            if (selectedAspect && Object.keys(gradeData).length > 0) {
                              saveGradesMutation.mutate({
                                aspect: selectedAspect,
                                grades: gradeData,
                              });
                            }
                          }}
                          disabled={!selectedAspect || Object.keys(gradeData).length === 0 || saveGradesMutation.isPending}
                          className="flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          {saveGradesMutation.isPending ? "Saving..." : "Batch Save Grades"}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}