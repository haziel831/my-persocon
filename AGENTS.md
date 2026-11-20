# My Persocon — instruções do projeto

Portado de `.cursor/rules/*.mdc` (Cursor) para o OpenCode. As regras originais continuam em
`.cursor/rules/` só como histórico — **estas valem**.

Stack: Tauri 2 + WebView2, ES modules puros, three.js, sem bundler. Rust em `src-tauri`.

## Contexto deste workspace

- `D:\MyProjects\Apps\My Persocon(OpenCode)` = **cópia de trabalho** (esta).
- `D:\MyProjects\Apps\Desktop Pets` = projeto original do Cursor. **Não editar, não mover, não apagar.**
- Projeto agora **é git** (baseline v1.8). Antes disso era versionado à mão (`backup-cursor/`, `backups/`, `dist/`, `ChangeLogs/`).
- `D:\MyProjects\Apps\Assets` = **Shared Library** (assets de todos os projetos). Consumir copiando para o projeto; nunca reorganizar a biblioteca sem pedir.
- Saves ficam em `%APPDATA%\My Persocon`, compartilhados com a cópia original: **não rodar as duas ao mesmo tempo**.

## Idioma e economia de tokens (sempre)

- Responder sempre em **pt-BR** (resumos, avisos, progresso).
- Respostas curtas; não repetir o pedido nem listar tudo o que foi feito.
- Achar arquivos pelo mapa abaixo; não explorar às cegas.
- Grep + leitura por trecho (`offset`/`limit`); não reler arquivos grandes nem já lidos.
- Nada de testes de navegador, screenshots, servidor ou build sem pedido — basta `node --check` / `cargo check`.
- Agrupar edições e chamadas independentes; sem verificações redundantes.

## Restrições do usuário

- **NUNCA build sem aprovação.** Build = `npm run dist` → `dist\My Persocon X.Y [edition]`
  (1.0 = "FirstRelease"; versões sobem +0.1 por build: semver X.Y.0 exibida como X.Y; campo
  `edition` do package.json entra só no nome da pasta). Demo = `npm run demo` →
  `dist\My Persocon Demo X.Y` (liga `DEMO` em `edition.js` só durante o build).
- Modelos padrão: `node scripts/make-persocon.mjs` gera Ninna (`models/MyPersocon`) e Aghata
  (`models/Aghata`); escolha no formulário da intro (`intro.js`, `UNITS`).
- Bump de versão toca: `package.json`, `src-tauri/Cargo.toml`, `Cargo.lock` (persocon),
  `LEIA-ME.txt`, `changelog.js` (`CHANGES`), `CHANGELOG.md`, `ChangeLogs\vX.Y.md`.
- Não mexer no PersoconEX. Moedas só vêm de tempo, lootbox e gacha/slot.
- Sem marcas registradas ("Game Boy", "SNES"…) em texto visível.
- Apagar arquivos um a um, nunca recursivo (`git clean -fdx`, `Remove-Item -Recurse` = só com aprovação).
- Sem beeps de aprovação.
- Lembretes pedidos pelo usuário: `lembretes.md` no store pessoal; avisar quando for relevante (build/update).

## Emojis (nunca do Windows)

- **NUNCA** usar emojis do Windows/Segoe UI Emoji em texto ou como ícone.
- Todo emoji visível vem da fonte **PxEmoji** (`src/renderer/assets/fonts/PxEmoji.otf`), que deve ser
  a **primeira** em toda pilha de fontes (CSS e `ctx.font` de canvas).
- Emoji novo no código → rodar o pipeline antes do build: `test/emoji-scan.mjs` → `test/emoji-fetch.mjs`
  → dump de `test/emoji-build.html` em `test/shots/emoji.html` → `node test/emoji-font.mjs`.
- Ícones de itens/UI: sprite próprio em pixel art ou glifo da PxEmoji (`glyphIcon` em `pixel.js`).

## Mapa — `src/renderer` (lógica)

- `app.js` entrada · `pet.js` orquestra tudo (loop, eventos, desejos, mãos) · `behavior.js` stats/humor/ações/física (`adjust`, `moodGain`, `updateRequest`)
- `speech.js` falas/balões · `i18n.js` textos PT/EN · `names.js`, `introtext.js`, `tips.js`, `changelog.js`
- `toys.js` brinquedos/objetos (BOUNCY, TV) · `funtoys.js` brinquedos especiais · `furniture.js` mobília · `ball.js` bola
- `weather.js` clima ambiente offline (chuva/pétalas/vagalumes/neve) · `tvwatch.js` Assistir na TV · `watch.js`, `modes.js` atividades · `music.js`, `synth.js`, `sound.js` (sfx)
- `catalog.js` opções/presets/temas e busca da loja/inventário · `game.js` itens/loja/uso · `lootitems.js`, `casino.js`, `casinoitems.js`, `vending.js`, `vendupitems.js`, `upgrades.js`, `upgradefx.js`, `rewards.js`, `gains.js`
- `games.js`, `minigames.js`, `arcadeshooter.js` minigames (`crtFilter`)
- `dollskills.js` skills do Doll fora de combate · `trio.js` cenas cooperativas raras (Persocon + Boneca + Corvo) · `doll.js` + `dollai.js` boneca · `crow.js` corvo · `antics.js` travessuras · `care.js` cuidados · `medicons.js`
- `interact.js` arrastar/clique · `ui.js` menus/painéis · `quickmenu.js` · `dock.js` status dock · `focus.js` Modo Foco/Pomodoro · `title.js`, `intro.js` abertura
- `pixel.js` sprites + `glyphIcon` · `emoticons.js` · `fx.js`, `filters.js` · `desktop.js`, `world.js` janelas/chão
- Modelos 3D: `model.js`, `mcmodel.js`, `molang.js`, `vrmview.js`, `view.js`, `hairphys.js` (ossos `HairPhys*`), `preview.js`, `skins.js`, `animation.js`, `genanims.js`
- `bridge.js` invoke Tauri (`petAPI`) · `logger.js` · CSS: `style.css`, `intro.css`
- `vendor/` = three.js/VRM: **nunca ler**.

## Mapa — `src-tauri/src` (Rust)

- `main.rs` comandos `#[tauri::command]` + `generate_handler` · `win32.rs` APIs Windows · `desktop.rs` · `audio.rs` · `model_io.rs` · `logfile.rs`

## Testes (só se o usuário pedir)

- Servidor: `cmd /c "start /b npx http-server -p 8762 -s -c-1 >nul 2>&1"`
- `.\test\shot.ps1 "query" nome budget` com cenários de `test/ui.html`. `test/shots/` = saídas: **nunca ler**.
- Sintaxe JS: copiar para `%TEMP%\x.mjs` e `node --check`. Rust: `cargo check` em `src-tauri`.

## Git

- Commitar em incrementos pequenos, mensagens em pt-BR.
- `node_modules/`, `dist/`, `preview/`, `src-tauri/target/`, `src-tauri/gen/`, `test/shots/` são ignorados (regeneráveis).
- Nunca `git reset --hard` / `git checkout --` em mudanças do usuário sem confirmar.
