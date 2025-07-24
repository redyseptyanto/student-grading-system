import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Download, Share, Save, Eye } from "lucide-react";
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  Legend,
  Tooltip
} from "recharts";

const radarChartConfigSchema = z.object({
  studentId: z.string().min(1, "Please select a student"),
  aspects: z.array(z.string()).min(1, "Please select at least one aspect"),
  title: z.string().optional(),
});

type RadarChartConfigFormData = z.infer<typeof radarChartConfigSchema>;

interface ChartData {
  student: {
    id: number;
    name: string;
  };
  data: Array<{
    aspect: string;
    grade: number;
    gradeHistory: number[];
  }>;
  config: RadarChartConfigFormData;
}

export default function RadarCharts() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [selectedAspects, setSelectedAspects] = useState<string[]>([]);
  const [chartData, setChartData] = useState<ChartData | null>(null);

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

  const { data: aspects, isLoading: aspectsLoading } = useQuery({
    queryKey: ["/api/assessment-aspects"],
    enabled: !!user,
    retry: false,
  });

  const form = useForm<RadarChartConfigFormData>({
    resolver: zodResolver(radarChartConfigSchema),
    defaultValues: {
      studentId: "",
      aspects: [],
      title: "",
    },
  });

  const chartMutation = useMutation({
    mutationFn: async (data: RadarChartConfigFormData) => {
      const response = await apiRequest("POST", "/api/radar-chart", {
        studentId: parseInt(data.studentId),
        aspects: data.aspects,
        title: data.title,
      });
      return response.json();
    },
    onSuccess: (data: ChartData) => {
      setChartData(data);
      toast({
        title: "Success",
        description: "Chart generated successfully",
      });
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
        description: "Failed to generate chart. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAspectChange = (aspect: string, checked: boolean) => {
    const newAspects = checked 
      ? [...selectedAspects, aspect]
      : selectedAspects.filter(a => a !== aspect);
    
    setSelectedAspects(newAspects);
    form.setValue("aspects", newAspects);
  };

  const onSubmit = (data: RadarChartConfigFormData) => {
    chartMutation.mutate(data);
  };

  const handleExportPDF = () => {
    toast({
      title: "Export PDF",
      description: "PDF export functionality would be implemented here",
    });
  };

  const handleShare = () => {
    toast({
      title: "Share Chart",
      description: "Chart sharing functionality would be implemented here",
    });
  };

  const handleSave = () => {
    toast({
      title: "Save Chart",
      description: "Chart saving functionality would be implemented here",
    });
  };

  if (isLoading) {
    return <RadarChartsSkeleton />;
  }

  if (!user) {
    return null;
  }

  // Transform data for Recharts
  const transformedData = chartData?.data.map(item => ({
    aspect: item.aspect.split(' - ')[1] || item.aspect.split(' - ')[0] || item.aspect,
    fullAspect: item.aspect,
    grade: item.grade,
    gradeHistory: item.gradeHistory,
  })) || [];

  const getGradeColor = (grade: number) => {
    if (grade >= 5) return "#10b981"; // Green
    if (grade >= 4) return "#3b82f6"; // Blue
    if (grade >= 3) return "#f59e0b"; // Yellow
    if (grade >= 2) return "#f97316"; // Orange
    return "#ef4444"; // Red
  };

  const averageGrade = transformedData.length > 0 
    ? transformedData.reduce((sum, item) => sum + item.grade, 0) / transformedData.length
    : 0;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Radar Chart Generator</h1>
        <p className="text-gray-600">Create visual progress reports for student assessments</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Configuration */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Chart Configuration</CardTitle>
              <CardDescription>Select student and assessment areas</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="studentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Student</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a student" />
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
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chart Title (Optional)</FormLabel>
                        <FormControl>
                          <input
                            type="text"
                            placeholder="e.g., Q1 Progress Report"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <FormLabel>Assessment Areas</FormLabel>
                    <div className="mt-2 space-y-2 max-h-64 overflow-y-auto border rounded-md p-3">
                      {aspectsLoading ? (
                        <div className="text-sm text-gray-500">Loading aspects...</div>
                      ) : (
                        aspects?.map((aspect: string) => (
                          <div key={aspect} className="flex items-center space-x-2">
                            <Checkbox
                              id={aspect}
                              checked={selectedAspects.includes(aspect)}
                              onCheckedChange={(checked) => 
                                handleAspectChange(aspect, checked as boolean)
                              }
                            />
                            <label 
                              htmlFor={aspect}
                              className="text-sm text-gray-700 cursor-pointer flex-1"
                            >
                              {aspect}
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Selected: {selectedAspects.length} aspects
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={chartMutation.isPending}
                    className="w-full"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    {chartMutation.isPending ? "Generating..." : "Generate Chart"}
                  </Button>
                </form>
              </Form>

              {selectedAspects.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Selected Aspects:</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedAspects.map((aspect) => (
                      <Badge key={aspect} variant="outline" className="text-xs">
                        {aspect.split(' - ')[1] || aspect.split(' - ')[0]}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chart Display */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Eye className="w-5 h-5 mr-2" />
                  {chartData ? `${chartData.student.name} - Assessment Chart` : "Chart Preview"}
                </div>
                {chartData && (
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      Avg: {Math.round(averageGrade * 10) / 10}
                    </Badge>
                  </div>
                )}
              </CardTitle>
              {chartData && (
                <CardDescription>
                  {form.getValues("title") || `Progress visualization for ${chartData.student.name}`}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-6 min-h-[400px] flex items-center justify-center">
                {chartData && transformedData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={transformedData}>
                      <PolarGrid />
                      <PolarAngleAxis 
                        dataKey="aspect" 
                        className="text-xs"
                        tick={{ fontSize: 12 }}
                      />
                      <PolarRadiusAxis 
                        domain={[0, 6]} 
                        tick={{ fontSize: 10 }}
                        tickCount={7}
                      />
                      <Radar
                        name="Grade"
                        dataKey="grade"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.2}
                        strokeWidth={2}
                        dot={{ fill: "#3b82f6", strokeWidth: 1, r: 4 }}
                      />
                      <Tooltip 
                        formatter={(value: any, name: any, props: any) => [
                          `Grade: ${value}`,
                          props.payload.fullAspect
                        ]}
                        labelFormatter={() => ""}
                      />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center">
                    <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">
                      {chartMutation.isPending ? "Generating chart..." : "Configure and generate a chart to see it here"}
                    </p>
                  </div>
                )}
              </div>

              {chartData && (
                <div className="mt-6 flex flex-wrap gap-2">
                  <Button onClick={handleSave} variant="outline" className="flex-1">
                    <Save className="w-4 h-4 mr-2" />
                    Save Chart
                  </Button>
                  <Button onClick={handleExportPDF} variant="outline" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                  <Button onClick={handleShare} variant="outline" className="flex-1">
                    <Share className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chart Details */}
          {chartData && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Assessment Details</CardTitle>
                <CardDescription>Detailed breakdown of selected assessment areas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {chartData.data.map((item) => (
                    <div key={item.aspect} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.aspect}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm text-gray-600">History:</span>
                          {item.gradeHistory.map((grade, index) => (
                            <Badge 
                              key={index} 
                              variant="outline" 
                              className="text-xs"
                              style={{ 
                                color: getGradeColor(grade),
                                borderColor: getGradeColor(grade)
                              }}
                            >
                              {grade}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <div 
                          className="text-2xl font-bold mb-1"
                          style={{ color: getGradeColor(item.grade) }}
                        >
                          {item.grade}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.gradeHistory.length} assessment{item.gradeHistory.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function RadarChartsSkeleton() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-96 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
