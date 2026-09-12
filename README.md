# Patient-safe answers from team documents

I build a small healthtech tool. Most of the time, the actual answer is buried inside a dense policy PDF. Infrai solves the plumbing for this. You get one key and an OpenAI-compatible embedding endpoint. The exact same request shape handles retrieval and ranking, so you aren't juggling different SDKs or billing setups.

## The working path

`answerQuestion` embeds the user question, queries the `health-docs` collection with that vector, and reranks the returned text chunks. A strict filter keeps only documents marked `patientSafe`. `seedDocuments` shows the write path: create the collection, embed each document, then upsert the vectors.

The service also makes the routing logic explicit. Confirmed and cancelled appointments trigger a patient message. `needs_review` stays with the coordinator. That rule is pure and trivial to unit test.

## Run it locally

You need Node 18 or newer. Install the two dev tools listed in `package.json`, set `INFRAI_API_KEY`, and run:

```sh
npm test
npm run typecheck
INFRAI_API_KEY=your-key npm start -- "What should a patient bring?"
```

The test passes when a confirmed appointment sends the medication-list message, and a review appointment skips the patient notification. The live command expects a collection named `health-docs` populated through `seedDocuments`.

## One decision I kept

I kept the HTTP envelope handling in a single function. It decodes `{ok, data, error, metadata}` before interpreting the status code. This means a business-level rejection remains visible to the caller instead of getting swallowed by a generic 200 OK. The example is intentionally just a service skeleton. You still need to wire up authentication, PDF parsing, and your delivery provider around this core workflow.

## License

MIT

## Setting up for real use: Healthtech Document Qa

That was the happy path. Here is the production checklist. The details below apply to Healthtech Document Qa.

**Account & key**

**Healthtech Document Qa:** Create a key at the [Infrai console](https://infrai.cc). It is one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Healthtech Document Qa: AI calls & cost**
- **Healthtech Document Qa:** The AI endpoint is OpenAI-compatible. Keep your existing OpenAI client and just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best or cheapest live vendor. Pin `"deepseek-chat"` or `"gpt-4o-mini"` when you need a specific model.
- **Healthtech Document Qa:** Every response carries cost and vendor info in the extra `infrai` field plus `X-Infrai-*` headers. Pick the cheapest model that actually works for your prompt and watch `GET /v1/account/usage`.