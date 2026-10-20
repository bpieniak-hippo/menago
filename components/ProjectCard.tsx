import Link from "next/link";
import type { Project } from "@/lib/types";

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/projects/${project.id}`}>
      <div className="rounded-xl border border-border bg-card p-4 transition hover:border-accent/50">
        <h3 className="text-sm font-semibold">{project.name}</h3>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-muted">
          {project.stage}
        </p>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-status-progress"
            style={{ width: `${project.progress}%` }}
          />
        </div>
        <p className="mt-2 font-mono text-[11px] text-muted">
          {project.progress}% ukończone
        </p>
      </div>
    </Link>
  );
}
