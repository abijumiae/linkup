import { ApiError, getApiBaseUrl } from "./api";
import { clearAuth, getToken } from "./auth";

export type UploadMediaType = "image" | "video";

export type UploadResult = {
  url: string;
  type: UploadMediaType;
  filename: string;
};

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export function validateMediaFile(file: File): string | null {
  const isImage = IMAGE_TYPES.has(file.type);
  const isVideo = VIDEO_TYPES.has(file.type);

  if (!isImage && !isVideo) {
    return "Use JPEG, PNG, WebP, MP4, WebM, or MOV files.";
  }

  if (isImage && file.size > MAX_IMAGE_BYTES) {
    return "Images must be 5MB or smaller.";
  }

  if (isVideo && file.size > MAX_VIDEO_BYTES) {
    return "Videos must be 50MB or smaller.";
  }

  return null;
}

export async function uploadFile(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<UploadResult> {
  const validationError = validateMediaFile(file);
  if (validationError) {
    throw new ApiError(validationError, 400);
  }

  const token = getToken();
  if (!token) {
    throw new ApiError("Not authenticated", 401);
  }

  const formData = new FormData();
  formData.append("file", file);

  if (!onProgress) {
    const response = await fetch(`${getApiBaseUrl()}/uploads`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const message =
        data &&
        typeof data === "object" &&
        "message" in data &&
        typeof (data as { message: unknown }).message === "string"
          ? (data as { message: string }).message
          : "Upload failed";
      if (response.status === 401) {
        clearAuth();
      }
      throw new ApiError(message, response.status);
    }

    return data as UploadResult;
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${getApiBaseUrl()}/uploads`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }
      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      let data: unknown = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = null;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as UploadResult);
        return;
      }

      const message =
        data &&
        typeof data === "object" &&
        "message" in data &&
        typeof (data as { message: unknown }).message === "string"
          ? (data as { message: string }).message
          : "Upload failed";

      if (xhr.status === 401) {
        clearAuth();
      }

      reject(new ApiError(message, xhr.status));
    };

    xhr.onerror = () => reject(new ApiError("Upload failed", 0));
    xhr.send(formData);
  });
}
