import { Clipboard, Download, ImageIcon, MessageSquareText } from "lucide-react";
import { getOutputUrl } from "../../lib/apiClient";
import { handleCopyText, handleDownload } from "../../lib/utils";
import type { ClipFile } from "../../types/clip.type";

type ThumbnailPromptProps = {
  clip: ClipFile;
};

const thumbHeaderClass =
  "inline-flex items-center gap-1.5 text-[0.82rem] font-semibold text-slate-400/95";
const thumbButtonClass =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-indigo-500/90 px-3 py-1.5 text-[0.82rem] font-semibold text-white transition hover:bg-indigo-500";
const promptBoxClass = "flex flex-col gap-2";
const promptPreClass =
  "m-0 max-h-[220px] overflow-y-auto rounded-[10px] border border-slate-400/[0.18] bg-slate-900/60 p-2.5 text-[0.82rem] leading-[1.45] break-words whitespace-pre-wrap";

export function ThumbnailPrompt({ clip }: ThumbnailPromptProps) {
  if (!clip.thumbnail_url && !clip.thumbnail_prompt && !clip.social_caption) {
    return null;
  }

  const thumbUrl = clip.thumbnail_url ? getOutputUrl(clip.thumbnail_url) : null;
  const thumbName = clip.name.replace(/\.mp4$/i, "_thumb.jpg");
  const prompt = clip.thumbnail_prompt?.trim() ?? "";
  const caption = clip.social_caption?.trim() ?? "";

  return (
    <div className="mt-3 flex flex-col gap-2.5 border-t border-slate-400/[0.18] p-3">
      <div className={thumbHeaderClass}>
        <ImageIcon size={14} />
        <span>Thumbnail</span>
      </div>

      {thumbUrl ? (
        <div className="relative flex flex-col gap-2">
          <img
            className="w-full rounded-[10px] border border-slate-400/20"
            src={thumbUrl}
            alt="Screenshot best moment"
          />
          <button className={thumbButtonClass} type="button" onClick={() => handleDownload(thumbUrl, thumbName)}>
            <Download size={14} />
            Unduh SS
          </button>
        </div>
      ) : null}

      {prompt ? (
        <div className={promptBoxClass}>
          <pre className={promptPreClass}>{prompt}</pre>
          <button
            className={thumbButtonClass}
            type="button"
            onClick={() => handleCopyText(prompt, "Prompt thumbnail disalin")}
          >
            <Clipboard size={14} />
            Copy Prompt
          </button>
        </div>
      ) : null}

      {caption ? (
        <>
          <div className={thumbHeaderClass}>
            <MessageSquareText size={14} />
            <span>Caption Post</span>
          </div>
          <div className={promptBoxClass}>
            <pre className={promptPreClass}>{caption}</pre>
            <button
              className={thumbButtonClass}
              type="button"
              onClick={() => handleCopyText(caption, "Caption post disalin")}
            >
              <Clipboard size={14} />
              Copy Caption
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
