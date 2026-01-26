# Idea: Threads Counter-Argument Chrome Extension

**Status:** Tabled
**Date:** 2025-01-25

## Concept

A Chrome extension that:
1. Detects when you're viewing a post on Threads (threads.net)
2. Shows a button to analyze the post
3. Sends the post content to an LLM
4. Returns sources/arguments that counter the post's claims

## Research

### Existing Tools (none are exact matches)

- [Fact-Yab](https://github.com/sabber-slt/fact-yab) - Fact-checks tweets on hover using OpenAI
- [UnCovered](https://docs.perplexity.ai/cookbook/showcase/uncovered) - Real-time fact-checking via Perplexity Sonar API
- [Facticity AI](https://chrome-stats.com/d/hdnjdejpbkheekehhmfmjmdpbjiphcfl) - General AI fact-checker with citations

These focus on true/false verification, not generating debate-style counter-arguments.

### Feasibility

- Cannot reuse the existing Reddzit extension (different purpose entirely)
- Would need: content script injection, DOM parsing for Threads, LLM API integration
- Threads doesn't have a public API, so would need to scrape post content from the DOM

## Open Questions

- Personal tool vs public extension?
- Which LLM API to use?
- How to handle Threads' DOM structure (likely to change)?
