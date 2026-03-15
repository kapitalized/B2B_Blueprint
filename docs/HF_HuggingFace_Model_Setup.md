The app uses [facebook/detr-resnet-50](https://huggingface.co/facebook/detr-resnet-50) for floorplan extraction via the Hugging Face Inference API. DETR is an object detection model (COCO 2017); it returns bounding boxes and class labels, so the overlay can draw boxes. Labels are COCO classes (e.g. couch, bed, dining table), not room names — the rest of the pipeline still uses this for spatial extraction.

**Integration:** Add `HUGGINGFACE_HUB_TOKEN` (or `HF_TOKEN`) to `.env.local` to enable HF. Set `USE_HF_FLOORPLAN_EXTRACTION=false` to use OpenRouter instead. Code: `lib/ai/floorplan-extraction-hf.ts`, `lib/ai/floorplan-extraction.ts`. The app calls `https://router.huggingface.co/models/facebook/detr-resnet-50` (object detection task). On HF API failure the app can fall back to OpenRouter (or throw, depending on config).

---

1. **Manual setup**
   - Create an account at [HuggingFace.co](https://huggingface.co/).
   - Create a token: Settings > Access Tokens > Create (Read or fine-grained with “Inference Providers”).
   - No need to accept model terms for this public model.

2. **Env vars**
   - `HUGGINGFACE_HUB_TOKEN` or `HF_TOKEN`: your token.
   - `USE_HF_FLOORPLAN_EXTRACTION`: set to `false` or `0` to disable HF and use OpenRouter only.

3. **API**
   - Object detection: POST with `inputs` (base64 image) and optional `parameters.threshold`. Response: array of `{ label, score, box: { xmin, ymin, xmax, ymax } }`. See [Object detection · Hugging Face](https://huggingface.co/docs/inference-providers/en/tasks/object-detection).

[1] [facebook/detr-resnet-50](https://huggingface.co/facebook/detr-resnet-50)
