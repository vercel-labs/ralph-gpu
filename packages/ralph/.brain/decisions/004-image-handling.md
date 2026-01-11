# Decision 004: AI SDK v6 Image Handling in Tool Results

## Status

Implemented

## Context

Browser tools (openBrowser, screenshot, etc.) need to return screenshots that the AI model can actually see and analyze. Initial implementation returned raw base64 strings, which:

1. Were treated as text tokens (extremely expensive)
2. Could exceed model context limits
3. Were not properly interpreted as images by the model

## Decision

Return screenshots using AI SDK v6's `ToolResultOutput` content format:

```typescript
{
  type: "content",
  value: [
    { type: "text", text: JSON.stringify(metadata) },
    { type: "image-data", data: base64String, mediaType: "image/jpeg" }
  ]
}
```

## Implementation Details

### Image Compression

Screenshots are compressed to reduce token usage:

- Format: JPEG (not PNG)
- Quality: 60%
- Result: ~30-50KB instead of potentially megabytes

```typescript
const screenshotBuffer = await page.screenshot({
  type: "jpeg",
  quality: 60,
});
```

### Proper Format

The `image-data` type tells the AI SDK to treat the data as an image, not as text tokens. This is critical for:

- Claude and other multimodal models to actually "see" the image
- Efficient token usage
- Proper context handling

## Reference

- [AI SDK ModelMessage docs](https://ai-sdk.dev/docs/reference/ai-sdk-core/model-message#languagemodelv3toolresultoutput)

## Consequences

- ✅ Model can now see and analyze screenshots
- ✅ Reasonable token usage (~30-50KB images)
- ✅ Browser verification tasks work correctly
- ⚠️ Requires AI SDK v6 (not compatible with v4/v5)
