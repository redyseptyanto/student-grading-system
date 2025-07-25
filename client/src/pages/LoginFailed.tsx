import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function LoginFailed() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg border-red-200">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle className="text-red-700">Login Failed</CardTitle>
            <CardDescription>
              There was a problem signing you in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-gray-600">
              <p>This could happen if:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-left">
                <li>Your account doesn't have access to this system</li>
                <li>The authentication service is temporarily unavailable</li>
                <li>Your account needs to be activated by an administrator</li>
              </ul>
            </div>

            <Link href="/">
              <Button className="w-full" variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </Link>

            <div className="text-center text-sm text-gray-500">
              <p>Need help? Contact your school administrator</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}