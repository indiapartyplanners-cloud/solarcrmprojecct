import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AdminPVMonitor = () => {
  return (
    <div className="space-y-6 animate-slide-in">
      <h1 className="text-3xl font-bold">PV Monitor</h1>
      <Card>
        <CardHeader>
          <CardTitle>PV Monitoring</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            PV monitoring charts and alerts will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPVMonitor;
