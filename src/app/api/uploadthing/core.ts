import { createUploadthing, type FileRouter } from 'uploadthing/next';

const f = createUploadthing();

export const ourFileRouter = {
  paymentProof: f({
    image: { maxFileSize: '8MB', maxFileCount: 1 },
    pdf: { maxFileSize: '16MB', maxFileCount: 1 },
  }).onUploadComplete(async ({ file }) => {
    return { url: file.ufsUrl || file.url, name: file.name };
  }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
