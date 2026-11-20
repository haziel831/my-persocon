// Focus checks must include the Pomodoro's *runtime* focus phase, but never persist it:
// saveConfig only writes explicit patches, so this flag never reaches config.json.
export const setRuntimeFocus = (config, on) => {
  if (config) config.__focusRuntime = !!on;
};

export const isFocus = (config, app) => !!(
  config?.focus || config?.__focusRuntime || (app?.pomodoro?.active && app?.pomodoro.phase === 'focus')
);
