# Histórico de versões — My Persocon

Cada versão gerada com `npm run dist` fica na sua própria pasta: `dist\My Persocon vX.Y.Z\My Persocon.exe`.
Desde a v1.1.0 os arquivos do jogador (configurações, save + 3 backups, modelos importados e logs) ficam em `%APPDATA%\My Persocon` e passam de uma versão para a outra. Cada versão tem um arquivo próprio em `ChangeLogs\vX.Y.Z.md` (copiado para a pasta do app).

Para lançar uma versão nova: mude `"version"` no `package.json` (e em `src-tauri\Cargo.toml`), anote as mudanças aqui e em `ChangeLogs`, e rode `npm run dist`.

A partir da v1.1.1, cada modificação gerada sobe 0.0.1 (v1.1.2, v1.1.3...).

## v1.9.23 — 13/11/2026
**Reformulação completa do combate em JRPG.** Barra de **ordem de turnos** no topo (retratos, o da vez cresce e ganha anel dourado), **formação lado a lado** (a Persocon e o Corvo à esquerda, os inimigos à direita) e cada turno em **4 fases**: anúncio (~900 ms, nome acima da cabeça + anel no chão), passo/carga (~800 ms, azul e partículas), impacto (animação do golpe + **hit-stop de 120 ms**) e respiração (~1,2 s) antes do próximo da fila agir.
**Feedback novo.** O número de dano sobe e **quica no chão**; o **ícone do item** consumível usado flutua acima da cabeça dela; a vitória tem **pose, fanfarra e banner com o resumo de XP**.
**O Corvo virou aliado de combate.** Se estiver na área de trabalho e souber ≥1 Skill de Combate, entra na luta por conta própria; inimigos não podem mirá-lo. **6 Skills de Combate** (Rasante Sombrio, Penas Cortantes com sangramento, Bicada nos Olhos com cegueira, Grito de Alerta, Busca de Emergência e Provocação Aérea). O perfil dele ganhou uma coluna **Skills de Combate**.
**Especial.** O **Cartucho Preto** e o **Cristal Negro** moram exclusiva e permanentemente na aba **Especial** do Inventário (invendíveis). O cartucho preto some da Shop e da estante, mas pode ser usado **para sempre** (uma compra única).
**Dois modais de lore nefastos** (fundo preto, borda vermelha pulsante, glitch, drone sombrio gerado por WebAudio, texto em máquina de escrever que acelera/completa no clique e fecha no segundo clique): **Trigger A** ao receber o cartucho pela primeira vez ("Este cartucho emite uma aura sombria . . .") e **Trigger B** na primeira vitória contra o Unknown ("Esta estranha substancia pulsa com uma energia ruim . . ."), que derruba o **Cristal Negro uma única vez**.
**Waves 1–10.** A TV avisa `"⚠️ ALERTA DE ANOMALIA — WAVE X ⚠️"`, o cartucho desce flutuando sobre a TV e entra nela; saem N gosmas de glitch (Wave 1 rebalanceada para ~95 HP — **nunca mais morre de 1 golpe**; ondas 2–3: 2 inimigos; 4–6: 2–3 com stun; 7–9: 3–4 elite). Cada onda limpa avança +1 (`profile.blackCartridgeWave`). **Wave 10 = trava do Boss**: o cartucho recusa a TV ("O cartucho rejeita a TV... algo gigantesco aguarda no Wave 10.").
Detalhes em `ChangeLogs\v1.9.23.md`.
**Correção: o modal de lore não fechava no clique.** A janela do jogo vive em **pass-through** (cliques atravessam para a área de trabalho, exceto quando há UI aberta): o modal agora entra no `uiOpen()` do jogo — a janela volta a receber cliques enquanto ele está na tela e volta a atravessar quando ele fecha. As camadas decorativas (fatias de glitch, ícone, texto, prompt) viraram `pointer-events: none`, o fundo e a caixa ganharam `cursor: pointer` e z-index 99999, o prompt pisca `[ Clique para fechar ▼ ]` após o texto terminar e as teclas **Esc**, **Enter** e **Espaço** também avançam/fecham o modal.

**Correção: o cartucho preto interrompe TUDO o que a Persocon está fazendo** (luta com o boneco, comer, dormir, assistir, brincar, correr) e ela encara a horda — a inserção chama `interruptPet()` (larga o toy/refeição/atividade/perseguição e congela a IA dela até o contato) e `melee.leave('interrupted')` derruba qualquer combate em curso. Reinserir após a primeira vitória voltou a funcionar (o estado `gone` rejeitava a nova erupção).
**As waves escalam de verdade.** Cada onda traz mais inimigos e mais fortes: 1→2→2→3→3→4→4→5→5 inimigos, com HP/ATK/DEF/precisão/atordoamento crescentes a cada wave.
**Correção: a batalha começa no chão** (a formação desce a Persocon do móvel para o chão antes do combate) **e não termina mais sozinha** poucos segundos depois (em combate o toyPlay não é derrubado por uma ação qualquer e a exaustão é resolvida pelo próprio motor com a mensagem certa).
**A fila de turnos** ficou no meio da tela e agora usa os **emotes recortados das Persocons**: Aghata (NORMAL/ANXIOSA/SAD) e Ninna (NORMAL/SAD/SHY) pela faixa de HP dela, mudando a cada golpe. Os inimigos usam o **retrato estático da gosma** (o frame 0 convertido do sprite original: corpo preto, olhos vermelhos).
Detalhes em `ChangeLogs\v1.9.23.md`.
**Correção definitiva: a Wave do cartucho preto.** A inserção derruba a Persocon do estado livre na hora (hard override): o combate começa **assim que a erupção termina** — ela vai para a esquerda, a horda aparece à direita, e o loop JRPG começa sem esperar o contato nem andar para o boneco. A luta com a horda nunca mira o boneco de treino; o dano e o flash vermelho só acontecem nos inimigos da onda; as ondas 1–9 usam a tabela oficial (100→135→175→220→270→330→400→480→580 HP).
**Correção: gosma dessincronizada + fim prematuro.** O sprite da gosma segue sempre o `enemy.x/y` real (uma fonte de verdade só, a mesma das barras de HP e do alvo). A luta não cai mais sozinha (a horda não usa o toy de treino e o duplo clique não cancela a Wave); só termina por vitória, recuo ou exaustão. A fila de turnos mostra o retrato certo (detectado pelo modelDir e pelo nome do personagem).
Detalhes em `ChangeLogs\v1.9.23.md`.

**Correção: crash no damageFoe (a luta nunca mais cai sozinha).** O `damageFoe()` agora aplica o dano em `opp.hp` ANTES de qualquer chamada externa visual/XP; cada efeito (flash, VFX, shake, som, XP, cabeças de HP, fila) tem seu próprio `try/catch` — nada mais derruba a luta no meio de um golpe.
**Causa raiz do crash "opp.enemy.flash is not a function":** a classe `Slime` criava `this.flash = 0` no construtor (temporizador do flash) e `flash()` no protótipo — a propriedade de instância **sombreava o método**, então `slime.flash` era `0` e `0?.()` lançava `TypeError`. Agora o temporizador se chama `flashT`, `flash()` é o método, e a Wave avança de verdade (Wave 1 vencida ⇒ `blackCartridgeWave` = 2).
**Fonte de verdade única para o inimigo.** O sprite da gosma, a barra de HP sobre ele e o alvo do golpe leem o mesmo objeto (`foes[i]` + `foe.x`/`foe.y`); a formação teleporta os três juntos e a Wave 1 vencida incrementa `blackCartridgeWave` (→ 2; segunda vitória → 3).
Detalhes em `ChangeLogs\v1.9.23.md`.
**Correção: a Persocon fica travada após o combate do cartucho.** A IA estava sendo pausada pela `interruptPet()` e nunca mais destravada — no fim da luta ela parava em `idle` para sempre. Agora a IA fica livre quando o combate começa (e `melee.stop()` garante `resume()` mesmo em saídas de emergência).
**Correção: Aghata exibia o retrato de Ninna.** A detecção do modelo usava a substring errada ("aghta", inexistente em "aghata") — agora usa "aghata" (funciona para `models/Aghata` e pelo nome configurado).
Detalhes em `ChangeLogs\v1.9.23.md`.

