---
changelogVersion: 1
plugin: "alibaba"
version: "1.3.1-qwen.2"
locale: "en"
---
# Changelog

## [1.3.1-qwen.2]

### Fixed

- Validate Qwen image reference URL envelopes, authority ports and Base64 data URL syntax before submission and reservation. Reject embedded URL credentials and whitespace/control characters without reflecting the supplied image.
- Keep Qwen unknown task states, query errors and image-less success responses indeterminate instead of returning confirmed failure. Explicit failed or canceled task states remain failures.
- Reject contradictory completion statuses, invalid optional output dimensions and unsafe output URL envelopes during Qwen usage extraction with a reconciliation diagnostic.
- Provide bounded Qwen upstream error categories and valid UUID request IDs in diagnostics without reflecting arbitrary upstream messages. Apply this only when plugin hooks receive the response.

### Migration

- Qwen prices, usage fact names, resolution tiers and billing formulas are unchanged; administrators do not need to reconfigure prices or billing expressions when migrating from 1.3.1-qwen.1. No pricing migration is performed.
- Clients sending malformed Base64 envelopes or URLs containing credentials must correct those inputs. Base64 syntax validation does not decode or validate image contents.
- Indeterminate task results require reconciliation under the host's existing polling and timeout policies; this plugin does not implement durable recovery, automatic resubmission or a new host accounting state.
- This is a private extension, not an official QuantumNous release. It retains the alibaba key and existing routes; it does not change host authentication, UI or HTTP error handling outside plugin hooks.
