import { DEFAULT_SETTINGS, OLLAMA_BLOCKED, OLLAMA_URL } from '../copilot/generate.js'

const form = document.getElementById('options-form')
const useChromeAi = document.getElementById('use-chrome-ai')
const ollamaModel = document.getElementById('ollama-model')
const testBtn = document.getElementById('test-btn')
const statusEl = document.getElementById('status')

async function loadSettings() {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS)
  useChromeAi.checked = settings.useChromeAi
  ollamaModel.value = settings.ollamaModel
}

async function saveSettings(event) {
  event.preventDefault()
  const model = ollamaModel.value.trim() || DEFAULT_SETTINGS.ollamaModel
  await chrome.storage.sync.set({ useChromeAi: useChromeAi.checked, ollamaModel: model })
  statusEl.textContent = 'Saved.'
}

async function testOllama() {
  try {
    const response = await fetch(OLLAMA_URL + '/api/tags')
    if (response.status === 403) return OLLAMA_BLOCKED
    if (!response.ok) return 'Ollama answered with HTTP ' + response.status
    const data = await response.json()
    const names = data.models.map((model) => model.name)
    return 'Ollama is running. Installed models: ' + names.join(', ')
  } catch (err) {
    console.error(err)
    return 'Ollama is not running on this computer.'
  }
}

form.addEventListener('submit', saveSettings)

testBtn.addEventListener('click', async () => {
  statusEl.textContent = 'Testing…'
  statusEl.textContent = await testOllama()
})

loadSettings()
