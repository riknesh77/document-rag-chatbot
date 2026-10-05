const { Tiktoken } = require("js-tiktoken/lite");
const ranks = require("js-tiktoken/ranks/cl100k_base");

const tokenizer = new Tiktoken(ranks);
const MAX_TOKENS = 500;
const OVERLAP_TOKENS = 50;
const encode = (text) => tokenizer.encode(text, [], []);

function chunkText(text) {
  if (typeof text !== "string") throw new TypeError("Text must be a string.");
  if (!text.trim()) return [];
  const tokens = encode(text);
  const chunks = [];
  let start = 0;
  while (start < tokens.length) {
    let end = Math.min(start + MAX_TOKENS, tokens.length);
    let chunk = tokenizer.decode(tokens.slice(start, end));
    // A BPE token boundary can fall inside a Unicode character. Move back
    // until decoding is lossless, and count the actual returned text again.
    while (end > start && (encode(chunk).length > MAX_TOKENS ||
      !text.includes(chunk))) {
      end--;
      chunk = tokenizer.decode(tokens.slice(start, end));
    }
    if (end === start) throw new Error("Unable to split text at a valid token boundary.");
    if (chunk.trim()) {
      chunks.push({ index: chunks.length, text: chunk, tokenCount: encode(chunk).length,
        startToken: start, endToken: end });
    }
    if (end === tokens.length) break;
    let next = Math.max(start + 1, end - OVERLAP_TOKENS);
    // Adjust overlap slightly when its start splits a Unicode character.
    while (next < end && !text.includes(tokenizer.decode(tokens.slice(next, end)))) next++;
    start = next;
  }
  return chunks;
}

module.exports = { chunkText, MAX_TOKENS, OVERLAP_TOKENS };
