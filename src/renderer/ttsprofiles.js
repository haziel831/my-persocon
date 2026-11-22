// Named TTS profiles stored in the local config (the same source of truth used by
// the game options and the Stream Control). Secret keys are never captured.

export const TTS_PROFILE_KEYS = [
  'lang', 'ttsEngine', 'fishVoiceId', 'fishModel',
  'offlineTts', 'offlineTtsEvents', 'offlineTtsInteract', 'offlineTtsChatter', 'offlineTtsChatterMin',
  'ttsDir', 'ttsVoice', 'ttsSpeed', 'ttsVolume', 'ttsPitch', 'ttsFilter',
  'ttsRespondMode', 'streamPersona', 'ttsDucking', 'voicePreset', 'persona',
  'ttsMaxChars', 'ttsPronounce', 'ttsWho', 'ttsCooldown', 'ttsUserCooldown',
  'ttsIgnoreCommands', 'ttsIgnoreLinks', 'ttsIgnoreEmotes', 'ttsDedupeChars',
  'ttsSpeakUser', 'ttsHideViewerNames', 'ttsIgnoredUsers',
];

export function ttsProfiles(config) {
  return Array.isArray(config?.ttsProfiles) ? config.ttsProfiles : [];
}

export function ttsProfileId() {
  return `vp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function captureTtsProfile(config, name, id = null) {
  const settings = {};
  for (const key of TTS_PROFILE_KEYS) {
    if (config[key] !== undefined) settings[key] = config[key];
  }
  const list = ttsProfiles(config).slice();
  const at = id ? list.findIndex((p) => p.id === id) : -1;
  const entry = {
    id: at >= 0 ? id : ttsProfileId(),
    name: String(name || '').trim().slice(0, 40) || `Perfil ${list.length + 1}`,
    settings,
  };
  if (at >= 0) list[at] = entry;
  else list.push(entry);
  return { list, entry };
}

export function deleteTtsProfile(config, id) {
  return ttsProfiles(config).filter((p) => p.id !== id);
}