## v1.9.24 — 14/11/2026
**Máquinas com pixel art (Gacha e Slot).** As duas máquinas ganharam arte nova (`assets/alts/`): **PNG parada** quando ociosa e **GIF animada** enquanto a Persocon (ou você) opera — cada uma com a versão normal e a Neon atualizada.
**Conquistas com ícones GTORAVERSE (32x32).** Todas as conquistas usam ícones do pack (tema + tier: comum=Bronze, rara=Silver, lendaria=Gold), na aba Conquistas e no popup de desbloqueio.
**Novo atributo: Agilidade.** Corre **mais rápido** (+7% por nível), **pula mais alto** no pula-pula (+9% por nível) e, a partir do **Nv 4**, tem chance de um **golpe extra gratuito no mesmo turno** (+8% por nível; Nv10 = 56%). Treina **jogando no pula-pula** (0,5 XP por pulo, flips/twists dão bônus), **correndo**, com a **Bola de Queimada**, o **gancho**, o **bambolê**, o **skate**, o **pega-pega** (+2 por pegada/escape) e ao **terminar sessões de treino** (+10 XP).
**Pula-pula Synthwave.** Novo upgrade (570 moedas): arte synthwave neon (sol em gradê, grade ciano/magenta), **pulos +15%** e **XP de Agilidade ×1,5** no pula-pula.
**O gancho voltou.** Ela usa o gancho sozinha de novo (chance 25%, em qualquer superfície) e cada disparo treina a Agilidade.
**Unificações.** O **pega-pega** treina Agilidade (+2 por pegada/escape); o **Sucataoxidado** ganha **3 posturas** (Certeiro: mais acerto e menos dano · Defensivo: fecha o corpo · Brutal: mais dano e crítico, mas erra mais), sorteadas a cada sessão; **6 conquistas novas de atributo** (Força/Constituição/Agilidade nos marcos Nv 5 e Nv 10); **2 missões diárias** (pular no pula-pula, esquivar ou bloquear no combate); combo **Doll + Pula-pula** rende XP bônus.
**Painel pós-luta.** VITÓRIA e DERROTA agora mostram estatísticas: golpes, acertos e precisão, dano total e XP por fonte.
**Shop de Mobília.** Botões **Treinar Força** (Boneco) e **Treinar Agilidade** (Pula-pula) na categoria Mobília do Shop.
**Glitch Surge (ondas 5+).** Gosmas estouram ao morrer — explosão, screenshake e dano em área (nunca derruba a Persocon).
**Destreza (DEX) liga o combate.** Precisão, crítico e esquiva/bloqueio passam a escalar com o nível dela; o XP de esquivar/bloquear migrou de Agilidade para Destreza; as descrições de atributo agora existem em PT e EN.
**DERROTA com recuperação ao vivo.** O banner de derrota mostra a barra de recuperação (50% de HP/Energia para acordar); cada up de atributo ganha um toast (ícone GTORAVERSE do tier).
**Waves recomeçam.** Ao vencer a Wave 9, o ciclo volta à Wave 1 (o Wave 10 fica guardado para o boss futuro).
**Formação clássica no centro (estilo SNES).** A luta contra a horda agora acontece no CENTRO da tela: a Persocon entra pela direita e o Corvo (se aliado) flutua logo atrás/acima dela; a horda se enfileira à esquerda em zigue-zague. Só o primeiro turno começa depois do "beat" clássico (0,9s de encarada). O Boneco de Treino continua móvel estática (ela apenas caminha até ele). O sprite da gosma agora é espelhado para encarar a Persocon.
**Correção: o Corvo no combate.** Ele passa a ficar **atrás da Persocon** (no lado oposto ao inimigo), encarando o mesmo lado que ela, e o anel de turno fica **no chão** — nunca mais flutuando no céu. O turno dele não derruba mais a luta (o alvo no treino não tinha sangramento e estourava um erro) e agora ele **voa até o alvo**, anuncia "Corvo usa ...", aplica o dano e volta; no treino contra o Boneco ele sempre ataca (debuff não tem efeito ali).
**Encarada do combate.** A cada frame Persocon e Corvo apontam para o inimigo vivo (`melee.faceCombatants()`) e cada gosma da onda aponta para ela — não existe mais luta com todo mundo de costas. O Corvo paira **65 px atrás do ombro** dela (`pet.y − 85`) e bate as asas em loop contínuo com uma flutuação suave (nunca a pose parada no ar).
**Coreografia do Corvo.** **Penas Cortantes** virou uma rajada de **8 a 14 penas pretas** que cruzam a tela e só causam dano, flash, sangramento e número **no impacto**; **Rasante Sombrio** e **Bicada nos Olhos** são **investidas em alta velocidade** com rastro escuro, dano no contato e volta; **Provocação Aérea** dá um **círculo rápido sobre a cabeça do inimigo** soltando penas; **Grito de Alerta** e **Busca de Emergência** sobrevoam a cabeça dela soltando partículas de buff ou largando o item.
**Fila de turnos corrigida.** O Corvo agia para sempre porque `nextEntry()` comparava o `foeIdx` dele (-1) com o índice do primeiro inimigo vivo (0) e nunca achava a própria entrada na fila. Agora a comparação ignora o índice para Persocon e Corvo: a ordem fecha **Persocon → Corvo → inimigos** (uma ação por ciclo, com cão de guarda de 2,5 s).
**Carga vermelha antes de todo golpe.** Antes de atacar, Persocon, Corvo e inimigos **acendem em vermelho por ~500 ms** (brilho no modelo + aura e partículas), liberam num **clarão** e só então o golpe/projétil sai; o dano e o número continuam no impacto.
**Textos de combate mais altos e sobem.** As caixas de ação e o número de dano nascem mais acima e sobem continuamente enquanto somem.
**Animações de corpo no combate.** Todo salto tem **agachada** antes do impulso; golpe pesado **arremessa de verdade** (arco com gravidade, queda com poeira e tremor, caída e levantada com o turno esperando); cada golpe ganhou **clipe próprio** (jab, cruzado, uppercut, gancho, chutes, dropkick, guarda e conjuração da Fúria) e usar item é **animado** (mão ao bolso, item até a boca, ~450 ms com ícone). Tudo gerado em código, nos dois modelos.
**Derrota = Banner sombrio + INCONSCIENTE.** Na derrota contra a horda: banner vinho-sangue, vignette escura na tela inteira, fumaça escura engolindo os inimigos (que recuam para dentro da TV), som grave — e a Persocon desaba INCONSCIENTE no chão: trava total de interação (clique, arraste, tapa, comandos, antics) e regen passiva até 50%+ de HP e Energia, quando ela acorda sozinha. A vitória ganhou faíscas douradas no banner.
**Correção: a luta não trava mais depois do arremesso.** O turno podia congelar com ela caída no chão (a IA andava e o combate não reagia). Agora o turno se destrava sozinho quando a queda some e, no máximo em 2,6 s, por cão de guarda; o avanço até o alvo tem limite de 1,6 s e a cola no alcance se não conseguir chegar. `stop()` limpa o nocaute.
**Correção: item no meio da luta.** Usar remédio/power-up durante o combate travava a Persocon andando sem agir. Agora o item vale na hora (sem passar pela fila), não toma mais a ação dela e, se alguma ação por baixo tirar a luta do comando, o motor é resgatado no mesmo quadro.
Detalhes em `ChangeLogs\v1.9.24.md`.

## v1.9.22 — 13/11/2026
**Visual dos objetos: ajuste ao vivo no objeto de verdade.** A prévia pequena do import continua **fixa (100%)** — ela é só a referência estática para o conta-gotas de transparência e para marcar o hitbox. Tudo o que o modal muda agora aparece **na hora, no objeto real na área de trabalho** (ex.: o boneco de treino do lado da Persocon):
- **imagem/GIF/modelo 3D novo**, **tamanho**, **rotação livre**, **espelho**, **velocidade** e a **transparência** (assada no `bake()`, com *debounce* de ~140 ms);
- o objeto real é desenhado a partir do **rascunho** do modal enquanto ele está aberto (o jogo nunca toca no objeto salvo antes do *Aplicar*).
**Aplicar vs. desfazer.** O modal guarda uma cópia da aparência salva (`initialConfigSnapshot`) antes de abrir (e ao trocar de objeto na lista): *Aplicar* persiste o rascunho e limpa a cópia; *Fechar* ou o **X** descartam o rascunho e o objeto volta **exatamente** à aparência de antes — sem reescrever disco.
**Correção: o Tamanho não mudava nada.** O motor do boneco de treino (`TrainingDummy.update()`) apagava **todos** os `scale()` do transform a cada quadro, destruindo o Tamanho ao vivo e o salvo; agora ele remove só o que é dele (giro em rad e squash de 2 argumentos) e preserva o `scale` de 1 argumento. Os objetos também passaram a crescer a partir do chão (`transform-origin: 50% 100%`).
Detalhes em `ChangeLogs\v1.9.22.md`.

## v1.9.21 — 13/11/2026
**Importar imagem/GIF ficou mais completo** (menu *Visual dos objetos*):
- **Tamanho**: slider de **25% a 400%** — a imagem entra maior ou menor na área de trabalho (o proporção do objeto é recalculada na hora);
- **Rotação livre**: slider de **0° a 360°** (além dos botões rápidos de 90°), com a prévia girando junto;
- **Cor de transparência**: seletor de cor + **tolerância** (0–120) — os pixels daquela cor ficam transparentes; dá para **clicar na prévia** para pegar a cor de um pixel exato (o clique é corrigido pela rotação e pelo tamanho).
- Tudo isso é assado no `bake()` (canvas), então vale igual para imagem solta e para GIF animado.
**A prévia do import mostra o arquivo de verdade.** Antes ela era só um `transform` de CSS (a imagem original com zoom); agora ela é **reassada** (o mesmo `bake()` que vai para o save): o que aparece é o arquivo **já modificado** — tamanho, rotação e a cor que sumiu. O botão *Aplicar* usa exatamente esses quadros, então **o que você vê é o que vai ficar na área de trabalho**.
**Novo: marcar o hitbox do objeto.** No import há o botão **“🎯 Marcar hitbox”**: arraste sobre a prévia para marcar a parte da imagem que **responde ao clique** (o resto deixa o clique passar para a área de trabalho). O retângulo verde aparece na prévia, é salvo com o objeto e vale para o clique no objeto e para o clique-através.
**O aviso de golpe especial ficou dourado** (`#ffd75e` com brilho âmbar), no lugar do verde — para diferenciar o golpe de combate e a manobra especial das falas normais dela.
Detalhes em `ChangeLogs\v1.9.21.md`.

## v1.9.20 — 13/11/2026
**O feed de ganhos mudou de casa.** Ele agora fica **logo abaixo da caixinha ⭐ XP** (no dock) e **parou de repetir o XP**: cada informação aparece uma vez só — o XP na caixinha, o resto no feed.
**O sono é lock.** Enquanto ela dorme, **nada** a acorda: a **impressora 3D** segura o aviso da impressão até ela acordar de novo (e ela continua clicável — o bug de ela ficar "travada" some), e **nenhuma tarefa de fundo** tira ela da cama. O que o jogador dá enquanto ela dorme (comida, bebida, sobremesa, remédio) entra na **`pendingWakeUpQueue`** e ela consome **na ordem**, assim que acordar.
**O combate ficou mais devagar.** Cada turno passa a durar **mais de 3 segundos** (anúncio 0,85 s + carga 0,45 s + antecipação 0,5 s + impacto 0,65 s + recuperação 1 s), dando tempo de ler cada ação.
**O texto da ação fica em cima de quem agiu.** Saiu a caixinha única: o texto dela (verde `#22c55e`) fica **diretamente acima da cabeça da Persocon** e o do inimigo (vermelho `#ef4444`) **acima da cabeça dele**. E **golpe de combate / manobra especial** mostram o nome **maior (19 px) e piscando 5 vezes** durante a carga e a execução.
**Treino Pesado só do jogador.** O `playDummy()` agora exige o selo do jogador (`byPlayer`): a IA da Persocon **nunca** inicia uma luta de verdade, mesmo passando o modo "sparring" por engano.
**Shop: a compra em quantidade voltou** — botões **1x / 5x / 10x** em *Comidas*, *Bebidas*, *Sobremesas* e *Medicamentos*.
**Bebida nova: Energy Drink** (¥ 22) — dá **+45 de Energia** e **−12 de Sede** (a hidratação cai: ela fica com sede e quer uma água em seguida). O ícone é uma lata ciano do *16x16 Icon Pack*.
**Missões Diárias: botão "🎲 Resetar Missões (1/dia)"** — só pode usar **uma vez por dia** (`lastDailyResetDate`): sorteia de novo **só as missões não concluídas**; as concluídas **mantêm** o estado e o prêmio.
Detalhes em `ChangeLogs\v1.9.20.md`.

