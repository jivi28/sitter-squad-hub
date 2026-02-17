import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Navigate } from "react-router-dom";

interface TestResult {
  label: string;
  expected: string;
  data: unknown;
  error: unknown;
  passed: boolean;
}

const SecuritySelfTest = () => {
  const { user, loading } = useAuth();
  const [bookingId, setBookingId] = useState("");
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  if (loading) return <p className="p-8 text-muted-foreground">Loading…</p>;
  if (!user) return <Navigate to="/auth" replace />;

  const run = async () => {
    setRunning(true);
    const out: TestResult[] = [];

    // A) total_cost only
    const a = await supabase.from("bookings").update({ total_cost: 1 } as any).eq("id", bookingId).select();
    out.push({
      label: "A) UPDATE total_cost=1",
      expected: "FAIL (RLS blocks cost changes)",
      data: a.data,
      error: a.error,
      passed: !!a.error || (a.data && a.data.length === 0),
    });

    // B) status='cancelled'
    const b = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId).select();
    out.push({
      label: "B) UPDATE status='cancelled'",
      expected: "SUCCEED (if booking is yours & cancellable)",
      data: b.data,
      error: b.error,
      passed: !b.error && !!b.data && b.data.length > 0,
    });

    // C) status='cancelled' + total_cost=1
    const c = await supabase.from("bookings").update({ status: "cancelled", total_cost: 1 } as any).eq("id", bookingId).select();
    out.push({
      label: "C) UPDATE status='cancelled', total_cost=1",
      expected: "FAIL (cost change blocked even with valid status)",
      data: c.data,
      error: c.error,
      passed: !!c.error || (c.data && c.data.length === 0),
    });

    setResults(out);
    setRunning(false);
  };

  const allPassed = results.length > 0 && results.every((r) => r.passed);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8 max-w-2xl mx-auto space-y-6">
      <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-4 text-center font-bold text-destructive">
        ⚠️ Temporary debugging page — remove before production ⚠️
      </div>

      <Card>
        <CardHeader>
          <CardTitle>RLS Security Self-Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Paste a booking ID (uuid)"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
            />
            <Button onClick={run} disabled={running || !bookingId.trim()}>
              {running ? "Running…" : "Run Tests"}
            </Button>
          </div>

          {results.map((r, i) => (
            <div key={i} className="rounded-md border p-3 space-y-1 text-sm">
              <p className="font-semibold">{r.label}</p>
              <p className="text-muted-foreground">Expected: {r.expected}</p>
              <p className={r.passed ? "text-green-600" : "text-destructive font-bold"}>
                {r.passed ? "✅ PASS" : "❌ FAIL — RLS may be too permissive!"}
              </p>
              <pre className="bg-muted rounded p-2 overflow-auto text-xs whitespace-pre-wrap">
                {JSON.stringify({ data: r.data, error: r.error }, null, 2)}
              </pre>
            </div>
          ))}

          {results.length > 0 && (
            <div className={`rounded-md border-2 p-4 ${allPassed ? "border-green-500 bg-green-50" : "border-destructive bg-destructive/10"}`}>
              <p className="font-bold mb-2">Checklist</p>
              <ul className="space-y-1 text-sm">
                <li>{results[0]?.passed ? "✅" : "❌"} Test A blocked — cost-only update rejected</li>
                <li>{results[1]?.passed ? "✅" : "⚠️"} Test B allowed — cancel succeeded</li>
                <li>{results[2]?.passed ? "✅" : "❌"} Test C blocked — cost+status combo rejected</li>
              </ul>
              {!allPassed && (
                <p className="mt-2 text-destructive font-bold">
                  ⚠️ Some tests failed — RLS policies may be too permissive!
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SecuritySelfTest;
