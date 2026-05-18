import { useT } from "@/i18n/useTranslation";
import { useLanguage } from "@/i18n/useLanguage";

function formatTimeAgo(isoString: string, lang: string): string {
  if (!isoString) return "";
  const diff = Date.now() - new Date(isoString).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) {
    return lang === "zh-CN" ? "不到 1 小时" : "less than 1 hour";
  }
  if (lang === "zh-CN") {
    return `${hours} 小时`;
  }
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

interface FooterProps {
  lastUpdated: string;
}

export function Footer({ lastUpdated }: FooterProps) {
  const { t } = useT();
  const { language } = useLanguage();
  const timeAgo = formatTimeAgo(lastUpdated, language);

  const projectLink = (
    <a
      href="https://github.com/Aurorainic/gh-starboard"
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-4 hover:text-foreground transition-colors"
    >
      {t("footer.project")}
    </a>
  );

  const generatedText = t("footer.generated", { link: "%%LINK%%" });
  const generatedParts = generatedText.split("%%LINK%%");

  return (
    <footer className="border-t py-6 px-4 text-center text-sm text-muted-foreground space-y-1">
      <p>
        {generatedParts.map((part, i) =>
          i < generatedParts.length - 1 ? (
            <span key={i}>
              {part}
              {projectLink}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </p>
      {lastUpdated && (
        <p>{t("footer.refreshed", { time: timeAgo })}</p>
      )}
    </footer>
  );
}
