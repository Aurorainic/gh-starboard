import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { type StarEntry as StarEntryType, type Language } from "@/types";
import { ExternalLink, Star, Clock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface StarEntryProps {
  entry: StarEntryType;
  language: Language;
}

export function StarEntry({ entry, language }: StarEntryProps) {
  const intro = language === "zh" ? entry.aiIntroZh : entry.aiIntroEn;
  const notes = language === "zh" ? entry.userNotesZh : entry.userNotesEn;

  const pushedDate = new Date(entry.pushedAt).toLocaleDateString(
    language === "zh" ? "zh-CN" : "en-US"
  );

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      {/* Repo meta */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <a
            href={entry.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
          >
            <span className="truncate">{entry.fullName}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </a>
          {entry.description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {entry.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 text-sm text-muted-foreground">
          <Star className="h-3.5 w-3.5" />
          <span>{entry.stargazersCount.toLocaleString()}</span>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap items-center gap-1.5">
        {entry.language && (
          <Badge variant="secondary" className="text-xs">
            {entry.language}
          </Badge>
        )}
        {entry.topics.slice(0, 5).map((topic) => (
          <Badge key={topic} variant="outline" className="text-xs">
            {topic}
          </Badge>
        ))}
        <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {pushedDate}
        </span>
      </div>

      {/* AI Intro */}
      {intro && (
        <div className="rounded-md bg-muted/50 px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            {language === "zh" ? "AI 简介" : "AI Intro"}
          </p>
          <p className="text-sm text-muted-foreground">{intro}</p>
        </div>
      )}

      {/* User Notes */}
      {notes && (
        <>
          <Separator />
          <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{notes}</ReactMarkdown>
          </div>
        </>
      )}
    </div>
  );
}
