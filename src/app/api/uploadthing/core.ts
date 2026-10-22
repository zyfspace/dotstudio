import { createClient } from '@supabase/supabase-js';
import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { UploadThingError } from 'uploadthing/server';

const f = createUploadthing();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://psidgcxnrvrobbdtaghs.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_n4elEucVzLx47V_xfdR_7A_3IWZEhju',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export const ourFileRouter = {
  // Explicit image types only: a generic `image` would also accept SVG, which can carry scripts
  paymentProof: f({
    'image/png': { maxFileSize: '8MB', maxFileCount: 1 },
    'image/jpeg': { maxFileSize: '8MB', maxFileCount: 1 },
    'image/webp': { maxFileSize: '8MB', maxFileCount: 1 },
    'application/pdf': { maxFileSize: '16MB', maxFileCount: 1 },
  })
    .middleware(async ({ req }) => {
      // The Supabase session lives in the browser, so the client sends its access token
      const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
      if (!token) throw new UploadThingError('Unauthorized');
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) throw new UploadThingError('Unauthorized');
      return { userId: data.user.id };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl || file.url, name: file.name };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
