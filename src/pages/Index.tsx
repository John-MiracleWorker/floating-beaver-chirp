import { MadeWithDyad } from "@/components/made-with-dyad";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="w-full max-w-xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-4xl font-bold mb-2">Independent Contractor Toolkit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-gray-600 mb-4">
              Track your miles, schedule appointments, and manage your work efficiently.
            </p>
            <div className="flex flex-col gap-4">
              <Link
                to="/miles"
                className="w-full bg-primary text-primary-foreground px-4 py-2 rounded text-center font-semibold hover:bg-primary/90 transition"
              >
                Mile Tracker
              </Link>
              <Link
                to="/appointments"
                className="w-full bg-secondary text-secondary-foreground px-4 py-2 rounded text-center font-semibold hover:bg-secondary/80 transition"
              >
                Appointment Scheduler
              </Link>
            </div>
          </CardContent>
        </Card>
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default Index;