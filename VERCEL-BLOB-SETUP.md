# Property image storage on Vercel

1. Open the `realestatewebsite` project in Vercel and choose **Storage → Create Storage → Blob**.
2. Create a **Public** store, named for example `luxeestate-images`. Listing photos are publicly visible.
3. Connect the store to `realestatewebsite` for **Production** (and Preview if desired). Keep the default environment variable prefix. The SDK uses `BLOB_READ_WRITE_TOKEN` or the connected store's `BLOB_STORE_ID` and Vercel OIDC credentials.
4. Redeploy the latest production deployment after the store is connected.
5. Sign in as an approved agent and save a property with a small image. Confirm the image appears on the listing and after refreshing.

The server receives images in memory and writes them to Blob; MongoDB stores the returned public URLs. No writes to the deployed `public/uploads` folder occur on Vercel. Failed saves clean up new uploads, and replaced/deleted listing photos are removed from Blob.

Each save accepts up to 10 images totaling **4 MB**, below Vercel's 4.5 MB function request limit. Larger selections must be resized or compressed before saving. Existing image URLs remain usable. Local development without Blob credentials continues saving images to `public/uploads`.

Keep all Blob tokens private; do not put them in browser JavaScript or commit them to Git.

Docs: https://vercel.com/docs/vercel-blob/using-blob-sdk
