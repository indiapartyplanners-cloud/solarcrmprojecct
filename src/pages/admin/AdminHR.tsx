import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AdminHR = () => {
  return (
    <div className="space-y-6 animate-slide-in">
      <h1 className="text-3xl font-bold">HR</h1>
      <Card>
        <CardHeader>
          <CardTitle>HR Module</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            HR dashboard and workflows will appear here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminHR;
