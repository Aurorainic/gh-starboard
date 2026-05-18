import { type StarEntry as StarEntryType, type Language } from "@/types";
import { StarEntry } from "@/components/StarEntry";

interface CategorySectionProps {
  category: string;
  entries: StarEntryType[];
  language: Language;
  onTopicClick?: (topic: string) => void;
}

export function CategorySection({
  category,
  entries,
  language,
  onTopicClick,
}: CategorySectionProps) {
  return (
    <section id={`category-${category}`} className="scroll-mt-16">
      <h2 className="text-xl font-bold mb-4 px-1">{category}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {entries.map((entry) => (
          <StarEntry
            key={entry.fullName}
            entry={entry}
            language={language}
            onTopicClick={onTopicClick}
          />
        ))}
      </div>
    </section>
  );
}
