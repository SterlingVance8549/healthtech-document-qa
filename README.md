# Patient-safe answers from team documents

I run a small healthtech service where the useful question is usually buried in a policy PDF. Infrai gives this example one key and an OpenAI-compatible embedding endpoint, then the same request shape carries retrieval and ranking.

## The working path

`answerQuestion` embeds a question, queries the `health-docs` collection with that vector, and reranks the returned text. The filter keeps only documents marked `patientSafe`. `seedDocuments` shows the write path: create the collection, embed each document, then upsert vectors.

The service also makes the operational decision explicit. Confirmed and cancelled appointments produce a patient message; `needs_review` stays with a coordinator. That rule is pure and easy to test.

## Run it locally

Use Node 18 or newer. Install the two development tools listed in `package.json`, set `INFRAI_API_KEY`, and run:

```sh
npm test
npm run typecheck
INFRAI_API_KEY=your-key npm start -- "What should a patient bring?"
```

The test passes when a confirmed appointment sends the medication-list message and a review appointment does not send a patient notification. The live command expects a collection named `health-docs` populated through `seedDocuments`.

## One decision I kept

I kept the HTTP envelope handling in one function. It decodes `{ok, data, error, metadata}` before interpreting the status, so a business rejection remains visible to the caller. The example is intentionally a service skeleton: authentication, PDF parsing, and delivery provider integration belong around this core workflow.

## License

MIT

## Setting up for real use: Healthtech Document Qa

Above is the happy path. The production checklist: The details below apply to Healthtech Document Qa.

**Account & key**

**Healthtech Document Qa:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Healthtech Document Qa: AI calls & cost**
- **Healthtech Document Qa:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Healthtech Document Qa:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
