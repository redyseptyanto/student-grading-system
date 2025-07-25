import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Users, BarChart3, Shield } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="ml-4 text-4xl font-bold text-gray-900">GradeWise</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            A comprehensive kindergarten grading system with clean navigation, 
            role-based access, and interactive progress tracking.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <Users className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Role-Based Access</CardTitle>
              <CardDescription>
                Separate dashboards for teachers, parents, and administrators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Teacher grade input and student management</li>
                <li>• Parent progress viewing and communication</li>
                <li>• Admin user and system management</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Interactive Charts</CardTitle>
              <CardDescription>
                Visual progress tracking with customizable radar charts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Multiple grades per assessment aspect</li>
                <li>• Configurable radar chart generation</li>
                <li>• Historical progress tracking</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Secure & Compliant</CardTitle>
              <CardDescription>
                Built with security and educational standards in mind
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Secure authentication with Replit Auth</li>
                <li>• JSONB grade array storage</li>
                <li>• Standards-based grading (1-6 scale)</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button size="lg" onClick={() => window.location.href = '/login'} className="px-8 py-3">
            Sign In to Get Started
          </Button>
          <p className="text-sm text-gray-500 mt-4">
            Secure login with multiple authentication options
          </p>
        </div>
      </div>
    </div>
  );
}
