import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

// FileRouter for our app, handling various file types for WhatsApp templates
export const ourFileRouter = {
  // Simple image uploader (e.g. for user avatars, logos)
  imageUploader: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .onUploadComplete(async ({ file }) => {
      console.log("Image upload complete:", file.url);
      return { url: file.url };
    }),

  // Media uploader for WhatsApp templates (supports images, videos, PDFs)
  mediaUploader: f({
    image: { maxFileSize: "8MB", maxFileCount: 1 },
    video: { maxFileSize: "16MB", maxFileCount: 1 },
    pdf: { maxFileSize: "8MB", maxFileCount: 1 },
  })
    .onUploadComplete(async ({ file }) => {
      console.log("Media template upload complete:", file.url);
      return { url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