## v1.9.19 — 13/11/2026
**Log de XP no canto da tela.** Uma caixinha **logo abaixo do Chat** no dock mostra, em tempo real, o que a Persocon está treinando: `+12 XP em Combate Corpo a Corpo`, `+4 XP em Força (Treino Pesado)`, `+8 XP em Constituição`. Tem **botão de recolher** (e uma opção no menu do dock).
**Cristal Negro garantido.** Se ela derrubar o Unknown, o **1× Cristal Negro** é dela **sempre** — a vitória agora é conferida **antes** da parada de segurança (ela não perde mais o drop por estar com a vida baixa) — e o **save é escrito na hora**, para o cristal não se perder. O item é **invendível** (`unsellable`/`canSell: false`, e o `isSellable` respeita a flag) e mora na aba **Especial** do Inventário, **sem botão de vender**.
**Banner fixo de combate.** As falas do combate não voam mais soltas por cima dos personagens: agora se empilham numa **caixinha fixa acima das cabeças** (verde `#22c55e` para as ações dela, vermelho `#ef4444` para as do inimigo). Os **números de dano** também sobem acima da cabeça de quem levou, sem cortar no corpo.
**Carga azul antes do golpe.** Todo golpe ativo e toda manobra especial passaram a ter duas etapas: **1) a carga** (~450 ms; ~550 ms na manobra) — ela brilha em **azul** (`#3b82f6`/`#00d2ff`), as partículas de energia sobem em volta do corpo e o som sobe de tom; **2) a execução** — só então a animação do golpe toca e o VFX de impacto explode no ponto certo.
Detalhes em `ChangeLogs\v1.9.19.md`.

## v1.9.18 — 12/11/2026
**A Força e a Constituição agora se treinam.** Antes, a Força só subia no Treino Pesado e a Constituição só com o gasto de energia. Agora cada atividade treina do seu jeito:

| atividade | Força | Constituição |
|---|---|---|
| escalar as janelas (por segundo) | pouco | — |
| Bola de Queimada (arremesso / pegar) | médio | — |
| Boneco de Treino (golpe acertado / turno) | médio | médio |
| Treino Pesado e luta contra o Unknown (golpe acertado) | **muito** | — |
| Treino Pesado e luta contra o Unknown (levar dano) | — | **muito** (por ponto de Saúde) |
| terminar a sessão de Treino Pesado | bônus | — |
| gastar energia no dia a dia | — | pouco |

**No Perfil, a segunda barra.** Cada atributo ganhou uma barra fininha embaixo da do nível: ela mostra o XP do nível e o quanto falta para o próximo (12 / 75 XP), e **anda sozinha** enquanto o menu está aberto. O nível também se atualiza na hora.
**O indicador pequeno de XP.** No canto da tela aparece o que ela acabou de ganhar (`+2 XP · Força`), e quando ela sobe de nível o aviso muda para `Nv 3 · Força subiu!` (com um sominho de confirmação).
**As caixinhas dos atributos agora ensinam o caminho**: a Força diz que se treina escalando, arremessando e no boneco; a Constituição, que se treina gastando energia, levando dano e treinando.
**O cartucho preto ficou mais difícil de achar.** Ele só aparece na Shop **depois que o jogador tiver todos os outros cartuchos** (os 14 do catálogo).
**A Persocon nunca insere o cartucho preto sozinha.** Ela nunca escolhe esse cartucho sozinha (o `pickCart()` o ignora): o evento só começa quando o jogador insere o cartucho na TV.
**A TV guarda o cartucho para sempre.** Depois de vencer o Unknown uma vez, o menu da TV ganha a opção **“🕹 Inserir o cartucho preto de novo”**: a criatura pode ser enfrentada quantas vezes o jogador quiser (a primeira inserção usa o mesmo caminho, então nada acontece por acidente).
**Impacto em sequência de quadros.** O golpe agora toca uma sequência do *Free Pixel Effects Pack #16* (copiado para `src\renderer\assets\vfx\pixel_effects_16\`, 9 pastas × 60 quadros de 32×32): **uma pasta por golpe** — a leve (1) ou a pesada (6) — tocada em ordem a 24 quadros por segundo, e a instância se destrói quando a sequência acaba.
**Flash vermelho proporcional ao dano.** Quem leva o golpe pisca em vermelho: a Persocon (filtro no canvas do modelo), o Sucataoxidado (filtro no boneco) e o Unknown (pintura vermelha no sprite). A força do vermelho é `min(1, max(0.25, dano / 20))` — um arranhão acende 25%, um golpe pesado ou crítico acende 100% — e apaga em ~300 ms.
**Número de dano flutuante.** Todo dano mostra o número **vermelho** (`#ff2a2a`) com a borda pixelada escura, subindo e sumindo; o tamanho acompanha o golpe (13 px no dano 1, até 40 px, e o crítico cresce mais).
Detalhes em `ChangeLogs\v1.9.18.md`.

## v1.9.17 — 11/11/2026
**O cartucho preto misterioso.** Na aba *Cartuchos* da Shop apareceu um cartucho **todo preto, sem nome e de graça**. Ele só faz alguma coisa na **TV com console** (nos portáteis — GameBuddy, GameGlow e Playpocket 3000 — a tela fica preta e nada acontece).
**A erupção da TV.** Ao ser inserido na TV, o cartucho não abre jogo nenhum: a tela **chispa estática** (ruído branco), **fumaça escura** sobe da TV e **gosma preta pinga** no chão da frente dela. Do meio da tela sai o **Unknown**.
**O Unknown.** Um slime de glitch: as animações do *Angry slime* (Itch.io G.Lerf 2.0 Slime Pack) convertidas em **silhueta preta** com os **olhos vermelhos brilhando** e um **glitch periódico** (separação RGB + fatias horizontais tremidas). Ele **persegue a Persocon** pela área de trabalho até encostar — e aí o jogo trava em `COMBAT_MODE`.
**A luta (nível fácil).** O Unknown tem **20 de HP** e só dois golpes:

| golpe | dano | efeito |
|---|---|---|
| **Investida Viscosa** | 2–4 | investida de perto |
| **Pulso de Glitch** | 3–5 | 15% de chance de **Atordoado** (1 turno) |

**A vitória.** Com 0 de HP o Unknown toca a animação de morte e deixa **1× Cristal Negro** (ícone próprio, fundo branco removido) no Inventário, na categoria **Especiais**. O cartucho preto é **removido para sempre**: da lista de cartuchos, da Gaming Shelf e da Shop (`unknownDone` no save).
**As falas confusas.** Logo depois, a Persocon mostra o emoticon de "?"/gota de suor e comenta as quatro falas: *"O-o que foi aquilo?!..."*, *"Meus sensores não conseguiram identificar esse código..."*, *"Espera... cadê aquele cartucho preto?..."* e *"De onde será que veio essa criatura?..."*.
Detalhes em `ChangeLogs\v1.9.17.md`.

## v1.9.16 — 11/11/2026
**Perfil reorganizado.** As Informações Gerais ficaram enxutas: agora mostram **só** Nome, Idade, Afeição, Moedas e Carteira (o nível de combate, a Força, a Constituição, a Saúde máxima e o Pega-pega saíram de lá — o Pega-pega foi para Recordes e a Saúde máxima para Atributos).
**Atributos clicáveis.** Cada atributo abre uma caixinha com o que ele faz (Força, Constituição e os outros seis), com destaque na borda e fundo âmbar; **clicar no mesmo atributo de novo ou clicar fora** fecha a caixinha na hora. O texto fixo que ficava embaixo do quadro de atributos foi removido.
**Nova categoria "Combate"**, recolhível, logo **abaixo** de Atributos, dividida por arte marcial: **Combate Corpo a Corpo**, **Espadas**, **Arremesso** e **Syntoyo** — cada uma com os golpes que ela já sabe e o nível dela. As **Manobras Especiais** também foram para dentro do Combate.
**Regra da visibilidade.** No painel de Combate só aparece o que ela **já aprendeu**: uma arte que ela nunca treinou, um golpe de nível superior e uma manobra ainda bloqueada simplesmente **não existem** na tela (saiu o cadeado e o "bloqueado").
**Fúria mais forte.** O status Fúria agora acende uma **aura vermelha pulsante em volta do modelo** (gradiente radial + tremor de luz), que some quando ela solta a manobra ou a luta acaba, e toca o som **Hyper Flash** (do pack Ultimate 8bit SFX, MIT) no instante em que acende.
Detalhes em `ChangeLogs\v1.9.16.md`.

## v1.9.15 — 11/11/2026
**Contato obrigatório.** O arremesso saiu do jogo: ela **só golpeia de perto**. Se o golpe do Sucataoxidado a empurrar para longe, o turno dela começa com um **avanço** e o golpe só acontece quando ela chega no contato (distância de 0,85 × a largura dela). Nada de ficar socando o ar de longe.
**Remédios inteligentes.** Ela só gasta a vez com um remédio que **ajuda agora**: ou cura um status que ela tem de verdade (não gasta o remédio de cura só porque ele existe no inventário), ou cura a vida machucada. O **Kit de Primeiros Socorros** virou o cura grande do combate (45 de Saúde; o vermelho, 65).
**Status novo: Atordoado.** Golpe pesado ou crítico do inimigo deixa ela tonto por **1 a 3 turnos** (sorteado na hora): −45 pontos de precisão, aviso "Atordoada!" no cabeçalho e as estrelas girando em cima dela. Qualquer remédio que cure o atordoamento tira o efeito na hora.
**Status novo: Fúria.** Levar **3 golpes seguidos** (sem bloquear nem desviar) acende a Fúria: aura de fogo em cima dela e o aviso verde `[FÚRIA ATIVADA!]`. A Fúria é consumida na manobra.
**Manobras especiais (uma por nível de combate, só com a Fúria).**

