import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Edit, Trash2, FileText, Eye, Copy, Layout, Image, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const reportTemplateSchema = z.object({
  name: z.string().min(2, "Template name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  layout: z.enum(["standard", "detailed", "compact", "portfolio"]),
  includePhoto: z.boolean().default(true),
  includeRadarChart: z.boolean().default(true),
  includeNarration: z.boolean().default(true),
  includeDiscipline: z.boolean().default(true),
  includeGrowthReport: z.boolean().default(true),
  includeTeacherSignature: z.boolean().default(true),
  gradingPeriods: z.array(z.string()).min(1, "Select at least one grading period"),
  headerContent: z.string().optional(),
  footerContent: z.string().optional(),
  customFields: z.array(z.object({
    label: z.string(),
    type: z.enum(["text", "number", "date", "textarea"]),
    required: z.boolean().default(false),
  })).optional(),
});

type ReportTemplateFormData = z.infer<typeof reportTemplateSchema>;

const gradingPeriodOptions = [
  "Term 1",
  "Term 2", 
  "Term 3",
  "Semester 1",
  "Semester 2",
  "Quarter 1",
  "Quarter 2",
  "Quarter 3",
  "Quarter 4",
  "Mid-Year",
  "End of Year",
];

const layoutOptions = [
  { value: "standard", label: "Standard Layout", description: "Traditional report card format" },
  { value: "detailed", label: "Detailed Layout", description: "Comprehensive with all sections" },
  { value: "compact", label: "Compact Layout", description: "Space-efficient format" },
  { value: "portfolio", label: "Portfolio Style", description: "Visual-focused with large photos" },
];

export default function ReportManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/admin/report-templates'],
  });

  // Form setup
  const form = useForm<ReportTemplateFormData>({
    resolver: zodResolver(reportTemplateSchema),
    defaultValues: {
      name: "",
      description: "",
      layout: "standard",
      includePhoto: true,
      includeRadarChart: true,
      includeNarration: true,
      includeDiscipline: true,
      includeGrowthReport: true,
      includeTeacherSignature: true,
      gradingPeriods: ["Term 1"],
      headerContent: "",
      footerContent: "",
      customFields: [],
    },
  });

  // Mutations
  const createTemplateMutation = useMutation({
    mutationFn: async (data: ReportTemplateFormData) => {
      return apiRequest('/api/admin/report-templates', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/report-templates'] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Report template created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create report template",
        variant: "destructive",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async (data: ReportTemplateFormData & { id: number }) => {
      return apiRequest(`/api/admin/report-templates/${data.id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/report-templates'] });
      setIsDialogOpen(false);
      setEditingTemplate(null);
      form.reset();
      toast({
        title: "Success",
        description: "Report template updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update report template",
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/report-templates/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/report-templates'] });
      toast({
        title: "Success",
        description: "Report template deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete report template",
        variant: "destructive",
      });
    },
  });

  const duplicateTemplateMutation = useMutation({
    mutationFn: async (template: any) => {
      return apiRequest('/api/admin/report-templates', {
        method: 'POST',
        body: JSON.stringify({
          ...template,
          name: `${template.name} (Copy)`,
          id: undefined,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/report-templates'] });
      toast({
        title: "Success",
        description: "Report template duplicated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to duplicate report template",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: ReportTemplateFormData) => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ ...data, id: editingTemplate.id });
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    form.reset({
      name: template.name,
      description: template.description,
      layout: template.layout,
      includePhoto: template.includePhoto,
      includeRadarChart: template.includeRadarChart,
      includeNarration: template.includeNarration,
      includeDiscipline: template.includeDiscipline,
      includeGrowthReport: template.includeGrowthReport,
      includeTeacherSignature: template.includeTeacherSignature,
      gradingPeriods: template.gradingPeriods || ["Term 1"],
      headerContent: template.headerContent || "",
      footerContent: template.footerContent || "",
      customFields: template.customFields || [],
    });
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingTemplate(null);
    form.reset();
    setIsDialogOpen(true);
  };

  // Filter templates
  const filteredTemplates = templates?.filter((template: any) => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];

  const ReportPreview = ({ template }: { template: any }) => (
    <div className="border rounded-lg p-4 bg-white max-w-2xl mx-auto">
      <div className="space-y-4">
        {/* Header */}
        <div className="text-center border-b pb-4">
          <h1 className="text-2xl font-bold">Student Report Card</h1>
          <p className="text-gray-600">{template.headerContent || "Academic Progress Report"}</p>
        </div>

        {/* Student Info Section */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold mb-2">Student Information</h3>
            <div className="space-y-1 text-sm">
              <p><strong>Name:</strong> [Student Name]</p>
              <p><strong>Class:</strong> [Class Name]</p>
              <p><strong>Academic Year:</strong> 2024-2025</p>
              <p><strong>Grading Period:</strong> {template.gradingPeriods?.[0] || "Term 1"}</p>
            </div>
          </div>
          {template.includePhoto && (
            <div className="flex justify-center">
              <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                <User className="h-8 w-8 text-gray-400" />
                <span className="sr-only">Student Photo</span>
              </div>
            </div>
          )}
        </div>

        {/* Radar Chart Section */}
        {template.includeRadarChart && (
          <div className="border rounded p-4">
            <h3 className="font-semibold mb-2">Academic Performance</h3>
            <div className="flex justify-center">
              <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-gray-500">Radar Chart</span>
              </div>
            </div>
          </div>
        )}

        {/* Narration Section */}
        {template.includeNarration && (
          <div className="border rounded p-4">
            <h3 className="font-semibold mb-2">Teacher's Comments</h3>
            <div className="h-20 bg-gray-50 rounded p-2 text-sm text-gray-600">
              [Teacher's narrative comments about student progress and achievements]
            </div>
          </div>
        )}

        {/* Discipline & Growth */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {template.includeDiscipline && (
            <div className="border rounded p-4">
              <h3 className="font-semibold mb-2">Discipline Report</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Behavior:</strong> [Rating]</p>
                <p><strong>Attendance:</strong> [Days Present]/[Total Days]</p>
                <p><strong>Punctuality:</strong> [Rating]</p>
              </div>
            </div>
          )}
          {template.includeGrowthReport && (
            <div className="border rounded p-4">
              <h3 className="font-semibold mb-2">Physical Growth</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Height:</strong> [Height] cm</p>
                <p><strong>Weight:</strong> [Weight] kg</p>
                <p><strong>BMI:</strong> [BMI]</p>
              </div>
            </div>
          )}
        </div>

        {/* Teacher Signature */}
        {template.includeTeacherSignature && (
          <div className="border-t pt-4 mt-6">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm font-semibold">Teacher's Signature:</p>
                <div className="w-32 h-8 border-b border-gray-400 mt-2"></div>
                <p className="text-xs text-gray-600 mt-1">[Teacher Name]</p>
              </div>
              <div>
                <p className="text-sm font-semibold">Date:</p>
                <div className="w-24 h-8 border-b border-gray-400 mt-2"></div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        {template.footerContent && (
          <div className="border-t pt-4 text-center text-sm text-gray-600">
            {template.footerContent}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Report Management</h2>
          <p className="text-gray-600">Create and manage report card templates</p>
        </div>
        <Button onClick={handleAdd} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Template
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search report templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {filteredTemplates.length} templates
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templatesLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          filteredTemplates.map((template: any) => (
            <Card key={template.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {template.description}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">
                    {layoutOptions.find(l => l.value === template.layout)?.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {template.includePhoto && <Badge variant="secondary" className="text-xs">Photo</Badge>}
                    {template.includeRadarChart && <Badge variant="secondary" className="text-xs">Chart</Badge>}
                    {template.includeNarration && <Badge variant="secondary" className="text-xs">Comments</Badge>}
                    {template.includeDiscipline && <Badge variant="secondary" className="text-xs">Discipline</Badge>}
                    {template.includeGrowthReport && <Badge variant="secondary" className="text-xs">Growth</Badge>}
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>Periods:</strong> {template.gradingPeriods?.join(", ") || "Term 1"}
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewTemplate(template)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => duplicateTemplateMutation.mutate(template)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <ConfirmDialog
                      title="Delete Report Template"
                      description={`Are you sure you want to delete "${template.name}"? This action cannot be undone.`}
                      onConfirm={() => deleteTemplateMutation.mutate(template.id)}
                      disabled={deleteTemplateMutation.isPending}
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
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Template Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Report Template" : "Create New Report Template"}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate 
                ? "Update report template settings below"
                : "Configure your new report card template"
              }
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter template name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="layout"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Layout Style</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select layout" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {layoutOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe this template's purpose..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <FormLabel>Include Sections</FormLabel>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: "includePhoto", label: "Student Photo" },
                    { name: "includeRadarChart", label: "Radar Chart" },
                    { name: "includeNarration", label: "Teacher Comments" },
                    { name: "includeDiscipline", label: "Discipline Report" },
                    { name: "includeGrowthReport", label: "Growth Report" },
                    { name: "includeTeacherSignature", label: "Teacher Signature" },
                  ].map((item) => (
                    <FormField
                      key={item.name}
                      control={form.control}
                      name={item.name as any}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            {item.label}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>

              <FormField
                control={form.control}
                name="gradingPeriods"
                render={() => (
                  <FormItem>
                    <FormLabel>Grading Periods</FormLabel>
                    <div className="grid grid-cols-3 gap-2">
                      {gradingPeriodOptions.map((period) => (
                        <FormField
                          key={period}
                          control={form.control}
                          name="gradingPeriods"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={period}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(period)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, period])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== period
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  {period}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="headerContent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Header Content</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Header text..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="footerContent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Footer Content</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Footer text..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="submit" disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}>
                  {createTemplateMutation.isPending || updateTemplateMutation.isPending
                    ? "Saving..."
                    : editingTemplate
                    ? "Update Template"
                    : "Create Template"
                  }
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Preview: {previewTemplate?.name}</DialogTitle>
            <DialogDescription>
              This is how the report card will look when generated
            </DialogDescription>
          </DialogHeader>
          {previewTemplate && <ReportPreview template={previewTemplate} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}