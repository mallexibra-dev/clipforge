import { Clipboard, Download, ImageIcon, MessageSquareText } from "lucide-react";
import { getOutputUrl } from "../../lib/apiClient";
import { handleCopyText, handleDownload } from "../../lib/utils";
import type { ClipFile } from "../../types/clip.type";

type ThumbnailPromptProps = {
  clip: ClipFile;
};

export function ThumbnailPrompt({ clip }: ThumbnailPromptProps) {
  if (!clip.thumbnail_url && !clip.thumbnail_prompt && !clip.social_caption) {
    return null;
  }

  const thumbUrl = clip.thumbnail_url ? getOutputUrl(clip.thumbnail_url) : null;
  const thumbName = clip.name.replace(/\.mp4$/i, "_thumb.jpg");
  const prompt = clip.thumbnail_prompt?.trim() ?? "";
  const caption = clip.social_caption?.trim() ?? "";

  return (
    <div className="thumbBlock">
      <div className="thumbBlockHeader">
        <ImageIcon size={14} />
        <span>Thumbnail</span>
      </div>

      {thumbUrl ? (
        <div className="thumbPreview">
          <img src={thumbUrl} alt="Screenshot best moment" />
          <button type="button" onClick={() => handleDownload(thumbUrl, thumbName)}>
            <Download size={14} />
            Unduh SS
          </button>
        </div>
      ) : null}

      {prompt ? (
        <div className="thumbPromptBox">
          <pre>{prompt}</pre>
          <button
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
          <div className="thumbBlockHeader">
            <MessageSquareText size={14} />
            <span>Caption Post</span>
          </div>
          <div className="thumbPromptBox">
            <pre>{caption}</pre>
            <button
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