| nível | manobra | o que faz |
|---|---|---|
| 1 | **Golpe Quebra-Guarda** | smash que ignora a defesa do alvo (1,5× a Força) |
| 2 | **Punho Relâmpago** | combo de 3 socos rápidos num turno só |
| 3 | **Chute Meteoro** | chute aéreo de 1,8× que pode atordoar o inimigo |
| 4 | **Contra-Impacto Sísmico** | uppercut de 2,2× com onda de choque que devolve energia |
| 5 | **Explosão Carmesim** | explosão carmesim de 3× (fogo + sangue, pixel art) |

**VFX BearFX.** As folhas de explosão do BearFX foram copiadas para `src/renderer/assets/vfx/` (`bearfx_fire.png` e `bearfx_blood.png`, 7 quadros por variante) e animadas no ponto do golpe (`fx.explosion()`).
**Perfil.** Novo painel **Manobras Especiais**, com o que cada nível de combate libera.
Detalhes em `ChangeLogs\v1.9.15.md`.

## v1.9.14 — 11/11/2026
**Ritmo de JRPG.** O combate por turnos ganhou pausas deliberadas entre as fases: anúncio do turno (0,55 s) → antecipação (a animação do golpe) → impacto (0,45 s) → resultado → recuperação (0,75 s) → próximo turno. Um turno inteiro leva uns 2,5 s, e o round completo (ela + o inimigo) uns 4 s.
**Texto de combate acima da cabeça.** Cada ação escreve um texto flutuante sobre a cabeça de quem age: **verde (#22c55e)** nas ações da Persocon (o nome do golpe, o item usado, o acerto, o nível novo) e **vermelho (#ef4444)** nas do inimigo (o golpe do Sucataoxidado, o dano nela, o bloqueio e o desvio).
**Remédios no combate.** No turno dela, se estiver machucada, ela gasta a vez tomando um **Medicamento** (ou um Power-Up) do inventário do jogador em vez de atacar — e o turno dela passa a ser o do item.
**Arremesso.** Se o alvo estiver longe (o golpe do Sucataoxidado a empurra para trás), ela **arremessa um objeto** nele; o dano do arremesso cresce com a **Força**.
**Atributos de núcleo.**
- **Força**: define o dano dos golpes (corpo a corpo e arremesso). Progressão lenta (nível 10 = ~2000 XP).
- **Constituição**: ganha XP **passivamente** a cada energia gasta (em combate, treino e qualquer ação) e reduz o custo de energia de todas as ações e golpes.
- **Saúde máxima**: `100 + (Constituição − 1) × 4 + (Força − 1) × 2` (calculada na hora).
- O **Treino Pesado** dá muito mais XP de combate e também XP de Força.
**VFX de impacto.** A folha `32x32 simple sfx-Sheet.png` foi copiada para `src/renderer/assets/vfx/` e os quadros de 32×32 são fatiados e animados (`image-rendering: pixelated`) exatamente no ponto e no frame do golpe: faísca (leve), corte + explosão (pesado), anel metálico (bloqueio), poeira e flakes de ferrugem (o boneco mecânico).
**Perfil em sanfona.** O Perfil virou seções recolhíveis (▼/▶): Informações Gerais (nome, idade, afeição, moedas, carteira + combate, força, constituição e saúde máxima), Favoritos, Cafunés/tapas, Jogos no GameBuddy, Cartuchos, Brinquedos comprados, Pedidos atendidos e Recordes. **Saíram** do Perfil: Itens consumidos, Mais consumidos e Gostos provados.
Detalhes em `ChangeLogs\v1.9.14.md`.

## v1.9.13 — 11/11/2026
**Energia por nível.** Cada golpe agora custa menos energia conforme o Nível de Combate: `custo = max(0,8; 3 × (1 − (nível − 1) × 0,06))` — no nível 1 são 3 de energia por golpe e no nível 10 menos de 1,4. Ela treina e luta muito mais tempo conforme domina o combate.
**Boneco Sucataoxidado.** O Boneco de Treino agora pode ser melhorado (¥ 1200) e vira um boneco de sucata: chapas de metal enferrujado, engrenagens expostas, parafusos, juntas mecânicas e um olho aceso.
**Treino Pesado** (só no boneco melhorado e **apenas pela mão do jogador** — ela nunca começa isso sozinha): uma luta de verdade, com `COMBAT_MODE` completo (borda vermelha pulsante, trilha de combate, trava de interação e de eventos). O Sucataoxidado é **um nível abaixo** dela (ou igual nos níveis 1 e 2), **ataca de volta** com dano real na Saúde dela (a Accuracy dele contra o bloqueio/desvio dela) e tem **barra de vida em cima dele**. Nunca é fatal: se a Saúde dela cair a 50% (ou ela perder 50% do HP), a luta para na hora; se o HP do boneco chegar a 0, ela ganha um bônus de XP; e no fim o Sucataoxidado volta a 100%.
**Efeitos de impacto** sincronizados com o frame do golpe: faísca nos golpes leves (jab, cross), corte + explosão nos pesados (uppercut, chute circular), brilho metálico e poeira no bloqueio, faíscas de ferrugem quando o boneco mecânico toma dano — tudo em pixel art, com tremor de tela proporcional à força do golpe.
Detalhes em `ChangeLogs\v1.9.13.md`.

## v1.9.12 — 11/11/2026
**Combate por turnos.** Treinar no Boneco de Treino virou uma luta de verdade: enquanto ela luta, o jogo entra em `COMBAT_MODE` — nada interrompe (sem carinho, sem arrastar, sem comandos manuais, sem pedidos de comida, sem anticinhas e sem o corvo atrapalhando).
Os turnos alternam (ela → adversário) e cada um rola a chance de acerto, de crítico e de bloqueio a partir do **Nível de Combate**: nível alto = mais acerto, mais crítico e defesa melhor. As animações de combate (antecipação, frame do golpe e recuperação) tocam em cada turno, com o feedback flutuante do resultado (💥 acertou, 🛡 bloqueou, 💨 errou).
**Golpes por nível** (só os desbloqueados podem ser usados): Nv 1 jab e guarda · Nv 3 cross · Nv 5 passo evasivo · Nv 7 uppercut · Nv 10 chute circular.
**Progressão mais lenta:** o nível 10 agora pede ~1950 XP (dezenas de sessões), contra ~666 antes.
**Armas fora do combate:** por enquanto espada, Syntoyo e bola de queimada não têm utilidade na luta — o treino é estritamente desarmado.
**Exaustão:** cada turno gasta energia e dá um pouco de XP; o treino continua sem interrupção até ela cansar (energia ≤ 15%), quando ela sai do treino.
**Borda vermelha e trilha de combate** ficam reservadas para as lutas de verdade — o treino no boneco é limpo (sem moldura na tela e sem trocar a música). **Dois cliques nela cancelam o combate**, caso ele trave.
Detalhes em `ChangeLogs\v1.9.12.md`.

## v1.9.11 — 11/11/2026
Oito animações de corpo a corpo geradas para o rig YSM/Bedrock da Persocon, prontas para o sistema de combate: `combat_idle` (postura de luta com respiração), `attack_jab` (jab com a esquerda, passo à frente), `attack_cross` (cross com a direita, giro de quadril e ombro), `attack_uppercut` (agachamento profundo e uppercut com salto), `attack_roundhouse_kick` (perna direita varrendo num arco horizontal), `combat_block` (braços cruzados na frente do rosto, cabeça abaixada), `combat_dodge_step` (salto lateral rápido, centro de gravidade baixo) e `combat_hit_stagger` (reação de empurrão, cabeça e tronco para trás).
Cada golpe tem antecipação, frame de impacto e recuperação, com interpolação Catmull-Rom. O mapa de metadados (`COMBAT_META`) traz duração, frame exato do golpe e a janela de combo (jab → cross → uppercut).
A Persocon toca as animações por nome (`playAnimation('attack_jab')`), encadeia a corrente (`chainAttack()`), dispara o evento `combatHit` no frame do golpe (dano, efeito e som) e volta sozinha para a postura de luta quando o golpe termina. Prévia em Opções → Debug → Combate.
Correção: as animações geradas pelo app agora mexem no tronco dos modelos YSM (osso `UpBody`), que antes era ignorado.
Detalhes em `ChangeLogs\v1.9.11.md`.

## v1.9.10 — 10/11/2026
As estantes mantêm o tamanho original (as mesmas dimensões de antes, ao lado da Persocon), mas o que está dentro delas mudou: os mangás aparecem de frente com a capa real, as miniaturas colecionáveis ocupam a altura da prateleira e os cartuchos mostram a arte do rótulo — tudo preencheando uns 85%–90% da linha, sem sobrepor.
Os três portáteis (GameBuddy, GameGlow e PlayPocket 3000) agora ficam **em cima do teto** da Gaming Shelf / Gaming Shelf Pro, um em cada lugar reservado (esquerda, centro, direita), encolhidos para caber os três lado a lado — as fileiras internas ficam só para cartuchos.
O corvo continua arrumando os portáteis deixados soltos na mesa: agora ele leva direto para o lugar reservado no teto da Gaming Shelf. E o mangá nas mãos da Persocon ficou menor, do tamanho dela.
Detalhes em `ChangeLogs\v1.9.10.md`.

## v1.9.9 — 10/11/2026
35 novos itens de comida e sobremesa com arte pixel-art 32×32 (copiada de `Assets\NEW\Ghostpixxells_pixelfood` para `src\renderer\assets\food32\` pelo script `scripts\copy-food32.ps1`): 24 comidas (hambúrguer, pizza, sushi, ramen, espaguete, macarrão com queijo, curry, burrito, taco, sanduíche, hot dog, panquecas, waffle, frango assado, bife, salmão, momo, omelete, batata frita, nachos, cheese puff, pão de alho, pipoca, chips) e 11 sobremesas (torta de maçã, torta de limão, bolo de frutas, donut, homem de gengibre, pudim, sorvete, biscoitos, chocolate, gelatina, ursinho de gummy).
Preços e efeitos conforme o tipo: prato principal enche a fome (¥14–32), lanche é barato (¥10–13) e sobremesa é cara, dá muita alegria e quase nenhuma fome (¥22–40).
Detalhes em `ChangeLogs\v1.9.9.md`.

## v1.9.8 — 10/11/2026
Correção do mouse que sumia no jogo em tela cheia: com outro app em tela cheia, o app não rouba mais o cursor nem o foco (e a janela do Streamer Mode já abre sem roubar o foco).
Novos "Setups da mesa" em Opções: salva a posição de todas as mobílias e objetos da área de trabalho e carrega depois — dá para ter vários setups diferentes.
Capas dos mangás regeradas sem a borda branca da foto (`scripts\make-manga-covers.ps1`); o livro nas mãos da Persocon e do Doll ficou um pouco menor e mais alto.
Bebidas rebalanceadas: Energéticos dão muita energia e matam menos a sede; chás e leites de soja só hidratam; refrigerantes ganharam nomes fictícios (Zap Cola, Solar Fizz, Ice Blue, Lime Rush).
Detalhes em `ChangeLogs\v1.9.8.md`.

## v1.9.7 — 09/11/2026
Consumíveis da loja com ícones pixel-art 16×16 curados (72 arquivos em assets/consumables), image-rendering: pixelated e scale(2). Persocon pede Sobremesas com frequência, somente se o jogador já as possui no inventário. Nova categoria Medicamentos com 19 itens (curam efeitos negativos ou dão bônus; todos custam Humor). Build sem tag BETA.
Detalhes em `ChangeLogs\v1.9.7.md`.

## v1.9.6 — 07/11/2026
BETA build: abas de loja condicionais (Cartuchos exige Console/TV+console; Mangás exige Estante). Consumáveis da loja: 37 itens (comidas, bebidas, sobremesas) da folha Food1_0.png com sprite CSS. Easter egg "Midnight": nome exato na carta concede 25.000 moedas, borda roxa piscando 3× e SFX de upgrade de mobília.
Detalhes em `ChangeLogs\v1.9.6.md`.

## v1.9.5 — 07/11/2026
BETA build: comida, bebida, medicina e power-ups removidos do jogo (catálogo, arte e efeitos).
Artes dos 14 cartuchos tiradas de `cartuchos3.png`; preços fixos por jogo (¥50 a ¥170); folha única de sprites na loja/inventário.
Cartucho comprado ou impresso vai para a Gaming Shelf quando ela existe; sem ela, para a bolsa — e a Persocon anda até o lugar certo (bug da bolsa antiga corrigido).
Catálogo visual em `Assets\cartuchos_jogos.png`. Detalhes em `ChangeLogs\v1.9.4.md`.

## v1.9.3 — 04/11/2026
BETA build: arte da comida trocada por pixel art da biblioteca de assets (27 ícones).
Log com merge de linhas iguais; menu da bandeja com "mostrar app"; status negativos mais longos; tabelas de assets/status em Assets.
Estante renomeada e nova Gaming Shelf para cartuchos (substitui a bolsa, guarda portáteis no topo, upgrade Pro e lista de conteúdo ao clicar).
Detalhes em `ChangeLogs\v1.9.3.md`.

## v1.9.2 — 04/11/2026
Log de moedas ganhas/perdidas com fonte; filtro de moedas e corvo; status fixo exibe carteira do persocon e ação atual.
Detalhes em `ChangeLogs\v1.9.2.md`.

## v1.9.1 — 04/11/2026
Atalho no balão de desejo (clique para atender/comprar) e recuperação pela bandeja do sistema (clique no ícone reabre dock e janela principal).
Wish balloon shortcut (click to fulfill/buy) and system tray recovery (tray click reopens dock and main window).
Detalhes em `ChangeLogs\v1.9.1.md`.

## v1.9 — 03/11/2026
Humor ligado à Afecção (drenagem natural para em 50, só maus-trato desce abaixo), sono ininterrupto com raiva ao ser acordada, teto de 3 pedidos, 10 status negativos com gatilhos e curas, chip de missões do dia e auditoria de idioma.
Mood tied to Affection (natural drain stops at 50, only mistreatment goes below), uninterrupted sleep with a furious wake-up, a 3-request cap, 10 negative statuses with triggers and cures, a daily missions chip and a language audit.
The in-app changelog is now bilingual (EN + PT) / O changelog do app agora é bilíngue (EN + PT).
Detalhes em `ChangeLogs\v1.9.md`.

## v1.8 — 20/10/2026
Streamer Mode sem crash; PowerUps com animações clássicas; hookshoot, venda de prêmios e promo powermeup.
Detalhes em `ChangeLogs\v1.8.md`.

## v1.7 — 17/10/2026
Syntoyo/espada/boneco; fila; neon/CRT/HD nos portáteis; fantasma do GameBuddy corrigido.
Detalhes em `ChangeLogs\v1.7.md`.

## v1.6 — 17/10/2026
Arcade/CRT; portáteis LCD + proporção 80×72; Assistir/jogar; corvo Guardar; treino ≥50%; status; Streamer chroma; 5 danças; promo letmesmash.
Detalhes em `ChangeLogs\v1.6.md`.

## v1.5 — 16/10/2026
Bolsa dela / "Dar a ela" pausada; Corvo pega da impressora para o Inventário; volumes do corvo isolados + asas.
Detalhes em `ChangeLogs\v1.5.md`.

## v1.4 — 15/10/2026
Bolsa dela com comidas e brinquedos portáteis, combate mais próximo no boneco, caixas em fila, várias bolas no desktop, queimada com arremesso, e correções.
Detalhes em `ChangeLogs\v1.4.md`.

## v1.3 — 15/10/2026
Boneco de treino (mobília), combate/kendô, inventário na bolsa, minijogos sem cobrir o desktop, ajustes de energia e console de logs no modo debug.
Detalhes em `ChangeLogs\v1.3.md`.

## v1.2 — 15/10/2026
Inventário dela, Syntoyo, boneco de treino, skills de armas, jokenpô synthwave e ajustes de brinquedos.
Detalhes em `ChangeLogs\v1.2.md`.

## v1.1 — 15/10/2026
Aproximação na tela (lembretes/alarmes), minijogos com bônus e nível, synthwave no Siga o ritmo e no teclado, e várias correções.
Detalhes em `ChangeLogs\v1.1.md`.

## v1.0 — 14/10/2026 (First Release)
Primeira versão oficial. A partir daqui as versões sobem de 0.1 em 0.1.
Detalhes em `ChangeLogs\v1.0.md`.
- Importar modelo 3D na mobília aceita .gltf com o .bin e a textura ao lado.
- O Sintetizador Neon importa só MIDI, de um arquivo local ou de um link.
- Modelo padrão novo em estilo anime (Ninna: cabelo prateado com twintails com física, vestido branco, rosto anime, olhos que piscam, animações mais suaves).
- Nova Persocon Aghata (cabelo e vestido pretos, detalhes roxos, expressão neutra); escolha entre Ninna e Aghata no início.
- Compras voam da Impressora 3D para o Inventário.
- Assistir/Jam: ela pausa para cuidar de status muito baixo e depois volta.
- Ligar/desligar animações em Modelo; tutorial refeito.
- Minijogos e figuras do gacha com identidade própria; importação de resourcepack removida.
- Novo `npm run demo`: gera a Demo (loja, brinquedos e minijogos reduzidos).

## v1.2.0 — 13/10/2026 (Early Access)
Detalhes em `ChangeLogs\v1.2.0.md`.

## v1.1.9 — 13/10/2026 (Early Access)
Detalhes em `ChangeLogs\v1.1.9.md`.

## v1.1.8 — 13/10/2026 (Early Access)
Detalhes em `ChangeLogs\v1.1.8.md`.

## v1.1.7 — 13/10/2026 (Early Access)
Detalhes em `ChangeLogs\v1.1.7.md`.

## v1.1.6 — 13/10/2026 (Early Access)
Detalhes em `ChangeLogs\v1.1.6.md`.

## v1.1.5 — 13/10/2026 (Early Access)
Detalhes em `ChangeLogs\v1.1.5.md`.

## v1.1.4 — 13/10/2026 (Early Access)
Detalhes em `ChangeLogs\v1.1.4.md`.

## v1.1.3 — 13/10/2026 (Early Access)
Detalhes em `ChangeLogs\v1.1.3.md`.
- Emojis do Windows trocados por pixel art em todo o jogo (fonte PxEmoji: rostos do pacote Pixel Art Emojis, o resto em pixel 24x24).
- Fala com só um emoji aparece sem balão; setas do ritmo e "!"/"?" soltos viraram ícones pixel.

## v1.1.2 — 13/10/2026 (Early Access)
Detalhes em `ChangeLogs\v1.1.2.md`.
- Corvo: habilidades Vigiar, Brilhos, Sorte, Truques e Imitar; brinca com o Doll; pousa nos móveis; 11 conquistas.
- Ícone de pássaro preto; o Corvo não treme mais na cabeça da Persocon.

## v1.1.1 — 13/10/2026 (Early Access)
Detalhes em `ChangeLogs\v1.1.1.md`.
- Corvo: volume e frequência da fala, sons mais altos, sem borda clara, cliques não o espantam.
- A Persocon volta a buscar as impressões quando o Corvo não pode ir.

## v1.1.0 — 12/10/2026 (Early Access)
Detalhes em `ChangeLogs\v1.1.0.md`.
- Novo nome **My Persocon**; pague quanto quiser; português e inglês.
- Tela de título synthwave com música original e menu Continuar / Novo jogo / Opções / Tutorial / Créditos.
- Primeira execução: caixa, carta de seleção assinada por -HaZ, assinatura do jogador, nome e sexo do Persocon, abertura da caixa e boot.
- Modelo padrão original (humanoide robótico) com todas as animações, incluindo desligado e boot.
- Sexo M/F/???: pronomes, concordâncias e timbre da voz.
- Save em `%APPDATA%` com 3 backups e exportar/importar; bandeja + Iniciar com o Windows; relatório de erro; dicas contextuais; validação de nomes.
- Marcas registradas removidas ou renomeadas.

## v1.0.0 — 12/10/2026
Nova numeração (sucede a v1.21.1). Detalhes em `ChangeLogs\v1.0.0.md`.

## v1.21.1 — 12/10/2026
- Correção - Persocon "travada": com fome e com o Gancho, ela puxava a comida e ao mesmo tempo tentava andar até um ponto inexistente; a posição virava inválida e ela ficava parada tremendo (cai/aterrissa sem parar), sem comer nem dormir até os status zerarem.
- Proteção extra: se a posição dela ficar inválida por qualquer motivo, ela volta ao chão e segue a rotina.

## v1.21.0 — 12/10/2026
- **11 brinquedos novos (Shop → Fun / Mobília).** Nenhum dá moedas; o progresso fica salvo no perfil (não some ao recomprar).
- **Ioiô (🪙 60).** Truques que melhoram com o uso (nível 1–10 pelo total de truques); às vezes erra e o ioiô enrola.
- **Bambolê (🪙 70).** Gira mais tempo quanto mais Energia; guarda o recorde (Perfil).
- **Pipa (🪙 110).** Solta pipa perto da borda da tela ou de uma janela; a linha pode enroscar num ícone do desktop (só visual) e ela puxa até soltar.
- **Cubo mágico (🪙 90).** Ela resolve sozinha, mais rápido com mais Afeição; guarda o recorde.
- **Skate (🪙 220).** Anda no chão, dá ollies e "grinda" no topo das janelas; às vezes cai, perde um pouco de Humor/Saúde e fica com um curativo por 8 min.
- **Aquário (Mobília, 🪙 420).** Ela alimenta os peixes e limpa o vidro; sem comida por mais de 6 h a água fica turva (conta o tempo com o app fechado) e ela fica triste. Clique para pedir que ela alimente.
- **Teclado musical (Mobília, 🪙 350).** Ela canta melodias 8-bit com a própria voz; clique nas teclas para tocar também.
- **Pula-pula (Mobília, 🪙 380).** Pulos altos e piruetas; às vezes alcança o topo de uma janela e fica lá em cima.
- **Câmera instantânea (🪙 300).** Ela tira fotos da cena (montadas com o overlay, não é print real) que vão para o **Álbum** no Perfil (até 12; a mais antiga sai). Clique para ampliar, ✕ para apagar.
- **Robô de corda (🪙 140).** Ela dá corda, ele anda pela tela e ela persegue; esbarra no Doll.
- **Tamagotchi (🪙 160).** Bichinho virtual com fome e humor próprios; ela alimenta e brinca com ele e reclama quando ele precisa.

## v1.20.0 — 12/10/2026
- **Gostos em 5 níveis.** Favorita (~10%), gosta (~20%), neutra (~45%, a mais comum), não gosta (~17%) e odeia (~8%). Itens grátis (Sobras, Água de Torneira) tendem a "não gosta"/"odeia". O Humor ao comer é proporcional (+10, +4, 0, −4, −8) e aparece flutuando. Saves antigos são rebalanceados uma vez. O Perfil lista os gostos por nível.
- **Correção: "ela não gosta de nada".** Ela se alimentava sozinha com o item de maior efeito da bolsa (geralmente Sobras/Água de Torneira, que ela odeia) e pedia itens aleatórios, incluindo os odiados. Agora prefere o que gosta e não pede itens grátis nem odiados.
- **Vending Machines japonesas (Mobília).** Vending Machine de Comida (🪙 2200) e de Bebida (🪙 1600). Com fome/sede, ela vai até a máquina e compra com a carteira dela (preço +20%) uma comida/bebida que gosta e consome na hora. Animações: moeda ou cartão, escolha (às vezes indecisa), queda do produto, máquina travada que ela chuta, roleta da sorte (7777 dá um item extra). Sem dinheiro, ela fica decepcionada. Botão direito → "Pedir para ela comprar". A Carteira mostra compras e gastos.
- **Máquinas com várias animações e sons novos.** Gacha (clássica, turbo, chute, drama, giro), Slot (alavanca, botão, turbo, sorte, câmera lenta) e Videogame/TV (calma, empolgada, concentrada, raiva, ritmo, às vezes soprando o cartucho). Ela alterna sozinha, ou escolha no botão direito → Animação. ~30 efeitos sonoros sintetizados novos.
- **Doll.** 14 animações novas (sentar, pensar, olhar em volta, continência, palmas, guitarra no ar, robô, alongar, ioga, giro, reverência, susto, desmaio, tremer) e reações ao que a Persocon faz (palmas nas máquinas, senta junto enquanto ela come, abraço com Humor baixo).
- **Estante de mangás.** Os bonecos colecionáveis aparecem em pixel art fiel a cada item; mangás como lombadas.
- **Suor.** Bem menos frequente: só em esforço intenso, a cada 2,5–4,5 s (antes 0,2–0,9 s em qualquer esforço moderado).

## v1.19.0 — 12/10/2026
Nove interações autônomas novas (módulo `interact.js`). Todas têm chance e intervalo próprios e não acontecem com ela ocupada, dormindo, morta, em minijogo ou com um menu aberto.
- **Pedir atenção.** Depois de 20–35 min sem você mexer nela (com você no PC), ela vem para a frente e bate na "tela": ondas no vidro, uma rachadura leve e a tela tremendo. Entre as batidas ela acena. Se você clicar nela, ela comemora e ganha Afeição; se ninguém clicar em 25 s, ela desiste chateada. Intervalo mínimo de 30 min.
- **Roubar o cursor.** Com o mouse parado perto dela, de vez em quando ela corre até o ponteiro, agarra e corre 1–3 s com ele. Ela move o cursor do Windows de verdade (comando `set_cursor`). Puxar o mouse com força solta o cursor. Ela não rouba enquanto você digita ou segura um botão (comando `input_state`). Intervalo mínimo de 30 min.
- **Lembretes de pausa.** A cada 1–2 h de uso contínuo, ela sugere beber água (bebe junto) ou alongar (faz o alongamento contando). Uma pausa real de uns 8 min zera a contagem. Funciona também no Modo foco.
- **Presentes.** Com Afeição ≥ 250, ela "acha" uma **Caixa Comum** no chão e entrega a você, até 2 por dia e com pelo menos 4 h entre elas. Nunca dá moedas.
- **Sentar nas janelas.** Ela sobe na barra de título da janela ativa (de gancho, escalando a lateral ou pelo papel de parede) e senta balançando. Se a janela for arrastada ou minimizada, ela cai. A janela ativa vem do Rust (`active` em cada janela do mundo).
- **Som do PC.** De tempos em tempos ela escuta o som por 4 s (mesma captura do Jam): dança se houver música e tapa os ouvidos se estiver alto.
- **Chutar e empilhar ícones.** Cópias de 1 a 3 ícones da área de trabalho voam até ela e formam uma torre. Ela recua, corre e chuta; as cópias quicam e voltam para o lugar. Os ícones reais não mudam.
- **Lixeira.** Ela vai até a Lixeira e joga algo dentro (🎯) ou mergulha nela e sai pulando. É só animação: a Lixeira de verdade nunca é tocada.
- **Empurrar um ícone e rir.** Ela empurra (ou puxa, perto da borda) um ícone real alguns pixels, olha para você e ri. Uns 5 s depois ele volta à posição original. Se a área de trabalho não deixar mover (organização automática), ela move uma cópia.
- **Opções › Interações com o desktop/cursor.** Liga/desliga para roubar o cursor, brincar com os ícones, sentar nas janelas, reagir ao som, pedir atenção e lembretes de pausa. O Modo foco e o Streamer Mode desligam as interações com o desktop/cursor. No debug, "Testar novidades" tem um botão para cada interação.
- **Rust.** Comandos novos `desktop_all` (todos os ícones, com a Lixeira marcada), `move_icon`/`place_icon` (LVM_SETITEMPOSITION32, sempre com volta), `set_cursor` e `input_state`.
- **Correção — Acessórios (aba Modelo):** a lista mostra só partes que existem (sem ossos vazios ou que escondiam o corpo todo), skins Minecraft podem esconder a 2ª camada (Hat/Jacket/Sleeves/Pants) e há o botão "Mostrar tudo".

## v1.18.0 — 12/10/2026
- **Carteira dela.** Em Ações › 👛 Carteira dela, você pode dar 10, 50 ou 100 🪙 para a Persocon. Cada presente dá Humor e Afeição, mas o efeito diminui se você der muito em 30 minutos. Ela usa essas moedas nas máquinas.
- **Gacha-Machine** (600 🪙). Ela gira a manivela, a cúpula brilha e treme nos prêmios raros, e uma cápsula da cor da raridade cai e quica até os pés dela. Ela pega a cápsula, sacode e abre.
  - Se você clicar na máquina, você paga 30 🪙. Quando ela joga sozinha, paga com a carteira dela.
  - Prêmios: moedas, comidas e bebidas, ou bonecos colecionáveis de videogame e anime.
  - Reação por raridade:
    - Comum: ela fica triste e perde Humor.
    - Incomum: ela fica feliz e ganha Humor.
    - Raro: ganha mais Humor, com fanfarra, flash e confete.
    - Épico: ganha ainda mais Humor e Afeição, com fogos de artifício.
- **Slot-Machine** (800 🪙). Ela aposta as moedas da **carteira dela** (5, 10 ou 25 por giro) em sessões de alguns giros.
  - Os rolos param um de cada vez. Quando os dois primeiros combinam, o terceiro demora mais para parar.
  - Pagamentos: dois 🍒 pagam ×2, e três iguais pagam de ×5 a ×100 (777 é o jackpot).
  - Animações por tamanho do prêmio: chuva de moedas na bandeja, luzes piscando, flash, confete, fogos e "JACKPOT!". Perder várias vezes seguidas a deixa chateada.
- **As moedas que as máquinas pagam vão para a sua carteira** (pedido do usuário): moedas da Gacha, bonecos repetidos convertidos em moedas e os ganhos da Slot.
- **Sorte pela Afeição.** Quanto maior a Afeição, melhores as chances na Gacha, na Slot e nas caixas de prêmio.
- **16 bonecos colecionáveis**, 4 de cada raridade. Eles ficam na Estante de mangás (cada boneco ocupa 2 espaços) e às vezes a Persocon brinca com eles. A coleção aparece no Perfil, na aba 🧸 Coleção.
- **Várias estantes**: agora é possível comprar mais de uma Estante de mangás.
- Novas conquistas: Mesada, Gacha ×10, Épico, 8 bonecos, coleção completa, Trinca e Jackpot. Novas missões diárias para a Carteira, a Gacha e a Slot.
- O balão de fala agora digita com a voz da Persocon (mesmo timbre, tom e volume das reações, sílabas estilo Animal Crossing).
- A Persocon não consome Sobras nem Água de Torneira sozinha enquanto assiste ou joga.

## v1.17.1 — 11/10/2026
- Fora do Editar mobília, o **clique esquerdo atravessa os móveis**: vai para a Persocon se ela estiver no ponto, senão para o desktop. A janela solta o mouse e reenvia o clique, então os ícones atrás dos móveis funcionam, inclusive com clique duplo. Alvo, banheira e móveis quebrados continuam clicáveis, e o botão direito continua abrindo as opções do móvel.
- O clique direito em cima da Persocon abre o menu dela mesmo quando há um móvel na frente.
- **Correção: Persocon parada sem fazer nada.** Agora há uma rede de segurança: se ela ficar 2 s presa num estado sem dono (antic, brinquedo, comida, gancho, minijogo encerrado, idle infinito ou timer inválido), escolhe outra coisa para fazer. Um erro no loop de frames também deixou de congelar tudo: o erro vai para o `pet.log` (com `debug` ligado) e ela recomeça.
- A Afeição sobe na metade da velocidade. A Afeição também acelera as moedas por minuto em ×(1 + Afeição/500), até ×3; o multiplicador aparece no Perfil.

## v1.17.0 — 11/10/2026
- **Caixas de prêmio** (Comum, Rara e Lendária) ficam no inventário, na aba 🎁 Prêmios. Ao clicar em "Abrir", a Persocon sacode a caixa até ela estourar e aparece uma roleta estilo CS2 com prêmios comuns, incomuns, raros e lendários. A revelação tem raios e confete, e os prêmios lendários ainda trazem fogos e fanfarra.
- Os prêmios podem ser moedas, consumíveis da loja ou **19 itens de uso único que não estão à venda**: biscoito da sorte, lança-confete, ímã de moedas, cristal de afeição, cartucho misterioso, relógio parado, pena de fênix, estrela cadente (as próximas caixas vêm com mais sorte), coroa, elixir arco-íris, fogos de artifício e outros.
- **27 conquistas** que dão caixas, cada uma com banner dourado, flash, confete e comemoração da Persocon e da Doll.
- **Missões diárias**: 3 por dia, cada uma vale uma Caixa Comum, e completar todas dá uma Caixa Rara extra. Ficam em Perfil → Missões e Conquistas.
- Os **minijogos** agora são desbloqueados pela Afeição; os bloqueados aparecem como 🔒 ??? e há um aviso quando um novo é liberado.
- **Editar mobília**: os móveis podem ser colocados livremente pela tela, inclusive um pouco abaixo da barra de tarefas. A Persocon não usa móveis que estão no alto, e a impressora continua no chão.

## v1.16.0 — 11/10/2026

- **Impressora 3D** (mobília fixa, vem em todo jogo novo e é adicionada aos saves antigos; não vai para o inventário nem para a Shop): toda compra entra numa fila e é impressa uma por vez, com tempo aleatório (5–15 s, um pouco mais para quantidades maiores). A peça sobe em camadas sob o cabeçote, a telinha mostra o progresso e um selo mostra quantas compras faltam. Botão direito mostra a fila.
- Quando um item fica pronto ela **larga o que está fazendo** (brinquedo, truque, bola, Jam/Assistir, até acorda) e vai **correndo** (andando se estiver sem energia) pegar, depois leva para o lugar (mochila, bolsa de cartuchos, estante ou inventário). A impressora só começa o próximo item depois que o atual é pego. Clicar no item pronto guarda na hora.
- **Gasto por atividade** (`effort()` em `behavior.js`): Energia, Fome, Sede e Higiene caem conforme o esforço. Dormir recupera; sentar, ler, jogar videogame ou ser carregada gastam pouco; andar um pouco mais; correr, escalar, pendurar no gancho, pular, dançar, esportes e truques puxados (agachamento, boxe) gastam bem mais. O cansaço (ofegar) também vem do esforço.
- Moedas continuam vindo só com o tempo (por minuto e bônus diário).

## v1.15.0 — 11/10/2026

- **Pixel art 16-bit (SNES)**: novo acabamento para todos os ícones gerados (`detail16` em `pixel.js`): volume pela silhueta em rampa de 5 tons (luz quente, sombra roxa/fria), pontilhado só na transição, brilho nas formas grandes, contorno interno onde uma cor escura encontra uma clara e contorno seletivo. O acabamento antigo continua em Opções › Gráficos › "Clássico" (troca ao vivo) e os arquivos antigos estão em `backup-cursor/graficos-classicos/`.
- **Tamanho do menu**: Opções › Menu com sliders de largura (300–640 px) e altura (40–95% da tela).
- **Modo foco** (Quick Menu): fala 5x menos, emoticons mais raros, anda pouco (mais sentada/parada), não corre, não escala janelas, não pede coisas, sem gancho/microfone/Doll por conta própria, sem Jam/Assistir automáticos, sem achar jogos nem reagir ao desktop, sem passos e barriga roncando.
- **Fix**: depois de provar um consumível pela primeira vez, a Shop e o Inventário não mostravam o gosto novo (o `taste()` não avisava a interface).

## v1.14.0 — 11/10/2026

- **Menu compacto**: o menu do botão direito ocupa ~56% da altura da tela (cabeçalho, barras e abas menores; só o painel rola).
- **Piscar ao comprar/usar**: a linha do item (ou a aba da categoria, se a linha sumiu) pisca na cor de destaque.
- **Status fixo**: botão direito abre "Sempre na frente", "Clicar através", "Mudar a posição" (arrastar; posição livre salva) e "Fechar".
- **Tela dos portáteis**: arrastada, guarda a posição em relação à Persocon (e se fica atrás dela) e acompanha ela.
- **Achar jogos**: ela fica curiosa (❓/❗), vai até o ícone (andando, pulando, escalando ou com o gancho), pega uma cópia e mostra para o player antes de recomendar.
- **Reações ao desktop** (`watch.js`): janelas abrindo, maximizando, fechando ou sendo arrastadas, muitas janelas, desktop vazio, player ausente/voltando, mouse rápido ou parado perto dela. Falas novas e ações da Persocon e da Doll; desligável em Opções.

## v1.13.0 — 11/10/2026

- **Jogos na área de trabalho**: de vez em quando a Persocon lê os ícones visíveis do desktop (atalhos da Steam, Epic, GOG, Riot, Battle.net, Roblox, pastas de jogos…), vai até um deles (andando, pulando ou escalando o papel de parede) ou puxa uma cópia do ícone com o gancho, e recomenda jogar: um balão ao lado do ícone com "▶ Jogar" (abre o jogo) e "Depois". Pode ser desligado em Opções › Comportamento. Não acontece com os ícones ocultos, cobertos por janelas ou no Streamer Mode.
- **Removidos**: ela não vem mais até a tela (nem bate nela) e não chama mais para jogar o Game Boy; as opções correspondentes saíram. A aba "Controle" do menu também saiu.
- **Preços**: comidas, bebidas e remédios custam pelo que dão (Saúde e Energia valem mais; efeitos ruins baixam o preço; remédio age na hora e custa o dobro por ponto).
- **Gostos**: na primeira vez que prova uma comida/bebida/remédio ela pode amar (vira favorita, +10 Humor toda vez), achar normal ou detestar (−8 Humor toda vez). Shop, Inventário e a escolha de comida mostram ♥ favorita, 👎 não gostou, ✓ provou ou ? nunca provou. Sobras e Água de Torneira ela sempre detesta.
- **Caixa de papelão**: ao levar uma compra para guardar, ela carrega uma caixa de papelão genérica.
- **Quick Menu**: nova opção "Clicar através" (os cliques passam pela Persocon, objetos e mobília). Para desligar sem clicar nela: ícone da bandeja › "Clicar através".
- **Videogame na TV**: Persocon e Doll ficam de costas olhando a TV, sem controles aparecendo nas costas, e a tela do jogo fica atrás deles.

## v1.12.0 — 11/10/2026

- **Incentivos funcionando**: cada cafuné era tão pequeno que era apagado na hora; agora acumula, aparece no Perfil (em % real) e mostra "👍 Andando +12%" sobre a Persocon (👎 no tapa).
- **Doll no videogame**: ele só entra como 2º jogador no console de TV (mobília); nos portáteis ela joga sozinha, então a tela de 2 jogadores só aparece na TV.
- **Animações geradas para modelos YSM**: os clipes que faltam no modelo (aceno, dança, triste, bravo, comemorar, rir, medo, cantar, chutar, arremessar, pegar, golpe, e os básicos se faltarem) são gerados com os ossos do modelo, usando antebraços e canelas quando existem. Só preenchem papéis que o modelo não tem.
- **Debug → Animações do modelo**: lista todas (✨ = gerada), ▶ mostra na Persocon e cada uma pode ser ligada/desligada (por modelo).
- **Moedas** só pelo tempo (1–3/min) e pelo bônus diário (agora 100). Minijogos, dardos, pega-pega, pedidos e aposta não dão mais moedas.
- **Shop**: Sobras (comida) e Água de Torneira (bebida) de graça: matam a fome/sede, mas tiram muito humor.
- **Idioma**: com a Persocon em English, os textos do app também ficam em inglês (menus, shop, itens, minijogos, avisos); voltam ao português ao trocar.
- **Bolas**: o mouse não empurra mais a bola; só clicar, arrastar e soltar para arremessar.
- **Brincadeiras com o Doll**: no pega-pega, quem vira pegador espera ~1,8 s enquanto o outro foge e um novo toque só vale depois de 3 s (acabou o empurra-empurra); no bate-bola o intervalo entre chutes subiu.
- **Doll com cotovelos e joelhos**: cada braço/perna virou dois segmentos (mesma skin, compatível); todas as poses foram refeitas (andar/correr com joelho dobrando, aceno só do antebraço, abraço envolvendo, soco, chute, dormir encolhido…).

## v1.11.0 — 11/10/2026

- **Editar uma mobília**: duplo clique num móvel abre "Editar esta mobília" (entra no modo de edição já com ele selecionado); também no menu do botão direito. Clicar na banheira manda a Persocon tomar banho.
- **Streamer Mode**: o OBS continua capturando mesmo com a janela atrás de outros apps; ao ligar/desligar o modo, a janela é recriada, então a borda amarela da captura não fica mais no app.
- **Coleta rápida**: com 3+ pacotes (ou 4+ itens) no chão, ela corre até eles, abre rapidinho e guarda direto o que vai para o inventário, até acabar.
- **Economia**: fim do dinheiro infinito. Começa com 500; ganha 1 moeda/min (+1 se feliz, +1 se bem cuidada), bônus diário de 50, pega-pega 20, pedidos 15; repetir o mesmo minijogo em menos de 5 min paga metade; dardos no máximo 25. No modo debug: botões +100/+1000/+5000 moedas.
- **Novos padrões**: emoticons 0,50× (X −28 px, Y 12 px) e só GIFs; volume 30%, Game Boy 25%, passos desligados. Aplicados uma vez nas configurações existentes; botão "Restaurar padrões" em Opções.
- Importar modelo: só pasta exportada ou .zip (arquivos .ysm removidos).

## v1.10.0 — 11/10/2026

- **Quick Menu**: duplo clique na Persocon abre um menu rápido (por enquanto só "Streamer Mode"). Fecha com Esc ou clicando fora.
- **Streamer Mode**: o app sai do overlay da tela inteira e vira uma janela normal (1280×720, redimensionável, na barra de tarefas) com fundo transparente — ou verde/azul/magenta para Chroma Key — para capturar no OBS (Captura de janela, "Persocon - Streamer Mode"). A Persocon vive dentro da janela, que é o "chão" dela. Continua funcionando minimizada (status, comportamento e minijogos seguem rodando). Liga/desliga pelo Quick Menu, Opções → Streamer Mode ou o ícone da bandeja; fechar a janela só sai do modo.
- Ícone do app com a arte maior (recorte mais justo da logo).

## v1.9.0 — 11/10/2026

- Novo status **Higiene** (barra no menu e no status fixo): cai devagar com o tempo e mais rápido com esforço físico. Abaixo de 30 saem ondinhas de mau cheiro; abaixo de 15 uma mosca fica voando em volta da cabeça; suja demais, o humor cai e ela reclama.
- **Dar banho** (Ações): espuma e bolhas pelo corpo todo, ela se mexe com as cócegas e sai cheirosa.
- **Banheira** (Shop → Mobília): ela toma banho de espuma sozinha quando está suja (ou ao clicar), sentada dentro da banheira.
- Cansaço visível: gotas de suor depois de esforço (ou quando exausta), ofegar curvada depois de correr/brincar muito, bocejos quando com sono, e anda/corre mais devagar com pouca energia.
- Com muita sede, fome ou sem energia ela recusa brincadeiras pesadas (bola, espada, pega-pega, minijogos, Pega-pega/Corrida/Bate-bola com o Doll) e pede água/comida/descanso.
- Modo debug: botões Exausta, Suada, Suja, Imunda e Dar banho; mostra Higiene e Esforço.

## v1.8.0 — 11/10/2026

- Atividades físicas cansam: brincar de bola e espada, pega-pega com o mouse, Pega-pega/Corrida/Bate-bola com o Doll, dançar no Jam, correr, escalar e as rotinas mais puxadas (pulinhos, agachamentos, lutar com a sombra, borboleta...) gastam energia, fome e sede. Com fome ou sede abaixo de 30 ela evita as rotinas pesadas.
- Novo ícone do jogo (a logo da pasta Assets) no executável, na janela e na bandeja.
- Modo debug (Opções): seção "Testar novidades" (status cheios/cansada, disparar cada rotina, dar o Crystal, animação do Doll acordando, truque e minijogos em dupla) e um changelog resumido.

## v1.7.0 — 11/10/2026

- 15 rotinas autônomas novas da Persocon, animadas por cima de qualquer modelo (achatar/esticar, pulinhos, inclinações, giros): espreguiçar, pulinhos de alegria, rodopio, olhar em volta, tropeçar e levantar, cochilar em pé (e acordar no susto), espirrar, se equilibrar, agachamentos, acenar para o cursor, cantarolar, bater o pé com fome, sentar olhando a área de trabalho, lutar com a sombra e perseguir uma borboleta. Elas aparecem conforme humor, energia, saúde e fome, sem repetir a mesma em seguida.
- Doll vivo: faz estrelinha, mortal e plantar bananeira, e imita a Persocon (pula, dança, polichinelo, soquinhos, acena) quando ela faz uma rotina perto dele.

## v1.6.1 — 11/10/2026

- Bolas: o gráfico agora gira certo — a arte ficou centralizada (antes balançava fora do eixo) e a luz/sombra não gira mais junto com a bola.
- Mangás: enquanto ela (ou o Doll) lê, o jogador vê o lado de fora do mangá aberto (capa, lombada e contracapa).
- Doll ganhando vida (Crystal Mágico ou "Acordar o Doll"): brilha juntando faíscas, flutua de braços abertos, explode em luz, pousa e se espreguiça; a Persocon comenta.
- Importar modelo: lista "Modelos recentes" (os últimos usados/importados primeiro, depois os outros instalados) — clique para trocar de volta.

## v1.6.0 — 11/10/2026

- Shop: nova categoria **💎 Specials**, com itens raros e caros: Crystal Mágico, Trevo da Sorte (+50% moedas), Elixir Dourado (enche todos os status + escudo 30 min), Ampulheta Encantada (3 power-ups por 30 min) e Estrela dos Desejos (+afeição e humor).
- **Crystal Mágico**: dá vida ao Doll. Ele passeia pela área de trabalho, investiga objetos e móveis (com balõezinhos), cochila na cama/almofada, acena, pula e reage a cliques (clicar muito deixa ele tonto). Botão direito no Doll: fazer dormir / acordar.
- Doll + Persocon: entra como player 2 nos consoles e na TV ("VS Doll"), lê mangás sozinho (perto da estante) ou junto com ela, chuta a bola para ela, dança com ela no Jam e dorme ao lado dela.
- Minijogos em dupla (Brincar → Persocon & Doll, e às vezes sozinhos): Abraço, Pega-pega, Corrida com aposta (+30 moedas), Esconde-esconde e Bate-bola.
- Mais interações com o Doll mesmo sem o cristal: clicar faz ele pular, a Persocon vai abraçá-lo por conta própria.
- Física das bolas: sem atravessar janelas em alta velocidade, resistência do ar e atrito de rolagem por tipo de bola, giro real (desliza e depois rola), quica nas bordas perdendo giro e derruba o Doll ao acertá-lo.
- Microfone um pouco maior na mão dela.

## v1.5.0 — 11/10/2026

- Pixel art mais detalhada em todos os gráficos gerados pelo app (itens, móveis, consoles, cartuchos, mangás, bolas): resolução dobrada com diagonais suavizadas, brilho e sombra nas bordas, volume e contorno fino colorido. Os balões de emoticon continuam no estilo do pacote de GIFs.
- Game Gear e PSP: enquanto ela joga, aparece a traseira do console (como já era no Game Boy).
- Mangás: enquanto ela lê, o mangá aparece aberto, com quadrinhos nas páginas.
- Móveis só podem ser movidos no "Editar mobília" (clique e botão direito continuam funcionando; tentar arrastar mostra a dica).
- Muito mais falas: novas variações para quase todas as situações, reações ao comer, ser pega e arremessada, ler mangá (por gênero), fim do pega-pega, e falas conforme a hora do dia.

## v1.4.0 — 11/10/2026

- **10 minijogos** em Brincar: Esconde-esconde, Batata quente, Siga o ritmo, Pescaria, Adivinhe o copo, Estátua, Desenho, Bolhas de sabão, Pedra-papel-tesoura (com placar geral) e Caça ao tesouro. Cada um abre com um guia curto e a opção "Não mostrar novamente" (dá para reativar os guias em Brincar). Dão moedas, humor e afeição; o recorde aparece no botão.
- Itens de festa: cor e intensidade ficam salvas por tipo de item e valem também para cópias novas e depois de guardar e recolocar.
- Itens de festa mais leves: efeitos desenhados a no máximo 30 quadros por segundo, lasers sem desfoque caro, fumaça pré-desenhada, limite de partículas e sem mistura de cores na janela inteira.
- Removido do Perfil: "O que a Persocon sabe sobre você".

## v1.3.0 — 11/10/2026

- Botões 📌 (manter o menu aberto) e ⬆ (sempre no topo) mostram ON/OFF e ficam destacados quando ligados. Corrigido: o clique neles era engolido pelo arraste do cabeçalho.
- Ações como Cafuné ou Colocar para dormir não fecham mais o menu quando 📌 está ligado.
- Microfone um pouco maior; consoles portáteis (Game Boy, Game Gear, PSP) seguros mais embaixo.
- Shop e inventário mantêm a posição da barra de rolagem depois de comprar ou usar algo.
- O menu do botão direito dos móveis fecha ao clicar fora dele.
- Volume: reaplicado quando o áudio do sistema é retomado.
- Globo de luz, holofote, lasers, máquina de fumaça e lança-confete: podem ser comprados e colocados várias vezes, e arrastados para qualquer lugar da tela (inclusive para o alto); ficam onde forem soltos.

## v1.2.0 — 11/10/2026

- Projeto renomeado para **Persocon**: janela, ícone da bandeja, executável (`Persocon.exe`), pasta do build e textos do menu.
- Compras não vão mais direto para o inventário: ficam no chão até a Persocon ir até elas, examinar e guardar no lugar certo (comida, bebida e remédio na mochila; cartuchos na bolsa; mangás na estante; o resto no inventário). Clicar no pacote guarda na hora. O save lembra das compras ainda no chão.
- Editar mobília: botões − e + (e Shift + roda do mouse) para mudar o tamanho; "Espelhar" virou "Virar para o outro lado"; ⊙ também volta o tamanho ao normal.
- Globo de luz, holofote, lasers, máquina de fumaça e lança-confete ficam apagados (dormentes) fora do modo Jam e pulsam com a música no Jam.
- Corrigido: o botão 📌 "Manter o menu aberto" deixava o menu sem responder a cliques.
- Removidos: chat por duplo clique, perguntas da Persocon ao jogador e o botão "Brincadeiras" em Ações (já tem categoria própria).

## v1.1.1 — 11/10/2026

- Corrigido: no "Editar mobília", cama, estante, alvo e almofada não podiam ser clicados nem arrastados (ficavam atrás do fundo da janela). Isso também liberou o clique e o botão direito nesses móveis fora do modo de edição.

## v1.1.0 — 10/10/2026

- Inventário dividido em categorias (abas com contagem, "Todos" agrupado e "Colocados"), com botões "Guardar tudo" e "Editar mobília".
- Novo modo **Editar mobília** (menu Ações): arrastar, girar (botões ou roda do mouse), espelhar e guardar móveis. Esc ou "Concluir" sai do modo.
- Contraste corrigido nos temas: texto de botões, abas e chips legível em todos os temas.
- Balões de fala e de pedidos não balançam mais junto com o pet.
- Espada menor e proporcional ao pet; microfone bem menor e posicionado na mão, perto da boca.
- Versão do app exibida no fim da aba Opções.

## v1.0.0

- Versão trazida do outro computador.
