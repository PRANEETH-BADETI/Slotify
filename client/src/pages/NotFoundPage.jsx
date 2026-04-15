import { Link } from "react-router-dom";
import { Button } from "../components/shared/Button";
import { Card } from "../components/shared/Card";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="max-w-xl p-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-500">
          404
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          The route you opened does not exist in this scheduling workspace.
        </p>
        <div className="mt-6">
          <Link to="/event-types">
            <Button>Go to dashboard</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
