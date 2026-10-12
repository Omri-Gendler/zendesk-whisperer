export async function chromeLanguageModelStatus() {
  if (typeof LanguageModel === 'undefined') {
    return { state: 'unsupported', message: 'This Chrome build has no on-device Prompt API.' };
  }
  try {
    var state = await LanguageModel.availability();
    return { state: state, message: String(state) };
  } catch (err) {
    var msg = err && err.message ? err.message : String(err);
    return { state: 'unsupported', message: msg };
  }
}
