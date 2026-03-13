import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { Frame } from "playwright-core";
import type { Ali1688ChatMessageAttachment, Ali1688ChatMessageSnapshot } from "./types.js";

const MAX_ATTACHMENT_BYTES = 12 * 1024 * 1024;

function digest(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sanitizeFilePart(value: string, fallback: string): string {
  const cleaned = value
    .replace(/[^a-zA-Z0-9._-]+/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-|-$/gu, "");
  return cleaned || fallback;
}

function extensionFromMimeType(
  mimeType: string | undefined,
  fallbackKind: Ali1688ChatMessageAttachment["kind"],
): string {
  const normalized = (mimeType ?? "").toLowerCase().split(";")[0].trim();
  switch (normalized) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "image/bmp":
      return ".bmp";
    case "image/svg+xml":
      return ".svg";
    case "application/pdf":
      return ".pdf";
    default:
      return fallbackKind === "image" ? ".img" : ".bin";
  }
}

function extensionFromUrl(url: string | undefined): string {
  if (!url) {
    return "";
  }
  try {
    const parsed = new URL(url);
    const ext = path.extname(parsed.pathname);
    return ext && ext.length <= 8 ? ext.toLowerCase() : "";
  } catch {
    return "";
  }
}

async function fetchAttachmentViaFrame(
  frame: Frame,
  url: string,
): Promise<{ base64: string; mimeType?: string } | null> {
  const result = await frame.evaluate(
    async ({ attachmentUrl, maxBytes }) => {
      try {
        const response = await fetch(attachmentUrl, {
          credentials: "include",
        });
        if (!response.ok) {
          return {
            ok: false,
            error: `http_${response.status}`,
          };
        }
        const blob = await response.blob();
        if (blob.size > maxBytes) {
          return {
            ok: false,
            error: "attachment_too_large",
            mimeType: blob.type || undefined,
          };
        }
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const raw = String(reader.result ?? "");
            const comma = raw.indexOf(",");
            resolve(comma >= 0 ? raw.slice(comma + 1) : raw);
          };
          reader.onerror = () => reject(new Error("file_reader_failed"));
          reader.readAsDataURL(blob);
        });
        return {
          ok: true,
          base64,
          mimeType: blob.type || response.headers.get("content-type") || undefined,
        };
      } catch (error) {
        return {
          ok: false,
          error: String(error),
        };
      }
    },
    {
      attachmentUrl: url,
      maxBytes: MAX_ATTACHMENT_BYTES,
    },
  );

  if (!result?.ok || typeof result.base64 !== "string") {
    return null;
  }
  return {
    base64: result.base64,
    mimeType: typeof result.mimeType === "string" ? result.mimeType : undefined,
  };
}

async function materializeAttachment(params: {
  frame: Frame;
  downloadDir: string;
  conversationId: string;
  messageId: string;
  attachment: Ali1688ChatMessageAttachment;
  cache: Map<string, { localPath: string; mimeType?: string }>;
}): Promise<Ali1688ChatMessageAttachment> {
  const { attachment } = params;
  if (attachment.kind !== "image" || !attachment.url) {
    return attachment;
  }

  const cached = params.cache.get(attachment.url);
  if (cached) {
    return {
      ...attachment,
      localPath: cached.localPath,
      mimeType: cached.mimeType ?? attachment.mimeType,
    };
  }

  const payload = await fetchAttachmentViaFrame(params.frame, attachment.url);
  if (!payload) {
    return attachment;
  }

  const extension =
    extensionFromUrl(attachment.url) || extensionFromMimeType(payload.mimeType, attachment.kind);
  const conversationDir = path.join(
    params.downloadDir,
    sanitizeFilePart(params.conversationId, "conversation"),
  );
  await fs.mkdir(conversationDir, { recursive: true });
  const fileName = `${sanitizeFilePart(params.messageId, "message")}-${digest(attachment.url).slice(0, 10)}${extension}`;
  const filePath = path.join(conversationDir, fileName);
  await fs.writeFile(filePath, Buffer.from(payload.base64, "base64"));
  params.cache.set(attachment.url, {
    localPath: filePath,
    mimeType: payload.mimeType,
  });
  return {
    ...attachment,
    localPath: filePath,
    mimeType: payload.mimeType ?? attachment.mimeType,
  };
}

export async function materializeAli1688ChatMessageAttachments(params: {
  frame: Frame;
  downloadDir: string;
  conversationId: string;
  message: Ali1688ChatMessageSnapshot;
  cache: Map<string, { localPath: string; mimeType?: string }>;
}): Promise<Ali1688ChatMessageAttachment[]> {
  const results: Ali1688ChatMessageAttachment[] = [];
  for (const attachment of params.message.attachments) {
    results.push(
      await materializeAttachment({
        frame: params.frame,
        downloadDir: params.downloadDir,
        conversationId: params.conversationId,
        messageId: params.message.messageId,
        attachment,
        cache: params.cache,
      }),
    );
  }
  return results;
}
