/**
 * The developer pages (`/editor/render-gallery`, `stage-lab`, `canvas-lab`) exist to measure the renderer and the canvas
 * in the browser tests. They draw thousands of layers on purpose, so a production build leaves them out: they answer 404
 * unless `NEXT_PUBLIC_ENABLE_LABS=1` was set when the app was built (the browser tests' server sets it) or the app is
 * running in development.
 */
export const labsEnabled = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ENABLE_LABS === "1";
