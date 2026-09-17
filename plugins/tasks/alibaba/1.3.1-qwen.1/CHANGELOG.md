---
changelogVersion: 1
plugin: "alibaba"
version: "1.3.1-qwen.1"
locale: "en"
---
# Changelog

## [1.3.1-qwen.1]

### Added

- Add a private, AI-assisted Qwen Image 3.0 and Qwen Image 3.0 Pro extension based on QuantumNous Alibaba 1.3.0. This is not an official QuantumNous release.
- Support text-to-image and up to three reference images, one to six outputs, explicit pixel sizes and automatic sizing, prompt extension modes, thinking, negative prompts, seed and watermark.
- Add a synchronous Images-compatible native route at `/ali/compatible-mode/v1/images/generations`, plus Qwen support on the existing native synchronous/asynchronous image routes and Responses task interface.
- Expose four independent input/output 1K/2K usage counters from provider completion statistics, including zero counters that clear unused reservation tiers.

### Security

- Validate quantity, size and parameter bounds before billing and submission, including metadata overrides. Reject invalid completion counts and missing billing types rather than inventing actual usage.

### Migration

- Configure task usage expression pricing separately for both Qwen models using `qima_input_1k`, `qima_input_2k`, `qima_output_1k` and `qima_output_2k`. Existing prices are not migrated; Qwen rejects legacy ratio billing. Expression coefficients are USD per image; convert regional vendor prices explicitly. Wan prices require no change solely for this extension.
- Automatic size reserves both possible tiers as a conservative upper bound; successful complete usage clears the unused tier. Missing or invalid usage retains the host reservation and needs reconciliation; it is not a confirmed final provider charge.
- The custom version retains the `alibaba` key and replaces that plugin's active version. Do not auto-update it from the official marketplace without reviewing loss of these Qwen additions.
- The Images-compatible route uses the `/ali/compatible-mode` prefix rather than taking ownership of the host's `/v1/images/generations`. It is synchronous, returns URLs, and follows the provider's unsupported multipart, mask and partial-image boundaries. Native async requests use the existing image-generation route, not a synchronous route plus an async header.
