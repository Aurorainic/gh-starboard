import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { type StarEntry as StarEntryType, type Language } from "@/types";
import { ExternalLink, Star, Clock, Bot, Info } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useT } from "@/i18n/useTranslation";
import { timeAgo } from "@/lib/timeAgo";

interface StarEntryProps {
  entry: StarEntryType;
  language: Language;
  onTopicClick?: (topic: string) => void;
}

export function StarEntry({ entry, language, onTopicClick }: StarEntryProps) {
  const { t } = useT();
  const aiIntro = entry.aiIntro?.[language] || "";
  const intro = aiIntro || entry.description;
  const notes = entry.userNotes?.[language] || "";
  const pushedAgo = timeAgo(entry.pushedAt, language, t("time.justNow"));
  const isAiGenerated = !!aiIntro;

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
        </div>
        <div className="flex items-center gap-1 shrink-0 text-sm text-muted-foreground">
          <Star className="h-3.5 w-3.5" />
          <span>{entry.stargazersCount.toLocaleString()}</span>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap items-center gap-1.5">
        {entry.language && (
          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-0">
            {entry.language}
          </Badge>
        )}
        {entry.topics.slice(0, 5).map((topic) => (
          <Badge
            key={topic}
            variant="outline"
            className="text-xs cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 border-0"
            onClick={() => onTopicClick?.(topic)}
          >
            {topic}
          </Badge>
        ))}
        <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {pushedAgo}
        </span>
      </div>

      {/* Intro section */}
      {intro && (
        <div className="rounded-md bg-muted/50 px-3 py-2">
          <div className="flex items-center gap-1 mb-1">
            {isAiGenerated ? (
              <Bot className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <p className="text-xs font-medium text-muted-foreground">
              {isAiGenerated ? t("entry.aiIntro") : t("entry.description")}
            </p>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-3">{intro}</p>
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
