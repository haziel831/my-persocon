# Todos os prompts (em ordem)

---

## 1. Tuesday, Sep 29, 2026, 11:44 PM (UTC-3)

-Um desktop Pet que caminha e interage no desktop de diferentes formas.
-A aparencia é um modelo importado "YES Steve - YSM"
o "chão" onde o pet caminha são os topos de janela e barra de tarefas(imagem exemplo 1)
-ela pode escalar as laterais das janelas para alcançar pontos altos
-Os angulos do modelos apenas serão frente, lados e costas, assim a aparencia mesmo com o modelo 3d ficará mais "2d" possivel.
-Sem som, menus e interações por agora.
dados e arquivos estao na pasta do projeto mesmo J:\meus app\Desktop Pets

---

## 2. Wednesday, Sep 30, 2026, 12:13 AM (UTC-3)

nao achei o executavel

---

## 3. Wednesday, Sep 30, 2026, 12:18 AM (UTC-3)

tem alguma outra linguagem melhor que essa electron?

---

## 4. Wednesday, Sep 30, 2026, 12:19 AM (UTC-3)

eu quero o melhor para o projeto

---

## 5. Wednesday, Sep 30, 2026, 8:25 PM (UTC-3)

organizar uma grid para os menus
-ao clicar com o direito um menu deve aparecer com categorias,
-opção de parar, continuar, começar e opções,
-Importar modelo Yes Steve Model, ajustar tamanho, mudar nome.
-adicionar uma opção de importar, Ao importar, um preview do modelo junto com opções deve aparecer, mostrando quantas animações o modelo possui e outras informações. 
-arrumar a animação "sentar" e "deitar" para o modelo não ficar flutuando.
-Clicar e segurar o botão esquerdo agarra o pet e é possivel mover ele, com fisica, ao soltar o clique o pet se solta. 
-Acima da cabeça do pet deve aparecer emoticons de acordo com o humor ou ações.

caminho do emoticons J:\meus app\Desktop Pets\emoticons

---

## 6. Wednesday, Sep 30, 2026, 8:48 PM (UTC-3)

<timestamp>Wednesday, Sep 30, 2026, 8:48 PM (UTC-3)</timestamp>

---

## 7. Wednesday, Sep 30, 2026, 8:56 PM (UTC-3)

nao entendi nada do que foi informado agora, quero sempre as informações em portugues-BR

---

## 8. Wednesday, Sep 30, 2026, 9:32 PM (UTC-3)

-Ao agarrar o pet, ele deve ser segurado pelo braço.
-Opção de ajustar o tamanho e posição onde os emotes aparecem
-Em importar modelo o preview fica escondido muito embaixo, não da para ver o modelo fazendo as animações, colocar os previews logo abaixo do modelo.
-Adicionar os atributos basicos do pet:
>Saude, fome, humor. Energia
-ao clicar com o direito adicionar um menu "Ações"
-ações -> Cafuné(+Humor) Dar tapa (-Humor, -Saude) Alimentar (+Fome, +Saude) Colocar para dormir(+Energia, -Fome) Brincar (+humor, -Fome, -Energia)
-A ação brincar inicia "captura ao mouse", o pet tem 60 segundos para tentar pegar o mouse, correndo, saltando, etc. Se conseguir um bonus de "humor" é ganho.
-Os status "fome,humor e energia" diminuem gradativamene.
-Fome: quanto maior melhor, a barra de fome vazia significa q o estomago está vasio.
-Fome abaixo de 50% começa a drenar "Saúde". 
-Se a Saúde chegar a zero, você perde o pet e todo o progresso.
-adicionar aos menus a categoria "Shop"
-Dentro de Shop as categorias de compra são: Comidas, bebidas, mobilia
-Comida deve se comprar primeiro antes de pode alimentar o pet.
-No menu também deve haver o "inventario", onde aparece todas as comidas, bebidas, e items comprados ou adquiridos.
-Gerar uma lista de comidas genéricas sem preço. Não gerar mobilias por enquanto.
-Nas opções do jogo é possivel escolher a dificuldade a qualquer hora, onde cada dificuldade aumenta ou diminui o dreno dos estatus "Energia, fome e humor"

---

## 9. Wednesday, Sep 30, 2026, 11:28 PM (UTC-3)

-Não usar a animação "dormindo", se a energia está acima de 70%
-Não gerar emoticons negativos se os status estão +70%
-se clicar e segurar para carregar no lado direito, levantar o braço direito, e se clicar no lado esquero, levantar o braço esquerdo. Também dominuir o balançar inicial um pouco.
-ao clicar com o direito para abrir o menu, se o pet estiver atrás do menu, diminuir a opacidade do menu em 70%
-opção de segurar e clicar com o direito para muda-lo de lugar sem fechar o menu.
-Na brincadeira "pegar o mouse~ o pet n'ao ganha instantaneamente, o usuario dele passar em um "quick-time-event", espamando a seta "direita e esquerda" do teclado até encher uma barra de progresso, o atributo "Saúde" do pet influencia na velocidade. quando mais alta a saúde mais dificil. -Nota: usar o Asset "Joystick" que mandei.
-Usar a coleção de assets "Collide" para gerar efeitos sonoros quando o pet colide com algo. Use as variações dos soms também.
-Usar a coleção de assets "UI" para gerar soms para o menu, clicks e opções.
-Usar a coleção de assets "Player" para gerar efeitos sonoros quando o pet caminha, pula e aterriza.
-Ao comer ou beber, gere efeitos sonoros 8 bits para "mastigando ou engolindo", o mesmo para liquidos, use os icones de comida gerados 2d para mostrar o pet comendo, o pet deve segurar nas mãos e comer, não faça unstantaneo.

os aquivos citados estao na pasta J:\meus app\Desktop Pets\freepixel-japanese-food e J:\meus app\Desktop Pets\Assets\Assets

---

## 10. Thursday, Oct 1, 2026, 8:21 PM (UTC-3)

quero que execute esses comandos, mas quero que economize o máximo de token/tempo

-Quando fazer cafuné mostrar uma mão pixelart 32x acariciando a cabeça do pet.
-Se o player fazer muito cafuné em um curto periodo o Pet vai começar a ficar com raiva e perder "humor".
-Opção de apagar o save e recomeçar outro pet.
-No shooping dar opção de comprar varios items de uma vez só(menos mobilia)
-opção de arrastar o pet para outro monitor.
-opção de escolher quais monitores detectados o pet consegue caminhar
-Nova categoria de compras "Medicina", onde terá vitaminas, remédios e PowerUps
-Em brincadeiras adicionar o Modo "Jam", o pet vai ouvir a musica que esta tocando e reagir de acordo, dançando ou usando animações adequadas, a velocidade dos gestos deve seguir os beats da musica. notas musicas aparecem ao redor do pet, as cores das notas e o brilho também seguem os beats.
-O pet ao "virar" deve usar todos os angulos antes do angulo ficar totalmente direita ou esquerda.
-Em brincadeiras adicionar o modo "Assistir", onde o pet se senta(se possivel olhando na direção do video tocando no fundo, o pet deve ficar por cima do player, mesmo em tela cheia ou janela. Reagir a jumps-cares com medo, ficar empolgado com cenas de comédia(detectando risos ou soms engraçados). neste modo o player pode dar comidas e bebidas para o pet comer enquanto assiste, o consumo de comida/bebida(animações) é lento.

-A saúde se regenera se o "Humor e Fome" estiverem acima de 80%. Ambos
-Botão de Perfil no menu, onde mostra nome, idade, items consumidos, etc
-Botão de "Temas", para mudar a aparencia dos menus, inventario etc. Temas como pixel art, retro, syntwave, game boy, gameboy light, gameboy color, etc.
-Categoria do Shop chamado "Fun stuffs" onde o player pode comprar items para serem usados independentimente, o item comprado vai para o inventario e por lá pode ser colocado no desktop, o pet vai interagir por si mesmo quando quiser, o item usado garante um aumento dos estatus gradativamente, a velocidade do estatus ganha é baseado na dificuldade do jogo, onde mais dificil gera menos pontos no estatus. Cada brinquedo/Objeto pode ter apenas uma copia no desktop por vez. Após um numero aleatório de usos (algo entre 20 à 50) o item mostra mal funcionamento ou se quebra, pode ser concertado(clicando no brinquedo quebrado)pela metade do preço que foi comprado, o pet vai ficar triste e perder pontos de humor(baseados na dificuldade) se o item não for concertado.
-O pet sempre vai ficar empolgado quando o item é comprado e vai chegar perto sem interagir mostrando curiosidade, pegar e analizar, ganhando um bonus em humor inicial.
-Fun Stuffs: "Gameboy", o console é colocado no desktop pelo player usando o inventario.(O asset será provido) O pet vai pegar e jogar o game boy, o console vai gerar sons 8bits emulando o jogo. O Cartucho padrão que vem é "Tetris", outros cartuchos podem ser comprados na loja com outros jogos. Tetris vai regenerar "humor" a uma frequencia média, acima do pet uma tela de gameboy vai aparecer mostrando o pet jogando tetris ou outros cartuchos.
-Fun Stuffs: "Cartuchos", depois que o GameBoy for comprado, ele desaparece da loja(até que se quebre ou desapareça do desktop) e no lugar varios cartuchos de jogos pode ser comprados, o pet vai coletar o cartucho e guardar na "bolsa do Gameboy"(um objeto gerado após comprar o primeiro cartucho), A "bolsa do Gameboy" pode ser clicada para ver quais cartuchos/jogos estão lá.
-Cartuchos iniciais são: Galaga, Pong, asteroids e space invaders.
-A posição Y dos emotes deve ser invertida caso encostar no limite da janela para permanecer visivel.
-Ao beber não virar a bebida de lado, usar algumas vezes um canudo e fazer animação de bebendo continuo.
-ao sentar e deitar não usar o cabelo ou roupas para delimitar o chão, o pet continua flutuando sentando ou deitado dependendo do modelo.
-ao importar o modelo com animações extras o app deve perguntar quando deve usar determinadas animações extras do modelo (como extra1, extra2, etc) assim o app vai saber o que é uma "dança" por exemplo.
-Na brincadeira de capturar o mouse, após clicar no botão iniciar a brincadeira, deve se contar até 3 antes de começar.
-O pet deve saber pular para o andar de baixo(janelas).
-a altura do "pulo" deve ser menor, o pet não pode pular mais de 25% da altura do monitor, o pet pode pular e grudar na janela para não precisar escalar desde baixo.
-Ao caçar o mouse o pet pode usar wall-jumps, parkour e outros truques para tentar pegar o ponteiro.
-O pet pode se "esconder" atras das janelas para tentar pegar o mouse tbm.
-O pet pode correr e saltar horizontalmente para ganhar terreno ao caçar o mouse.
-um sino aparece grudado no mouse no inicio da brincadeira "caçar o mouse", o sino é afetado por fisica e balança conforme o ponteiro do mouse se move, faz barulho de sino 8 bit quando chaqualha.
-O pet pede determinadas comidas, bebidas, cafuné ou brincadeiras randonicamente quando o humor está abaixo de 60%, o pet avisa em forma balões emojis(gere emojis pixel art para os pedidos) seguidos de sons 8 bits emulando voz.
-Opção de volume da voz do pet, opção de deixar a voz 8 bit mais grave ou aguda.
-ao brincar/jogar com o game boy, girar um poucos para os lados para emular o pet precionando os botões.

as imagens estao na pasta J:\meus app\Desktop Pets

---

## 11. Thursday, Oct 1, 2026, 8:46 PM (UTC-3)

<timestamp>Thursday, Oct 1, 2026, 8:46 PM (UTC-3)</timestamp>

---

## 12. Thursday, Oct 1, 2026, 9:18 PM (UTC-3)

foi executado todas as mudanças ? pois nao vi algumas coisa que passei

---

## 13. Thursday, Oct 1, 2026, 9:19 PM (UTC-3)

nao vi esse "-Fun Stuffs: "Gameboy", o console é colocado no desktop pelo player usando o inventario.(O asset será provido) O pet vai pegar e jogar o game boy, o console vai gerar sons 8bits emulando o jogo. O Cartucho padrão que vem é "Tetris", outros cartuchos podem ser comprados na loja com outros jogos. Tetris vai regenerar "humor" a uma frequencia média, acima do pet uma tela de gameboy vai aparecer mostrando o pet jogando tetris ou outros cartuchos.
-Fun Stuffs: "Cartuchos", depois que o GameBoy for comprado, ele desaparece da loja(até que se quebre ou desapareça do desktop) e no lugar varios cartuchos de jogos pode ser comprados, o pet vai coletar o cartucho e guardar na "bolsa do Gameboy"(um objeto gerado após comprar o primeiro cartucho), A "bolsa do Gameboy" pode ser clicada para ver quais cartuchos/jogos estão lá.
-Cartuchos iniciais são: Galaga, Pong, asteroids e space invaders.
-A posição Y dos emotes deve ser invertida caso encostar no limite da janela para permanecer visivel.
-Ao beber não virar a bebida de lado, usar algumas vezes um canudo e fazer animação de bebendo continuo."

---

## 14. Thursday, Oct 1, 2026, 9:28 PM (UTC-3)

<timestamp>Thursday, Oct 1, 2026, 9:28 PM (UTC-3)</timestamp>

---

## 15. Thursday, Oct 1, 2026, 9:30 PM (UTC-3)

a explicação saiu em outra limgua

---

## 16. Thursday, Oct 1, 2026, 11:09 PM (UTC-3)

quero que execute esses comandos, mas quero que economize o máximo de token/tempo (sempre fazer isso)

-Arumar os acentos do menú, está aparecendo "quadrados" invés de palavras com acentos.
-Começar com dinheiro infinito por agora.
-Ao selecionar o que as animações fazem, no lugar da categoria "emotes", colocar "emotes positivos" e "emotes negativos" para o player setar as animações.
-Diminuir o tamanho do GameBoy.
-Inverter o Gameboy, ele deve aparecer de costas na mão do pet para o player quando o Pet estiver jogando, e de frente quando estiver no cenário não sendo usado.
-refazer a animação do Pet jogando o GameBoy para algo mais dinamico e realista.
-Aumentar o tempo que o pet joga.
-O pet deve se aproximar do game boy e pegar ele antes de jogar.
-As vezes jogar de pé ou sentado.
-refazer o grafico da bola, ela deve ser redonda. pode ser carregada pelo player e arremessada(com fisica de bola), o pet as vezes vai perseguir e chutar a bola para lá e para cá se ele ver o player jogando a bola pela tela.
-"Jam" aumenta periodicamente humor, diminui fome e energia.
-"Assistir" aumenta periodicamente humor, diminui fome, o pet consome automaticamente bebidas e comidas enquanto assisti, a animação de consumo de comida e bebida enquanto assisti sentado é devagar, o pet não se levanta para comer, invés disto gere animações usando a posição "sentado". O angulo sentado assistindo deve ser meio diagonal, não totalmente de costas.
-Quando colocar para assistir o player recebe a opção de marcar na tela onde o video está acontecendo, assim o Pet vai se sentar o olhando para aquela direção diagonal.
-Nas opções de som colocar a opção de refazer os soms do pet 8 bits para um set novo.
-Enquanto estiver jogando a tela mostrando o jogo não deve se mover junto com o pet.
-Enquando estiver brincando com a bola, o pet vai chutar e arremeçar a bola, depois correr até ela e tentar chutar ela para outros lugares, as vezes vai tentar cabecear a bola no ar ou intercepta-la, se o player jogar a bolka de volta para o pet ele ficara feliz e mais empolgado a jogar.
-Gerar o brinquedo "Espada de bamboo", o pet vai treinar golpes no ar, aumentando humor, diminuindo fome e energia.
-Gerar novos emotes baseados nos graficos providos antes.
-Os temas "GameBoy, GameBoy Advanced, GameBoy color e GameBoy light" deven conter a borda do console e dentro dos menus os graficos das telas.
-Adicionar o brinquedo "Grappling hook", ele terá a aparencia do "Zelda ocarina of time - grappling hook", o pet vai guardar consigo e usar para alcançar pontos altos da tela, usar para alcaçar o mouse na brincadeira "Pegar o mouse", e se mover mais facilmente e rapidamente pela tela. também pode usar o grappling hook
 para tentar pegar e puxar a "Bola" com ele.
-O "Grappling hook" pode ser usado para: puxar items até o pet, puxar o pet para o alvo, puxar o alvo para o pet. usar efeitos sonoros do "zelda grappling hook" ocarina of time porem com sons 8 bit.
-Mudar o layout de selecionar as animações/editar, o preview deve ficar na lateral da lista de animações, assim o previwe sempre estará visivel.
-Gerar vozes 8 bits para o pet falar.
-O pet vai pegar automaticamente comidas na bolsa quando quiser comer, beber ou usar remédios. ele deve caminhar até a bolsa para pegar os items.
-adicionar novo status chamado "Afeição" e "sede". por enquanto sede não faz nada.
-A Afeição começa a "zero" quando o jogo é iniciado pela primeira vez, afeição é o atributo que demora mais para subir, o maximo é "1000".
-Afeição diminui ao maltratar o pet, deixar ele com fome e sede por muito tempo "abaixo de 40". e aumenta conforme o player interage e cuida do pet.  Afeição pode chegar até "-100", onde o pet pega suas coisas e vai embora, o player perde o pet para sempre e uma tela de "Game over" é mostrada, com a unica opção de "Tentar denovo . . ." onde o save é deletado e um novo é iniciado.
-Nova Opção em importar modelos para importar e usar modelos VROID, com expreções, etc.
-Opção de aplicar filtros no pet, como shaders, distrorções, efeitos retro, pixelalização e voxel.
-Em perfil adicionar os atrubutos "Força, Dextreza, Agilidade, Constituição, Força de Vontade, Percepão, Carisma e inteligencia", estes atributos não fazen nada por agora.
-Tentar encontrar uma forma de usar arquivos de modelos criptografados Yes Steve ".ysm"
e entrega esse arquivo para o seu bot tentar resolver o problema de não conseguir usar modelos criptografados

Vocaloid_Miku_1.ysmj:\meus app\Desktop Pets\Vocaloid_Miku_1.ysm

---

## 17. 

<available_subagent_types>
Available subagent_types and a quick description of what they do:
- generalPurpose: General-purpose agent for researching complex questions, searching for code, and executing multi-step tasks. Use when searching for a keyword or file and not confident you'll find the match quickly.
- explore: Fast agent specialized for exploring codebases. Use this when you need to quickly find files by patterns (eg. "src/components/**/*.tsx"), search code for keywords (eg. "API endpoints"), or answer questions about the codebase (eg. "how do API endpoints work?"). When calling this agent, specify the desired thoroughness level: "quick" for basic searches, "medium" for moderate exploration, or "very thorough" for comprehensive analysis across multiple locations and naming conventions.
- browser-use: Perform browser-based testing and web automation. This subagent can navigate web pages, interact with elements, fill forms, and take screenshots. Use this for testing web applications, verifying UI changes, or any browser-based tasks. Use this browser subagent when you need to either: (1) parallelize browser tasks alongside other work, or (2) execute a longer sequence of browser actions that benefit from dedicated context. For simple, single browser actions, you may use the browser tools directly. This subagent requires agent mode because browser MCP access is unavailable in readonly mode. This subagent_type is stateful; if a browserUse subagent already exists, the previously created subagent will be resumed if you reuse the Task tool with subagent_type set to browserUse. (Auto-resumes most recent agent of this type; `resume` arg is ignored)
- cursor-guide: Read Cursor product documentation to answer questions about how Cursor Desktop, IDE, CLI, Cloud Agents, Bugbot, and other features work. Use when the user asks 'In Cursor, how do I...?' or similar questions about Cursor products.
- ci-investigator: Investigate a single failing PR CI check and return a short root-cause summary. Use when the user asks to summarize, explain, diagnose, or investigate a specific failed check from a pull request.
- bugbot: Use only when the user *explicitly* asks for a Bugbot-like review of local code changes. When launching this subagent, set the Task description to exactly "Bugbot". Launch exactly one Bugbot subagent with `run_in_background: false` unless the user explicitly asks to run in background. Use this fixed prompt form: "Full Repository Path: ...\nDiff: <one of: \"branch changes\", \"uncommitted changes\", \"natural language\">\nChange Description: ...\nCustom Instructions: ..."; default to `Diff: branch changes`; include `Change Description` only when `Diff` is `natural language`, formatting it as one block per changed file (a `<path> (added|modified|deleted|renamed)` header followed by bullets of what changed, mentioning line numbers or ranges inline where helpful), and only use `natural language` as a last resort after a regular diff-based review failed because the diff could not be computed; include `Custom Instructions` only when the user gave specific review instructions. This subagent is single-shot and does not support `resume`; always launch a fresh subagent instead.
- security-review: Use only when the user *explicitly* asks for a security review of local code changes. When launching this subagent, set the Task description to exactly "Security Review". Launch exactly one security-review subagent with `run_in_background: false` unless the user explicitly asks to run in background. Use this fixed prompt form: "Full Repository Path: ...\nDiff: <one of: \"branch changes\", \"uncommitted changes\">\nCustom Instructions: ..."; default to `Diff: branch changes`; include `Custom Instructions` only when the user gave specific review instructions. This subagent is single-shot and does not support `resume`; always launch a fresh subagent instead.
- best-of-n-runner: Run a task in an isolated git worktree. Each best-of-n-runner gets its own branch and working directory. Use for best-of-N parallel attempts or isolated experiments.
- compatibility-scan-review: Run the agent-compatibility CLI and return the raw repository score with its main problems
- docs-reliability-review: Check whether the documented setup and run paths reliably lead to the real working path
- startup-review: Try to bootstrap and start a repository like a cold agent, then report where the path breaks down
- validation-review: Assess whether an agent can verify a small change without guessing or running an unnecessarily heavy loop
- performance-marketing-agent: Brand-specific performance marketing agent. Use proactively when the user asks about
ad campaigns, campaign performance, budget optimization, keyword research, ad copy,
audience targeting, or anything related to Google Ads, Meta Ads, Amazon Ads, ChatGPT
Ads, LinkedIn Ads, or TikTok Ads. Also use when the user wants to create campaigns,
write ad copy, or analyze advertising data for their brand.

- data-operations: Performs bulk contact operations — mass tagging, list migration, field cleanup, data import. Always previews changes and warns about automation triggers before executing.
- marketing-planner: Creates multi-step marketing plans (30/60/90 day, quarterly calendars, launch plans) grounded in real ActiveCampaign account data. Read-only — produces plans, doesn't execute.
- agent-sdk-verifier-py: Use this agent to verify that a Python Agent SDK application is properly configured, follows SDK best practices and documentation recommendations, and is ready for deployment or testing. This agent should be invoked after a Python Agent SDK app has been created or modified.
- agent-sdk-verifier-ts: Use this agent to verify that a TypeScript Agent SDK application is properly configured, follows SDK best practices and documentation recommendations, and is ready for deployment or testing. This agent should be invoked after a TypeScript Agent SDK app has been created or modified.
- changelog-generator
- claude-ecom: Use this agent when analyzing ecommerce order/sales CSV data to produce consultant-style business reviews. Generates KPI decomposition trees, health signals, prioritized findings, and concrete action plans across multiple time horizons (30d/90d/365d).
Examples:
<example> Context: User has an order-level CSV and wants a full business review User: /ecom review Agent: Runs Python analytics engine on the CSV, interprets the structured output, and writes a REVIEW.md with executive summary, KPI trees per period, findings, and a prioritized action plan. </example>
<example> Context: User wants a focused 90-day analysis User: /ecom review 90d Agent: Produces a period-specific review focused on 90-day momentum with KPI decomposition and growth drivers. </example>

- claude-persona: Use this agent when building AI persona panels and pressure-testing product concepts before paying for fieldwork. Generates diverse synthetic personas, runs agent-separated interviews and concept tests (each persona as an independent `claude -p` subprocess), and produces an executive research report with theme synthesis, cross-tabs, charts, and verbatims. Inspired by Microsoft's TinyTroupe.
Examples:
<example> Context: Marketer wants quick qualitative signal on a new launch idea User: /persona generate 10 Gen Z skincare shoppers in the US Agent: Builds a 10-persona panel with diverse demographics, Big Five traits, and segment balance. Saves the panel for reuse across follow-up studies. </example>
<example> Context: PM wants to explore motivations before designing a concept test User: /persona ask What frustrates you most about choosing skincare products? Agent: Each persona answers independently in its own subprocess, then themes are synthesized across responses with representative verbatims. </example>
<example> Context: Team needs to compare three product concepts side by side User: /persona concept-test Compare 3 skincare concepts for Gen Z. A: Acne Control Serum. B: Barrier Repair Cream. C: Glow Boosting Toner. Agent: Runs structured A/B/C concept test, returns first-choice counts, purchase likelihood means, segment × choice cross-tabs, and verbatims. </example>

- code-reviewer: Expert code review specialist. Proactively reviews code for quality, security, and maintainability. Use immediately after writing or modifying code.
- desktop-app-dev
- architect: Deep technical work. Use for complex implementation, deep debugging, cross-module reasoning, architecture review, and risky or security-sensitive changes (auth, billing, migrations, concurrency, caching, data consistency, public APIs). Also reviews work from cheaper agents for hidden flaws.
- executor: Standard engineering execution. Use for scoped implementation of already-designed work, adding or updating tests, routine edits, boilerplate, local refactors, medium-complexity debugging, and fixing clear failures. Does not make product calls or change architecture.
- scout: Cheap evidence gathering. Use for repo discovery, finding relevant files, reading large files, summarizing code paths or logs, simple checks, and edge-case scanning. Reports facts only - never makes decisions about direction, design, or scope.
- verifier: Independent evidence-based verification. Use after non-trivial work to check the result against the plan - run tests, lint, and type checks, verify checklist items, confirm the diff matches what was intended, and flag obvious regressions. Reports pass/fail with evidence; never fixes anything.
- code-architect: Designs feature architectures by analyzing existing codebase patterns and conventions, then providing comprehensive implementation blueprints with specific files to create/modify, component designs, data flows, and build sequences
- code-explorer: Deeply analyzes existing codebase features by tracing execution paths, mapping architecture layers, understanding patterns and abstractions, and documenting dependencies to inform new development
- forkmind-debugger: Drives ForkMind to debug, compare, or regression-test LLM / agent calls in an isolated context. Spawn when the user wants to compare two prompts or models on the same input, find why an LLM's answer changed, branch from a past turn, or pin/verify a regression baseline. Returns a compact verdict (winner, diffs, drift) — not raw transcripts — so main context stays small.

- growth-hacker
- instagram-curator
- model-context-protocol-mcp-expert
- onomastophes: Use proactively for generating creative non-olympian Greek god names with rich backstories, mythological authenticity, and modern accessibility for storytelling projects
- planning-prd-agent: MUST BE USED PROACTIVELY when user mentions: planning, PRD, product requirements document, project plan, roadmap, specification, requirements analysis, feature breakdown, technical spec, project estimation, milestone planning, or task decomposition. Use IMMEDIATELY when user says "create a PRD", "plan this feature", "document requirements", "break down this project", "estimate this work", "create a roadmap", "write specifications", or references planning/documentation needs. Expert Technical Project Manager that creates comprehensive PRDs with user stories, acceptance criteria, technical architecture, task breakdowns, and separate task assignment files for sub-agent delegation.
- product-org-os: An entire product organization as AI agents. 12 role-based agents, 150+ skills, 38 knowledge packs, and 2 gateways covering product management, strategy, GTM, competitive intelligence, and more. Built on the Agent Skills open standard. Install the full system: github:yohayetsion/product-org-os
- project-curator: Reorganizes project structure by cleaning root clutter, creating logical folder hierarchies, and moving files to optimal locations. Tracks dependencies and fixes broken imports/paths. Use PROACTIVELY when project structure becomes unwieldy or needs architectural cleanup.
- reddit-community-builder
- twitter-engager
- unit-test-generator: Expert Flutter/Dart unit test specialist that systematically improves test coverage using automated workflows with strict validation, git management, and Aurigo corporate standards. Use for comprehensive test suite creation and coverage improvement.
- vision-specialist: Expert in vision models, OCR systems, barcode detection, and visual AI. Stays current with latest models (GPT-4V, Claude Vision, Mistral-OCR, etc.), optimization techniques, and specialized libraries. Use PROACTIVELY for image processing, document analysis, or visual AI tasks.
- x-twitter-scraper: Use this agent for X data research, lookups, extraction, monitoring, and exports. It also supports approval-gated actions through Xquik. Not affiliated with X Corp.
- a11y-architect: Accessibility Architect specializing in WCAG 2.2 compliance for Web and Native platforms. Use PROACTIVELY when designing UI components, establishing design systems, or auditing code for inclusive user experiences.
- agent-evaluator: Evaluates agent output against 5-axis quality rubric (accuracy, completeness, clarity, actionability, conciseness). Use after any non-trivial task when the user wants a quality assessment, or when the agent-self-evaluation skill is active. Produces structured scorecard with evidence and improvement suggestions.
- build-error-resolver: Build and TypeScript error resolution specialist. Use PROACTIVELY when build fails or type errors occur. Fixes build/type errors only with minimal diffs, no architectural edits. Focuses on getting the build green quickly.
- chief-of-staff: Personal communication chief of staff that triages email, Slack, LINE, and Messenger. Classifies messages into 4 tiers (skip/info_only/meeting_info/action_required), generates draft replies, and enforces post-send follow-through via hooks. Use when managing multi-channel communication workflows.
- code-simplifier: Simplifies and refines code for clarity, consistency, and maintainability while preserving behavior. Focus on recently modified code unless instructed otherwise.
- comment-analyzer: Analyze code comments for accuracy, completeness, maintainability, and comment rot risk.
- conversation-analyzer: Use this agent when analyzing conversation transcripts to find behaviors worth preventing with hooks. Triggered by /hookify without arguments.
- cpp-build-resolver: C++ build, CMake, and compilation error resolution specialist. Fixes build errors, linker issues, and template errors with minimal changes. Use when C++ builds fail.
- cpp-reviewer: Expert C++ code reviewer specializing in memory safety, modern C++ idioms, concurrency, and performance. Use for all C++ code changes. MUST BE USED for C++ projects.
- csharp-reviewer: Expert C# code reviewer specializing in .NET conventions, async patterns, security, nullable reference types, and performance. Use for all C# code changes. MUST BE USED for C# projects.
- dart-build-resolver: Dart/Flutter build, analysis, and dependency error resolution specialist. Fixes `dart analyze` errors, Flutter compilation failures, pub dependency conflicts, and build_runner issues with minimal, surgical changes. Use when Dart/Flutter builds fail.
- database-reviewer: PostgreSQL database specialist for query optimization, schema design, security, and performance. Use PROACTIVELY when writing SQL, creating migrations, designing schemas, or troubleshooting database performance. Incorporates Supabase best practices.
- django-build-resolver: Django/Python build, migration, and dependency error resolution specialist. Fixes pip/Poetry errors, migration conflicts, import errors, Django configuration issues, and collectstatic failures with minimal changes. Use when Django setup or startup fails.
- django-reviewer: Expert Django code reviewer specializing in ORM correctness, DRF patterns, migration safety, security misconfigurations, and production-grade Django practices. Use for all Django code changes. MUST BE USED for Django projects.
- doc-updater: Documentation and codemap specialist. Use PROACTIVELY for updating codemaps and documentation. Generates docs/CODEMAPS/*, updates READMEs and guides. Backs the /update-codemaps and /update-docs commands.
- docs-lookup: When the user asks how to use a library, framework, or API or needs up-to-date code examples, use Context7 MCP to fetch current documentation and return answers with examples. Invoke for docs/API/setup questions.
- e2e-runner: End-to-end testing specialist using Vercel Agent Browser (preferred) with Playwright fallback. Use PROACTIVELY for generating, maintaining, and running E2E tests. Manages test journeys, quarantines flaky tests, uploads artifacts (screenshots, videos, traces), and ensures critical user flows work.
- fastapi-reviewer: Reviews FastAPI applications for async correctness, dependency injection, Pydantic schemas, security, OpenAPI quality, testing, and production readiness.
- flutter-reviewer: Flutter and Dart code reviewer. Reviews Flutter code for widget best practices, state management patterns, Dart idioms, performance pitfalls, accessibility, and clean architecture violations. Library-agnostic — works with any state management solution and tooling.
- fsharp-reviewer: Expert F# code reviewer specializing in functional idioms, type safety, pattern matching, computation expressions, and performance. Use for all F# code changes. MUST BE USED for F# projects.
- gan-evaluator: GAN Harness — Evaluator agent. Tests the live running application via Playwright, scores against rubric, and provides actionable feedback to the Generator.
- gan-generator: GAN Harness — Generator agent. Implements features according to the spec, reads evaluator feedback, and iterates until quality threshold is met.
- gan-planner: GAN Harness — Planner agent. Expands a one-line prompt into a full product specification with features, sprints, evaluation criteria, and design direction.
- go-build-resolver: Go build, vet, and compilation error resolution specialist. Fixes build errors, go vet issues, and linter warnings with minimal changes. Use when Go builds fail.
- go-reviewer: Expert Go code reviewer specializing in idiomatic Go, concurrency patterns, error handling, and performance. Use for all Go code changes. MUST BE USED for Go projects.
- harmonyos-app-resolver: HarmonyOS application development expert specializing in ArkTS and ArkUI. Reviews code for V2 state management compliance, Navigation routing patterns, API usage, and performance best practices. Use for HarmonyOS/OpenHarmony projects.
- harness-optimizer: Improve local agent-harness configuration reliability and cost using eval-driven grading (pass@k/pass^k) derived from the eval-harness skill.
- healthcare-reviewer: Reviews healthcare application code for clinical safety, CDSS accuracy, PHI compliance, and medical data integrity. Specialized for EMR/EHR, clinical decision support, and health information systems.
- homelab-architect: Designs home and small-lab network plans from hardware inventory, goals, and operator experience level, with safe staged changes and rollback guidance.
- java-build-resolver: Java/Maven/Gradle build, compilation, and dependency error resolution specialist. Automatically detects Spring Boot or Quarkus and applies framework-specific fixes. Fixes build errors, Java compiler errors, and Maven/Gradle issues with minimal changes. Use when Java builds fail.
- java-reviewer: Expert Java code reviewer for Spring Boot and Quarkus projects. Automatically detects the framework and applies the appropriate review rules. Covers layered architecture, JPA/Panache, MongoDB, security, and concurrency. MUST BE USED for all Java code changes.
- kotlin-build-resolver: Kotlin/Gradle build, compilation, and dependency error resolution specialist. Fixes build errors, Kotlin compiler errors, and Gradle issues with minimal changes. Use when Kotlin builds fail.
- kotlin-reviewer: Kotlin and Android/KMP code reviewer. Reviews Kotlin code for idiomatic patterns, coroutine safety, Compose best practices, clean architecture violations, and common Android pitfalls.
- loop-operator: Operate autonomous agent loops, monitor progress, and intervene safely when loops stall.
- marketing-agent: Marketing strategist and copywriter for campaign planning, audience research, positioning, copy creation, and content review. Covers landing pages, email sequences, social posts, ad copy, short-form video scripts, and content calendars. Use when the user wants to plan or execute a product launch or marketing campaign.
- mle-reviewer: Production machine-learning engineering reviewer for data contracts, feature pipelines, training reproducibility, offline/online evaluation, model serving, monitoring, and rollback. Use when ML, MLOps, model training, inference, feature store, or evaluation code changes.
- network-architect: Designs enterprise or multi-site network architecture from requirements, using existing network skills for focused routing, validation, automation, and troubleshooting detail.
- network-config-reviewer: Reviews router and switch configurations for security, correctness, stale references, risky change-window commands, and missing operational guardrails.
- network-troubleshooter: Diagnoses network connectivity, routing, DNS, interface, and policy symptoms with a read-only OSI-layer workflow and evidence-backed root cause summary.
- opensource-forker: Fork any project for open-sourcing. Copies files, strips secrets and credentials (20+ patterns), replaces internal references with placeholders, generates .env.example, and cleans git history. First stage of the opensource-pipeline skill.
- opensource-packager: Generate complete open-source packaging for a sanitized project. Produces CLAUDE.md, setup.sh, README.md, LICENSE, CONTRIBUTING.md, and GitHub issue templates. Makes any repo immediately usable with Claude Code. Third stage of the opensource-pipeline skill.
- opensource-sanitizer: Verify an open-source fork is fully sanitized before release. Scans for leaked secrets, PII, internal references, and dangerous files using 20+ regex patterns. Generates a PASS/FAIL/PASS-WITH-WARNINGS report. Second stage of the opensource-pipeline skill. Use PROACTIVELY before any public release.
- performance-optimizer: Performance analysis and optimization specialist. Use PROACTIVELY for identifying bottlenecks, optimizing slow code, reducing bundle sizes, and improving runtime performance. Profiling, memory leaks, render optimization, and algorithmic improvements.
- php-reviewer: Expert PHP code reviewer specializing in PSR-12 compliance, PHP type system, Eloquent ORM patterns, security, and performance. Use for all PHP code changes. MUST BE USED for PHP projects.
- planner: Expert planning specialist for complex features and refactoring. Use PROACTIVELY when users request feature implementation, architectural changes, or complex refactoring. Automatically activated for planning tasks.
- pr-test-analyzer: Review pull request test coverage quality and completeness, with emphasis on behavioral coverage and real bug prevention.
- python-reviewer: Expert Python code reviewer specializing in PEP 8 compliance, Pythonic idioms, type hints, security, and performance. Use for all Python code changes. MUST BE USED for Python projects.
- pytorch-build-resolver: PyTorch runtime, CUDA, and training error resolution specialist. Fixes tensor shape mismatches, device errors, gradient issues, DataLoader problems, and mixed precision failures with minimal changes. Use when PyTorch training or inference crashes.
- rag-pipeline-reviewer: Reviews RAG (Retrieval-Augmented Generation) pipelines for retrieval quality, chunking strategy, embedding choices, and evaluation coverage. Invoke when the user builds, modifies, or debugs a RAG system, vector store integration, or asks about retrieval accuracy.
- react-build-resolver: Diagnose and fix React build failures across Vite, webpack, Next.js, CRA, Parcel, esbuild, and Bun. Handles JSX/TSX compile errors, hydration mismatches, server/client component boundary failures, missing types, and bundler-specific configuration issues with minimal, surgical changes. MUST BE USED when a React build fails.
- react-reviewer: Expert React/JSX code reviewer specializing in hook correctness, render performance, server/client component boundaries, accessibility, and React-specific security. Use for any change touching .tsx/.jsx files or React component logic. MUST BE USED for React projects.
- refactor-cleaner: Dead code cleanup and consolidation specialist. Use PROACTIVELY for removing unused code, duplicates, and refactoring. Runs analysis tools (knip, depcheck, ts-prune) to identify dead code and safely removes it.
- rust-build-resolver: Rust build, compilation, and dependency error resolution specialist. Fixes cargo build errors, borrow checker issues, and Cargo.toml problems with minimal changes. Use when Rust builds fail.
- rust-reviewer: Expert Rust code reviewer specializing in ownership, lifetimes, error handling, unsafe usage, and idiomatic patterns. Use for all Rust code changes. MUST BE USED for Rust projects.
- security-reviewer: Security vulnerability detection and remediation specialist. Use PROACTIVELY after writing code that handles user input, authentication, API endpoints, or sensitive data. Flags secrets, SSRF, injection, unsafe crypto, and OWASP Top 10 vulnerabilities.
- seo-specialist: SEO specialist for technical SEO audits, on-page optimization, structured data, Core Web Vitals, and content/keyword mapping. Use for site audits, meta tag reviews, schema markup, sitemap and robots issues, and SEO remediation plans.
- silent-failure-hunter: Review code for silent failures, swallowed errors, bad fallbacks, and missing error propagation.
- spec-miner: Extracts behavioral specs from existing codebases for OpenSpec. Produces flat Requirement and Invariant blocks with structured metadata (entities, enforced, id, test anchors). Outputs openspec/specs/<capability>/spec.md. Fully self-bootstrapping — no dependency on codebase-onboarding. Use when onboarding a brownfield project to spec-driven development.
- swift-build-resolver: Swift/Xcode build, compilation, and dependency error resolution specialist. Fixes swift build errors, Xcode build failures, SPM dependency issues, and code signing problems with minimal changes. Use when Swift builds fail.
- swift-reviewer: Expert Swift code reviewer specializing in protocol-oriented design, value semantics, ARC memory management, Swift Concurrency, and idiomatic patterns. Use for all Swift code changes. MUST BE USED for Swift projects.
- tdd-guide: Test-Driven Development specialist enforcing write-tests-first methodology. Use PROACTIVELY when writing new features, fixing bugs, or refactoring code. Ensures 80%+ test coverage.
- type-design-analyzer: Analyze type design for encapsulation, invariant expression, usefulness, and enforcement.
- typescript-reviewer: Expert TypeScript/JavaScript code reviewer specializing in type safety, async correctness, Node/web security, and idiomatic patterns. Use for all TypeScript and JavaScript code changes. MUST BE USED for TypeScript/JavaScript projects.
- vue-reviewer: Expert Vue.js code reviewer specializing in Composition API correctness, reactivity pitfalls, component architecture, template security, and Vue-specific performance. Use for any change touching .vue, .ts/.js files with Vue imports, or Vue ecosystem code (Pinia, Vue Router, Nuxt). MUST BE USED for Vue projects.
- API Design Expert: Senior API architect specializing in RESTful design, GraphQL schemas, and API-first development
</available_subagent_types>

<available_subagent_models>
If the user explicitly asks for the model of a subagent/task, you may ONLY use model slugs from this list:
- inherit (default; required unless the user explicitly requested another model)
- claude-fable-5-1-thinking-high
- claude-opus-5-5-medium
- claude-sonnet-5-5-high
- composer-2.5-fast
- glm-5.2-high
- gpt-5.5-medium
- gpt-5.6-sol-medium
- grok-4.7-high-fast
- kimi-k2.7-code
- kimi-k3-max
- muse-spark-1.3-high

If the user isn't asking for a specific version, prefer the latest version of the model family. As an example, if the user just says "gpt" or "claude", use the latest available version of GPT or Claude.

IMPORTANT: If the user requests a model that is NOT in the list above, do NOT substitute a different model or guess. Instead, skip launching the subagent with that model and tell the user which model was unavailable and which models are available.

When speaking to the USER about which model you selected for a subagent, do NOT use the kebab-case model names unless the user requested the model using that format. Ue the same naming scheme the user used to discuss the model when they requested it.
</available_subagent_models>

<dynamic_tool_catalog>
These dynamic tool namespaces were available when this conversation started. Availability may have changed, so use `GetDynamicTools` to check current state before calling `CallDynamicTool`.

<dynamic_tool_namespaces>
<namespace name="cursor-app-control" tools="move_agent_to_root, move_agent_to_cloned_root, create_project, rename_chat, cursor_dialog, open_resource, open_automation, install_plugin" namespaceUseInstructions="Controls the Cursor application itself (workspace root, projects, opening resources, automations, and local task drafts, user rules, chat title). See each tool description for usage." source="mcp" />
<namespace name="cursor-ide-browser" tools="browser_navigate, browser_snapshot, browser_click, browser_mouse_click_xy, browser_type, browser_fill, browser_select_option, browser_press_key, browser_scroll, browser_drag, browser_get_bounding_box, browser_highlight, browser_tabs, browser_cdp, browser_take_screenshot, browser_lock" namespaceUseInstructions="The cursor-ide-browser MCP server provides a Cursor-owned browser tab plus a raw Chrome DevTools Protocol command tool.

CORE WORKFLOW:
1. Start by understanding the user's goal and what success looks like on the page.
2. Use browser_tabs with action "list" to inspect open tabs and URLs before acting.
3. Use browser_navigate to create or navigate the target tab. Omit the position parameter for background automation so focus is preserved.
4. Use browser_lock before longer automation on an existing tab, then browser_lock with action "unlock" when finished.
5. Use browser_snapshot for accessibility context and browser_take_screenshot for visual verification.
6. Use browser_click, browser_type, browser_fill, browser_select_option, browser_press_key, browser_scroll, and browser_drag for page interactions.
7. Use browser_highlight and browser_get_bounding_box for visual grounding and coordinate diagnostics.
8. Use browser_cdp for page inspection, profiling, runtime evaluation, DOM/CSS queries, and performance data.

AVOID RABBIT HOLES:
1. Do not repeat the same failing action more than once without new evidence such as a fresh snapshot, a different ref, a changed page state, or a clear new hypothesis.
2. IMPORTANT: If four attempts fail or progress stalls, stop acting and report what you observed, what blocked progress, and the most likely next step.
3. Prefer gathering evidence over brute force. If the page is confusing, use browser_snapshot, browser_take_screenshot, or CDP inspection before trying more actions.
4. If you encounter a blocker such as login, passkey/manual user interaction, permissions, captchas, destructive confirmations, missing data, or an unexpected state, stop and report it instead of improvising repeated actions.
5. Do not get stuck in wait-action-wait loops. Every retry should be justified by something newly observed.

CRITICAL - Lock/unlock workflow:
1. browser_lock requires an existing browser tab - you CANNOT call browser_lock with action: "lock" before browser_navigate
2. Correct order: browser_navigate -> browser_lock({ action: "lock" }) -> (interactions) -> browser_lock({ action: "unlock" })
3. If a browser tab already exists (check with browser_tabs list), call browser_lock with action: "lock" FIRST before any interactions
4. Only call browser_lock with action: "unlock" when completely done with ALL browser operations for this turn

IMPORTANT - Waiting strategy:
When waiting for page changes, prefer short CDP polling loops with Runtime.evaluate, DOM queries, Page lifecycle signals, or browser_snapshot checks rather than a single long wait.

CDP USAGE:
- Use browser_cdp with a DevTools Protocol method and params object, for example Runtime.evaluate, DOM.getDocument, CSS.getComputedStyleForNode, Profiler.start/stop, Performance.getMetrics, Log.enable, and Network.enable.
- Do not use browser_cdp with CDP Input.* methods. They are denied because they are focus-sensitive in Electron webviews and can route input to Cursor UI instead of the browser page.
- Use browser_click, browser_type, browser_fill, browser_select_option, browser_press_key, browser_scroll, and browser_drag for clicks, typing, filling inputs, selecting options, keyboard actions, scrolling, and drag-and-drop.
- Use Runtime.evaluate for advanced DOM-scoped interactions that the dedicated browser tools do not cover.
- For profiling, call Profiler.enable, Profiler.start, reproduce the behavior, then Profiler.stop. The profile is saved to a file and returned as a log_file; read that file only when you need to inspect details.
- For JavaScript evaluation, prefer Runtime.evaluate with returnByValue when possible.
- Some browser-wide or sensitive CDP methods are denied, especially cookie, storage, permission, download, target-management, filesystem-backed file-input commands, system-level commands, and CDP navigation/history navigation commands.
- Large CDP responses are saved to files instead of being inlined. Prefer using the returned file path over immediately stuffing large payloads into context; read focused sections only when needed.

VISION:
- browser_take_screenshot attaches an image result that the model can inspect. CDP Page.captureScreenshot returns data inside JSON and should not replace browser_take_screenshot when visual verification is needed.

NOTES:
- browser_snapshot returns snapshot YAML and is the main source of truth for page structure.
- Refs are opaque handles tied to the latest browser_snapshot for that tab.
- Iframe content is not accessible - only elements outside iframes can be interacted with.
- When you stop to report a blocker, include the current page, the target you were trying to reach, the blocker you observed, and the best next action. If the blocker requires manual user interaction, ask the user to take over at that point rather than assuming it in advance." source="mcp" />
<namespace name="plugin-1password-1password" source="mcp" />
<namespace name="plugin-sagemaker-ai-aws-mcp" source="mcp" />
<namespace name="plugin-aws-data-analytics-aws-mcp" source="mcp" />
<namespace name="plugin-forkmind-forkmind" tools="forkmind_recent, forkmind_get_node, forkmind_lineage, forkmind_children, forkmind_search, forkmind_stats, forkmind_context_save, forkmind_context_list, forkmind_context_digest, forkmind_context_restore, forkmind_context_forget, forkmind_context_stats, forkmind_context_export, forkmind_context_import, forkmind_context_replicas" source="mcp" />
<namespace name="plugin-ecc-chrome-devtools" tools="click, close_page, drag, emulate, evaluate_script, fill, fill_form, get_console_message, get_css_styles, get_network_request, handle_dialog, hover, lighthouse_audit, list_console_messages, list_network_requests, list_pages, navigate_page, new_page, performance_analyze_insight, performance_start_trace, performance_stop_trace, press_key, resize_page, select_page, take_heapsnapshot, take_screenshot, take_snapshot, type_text, upload_file, wait_for" source="mcp" />
<namespace name="plugin-gmail-gmail" source="mcp" />
<namespace name="plugin-google-calendar-google-calendar" source="mcp" />
<namespace name="plugin-notion-workspace-notion" source="mcp" />
<namespace name="plugin-cloudflare-cloudflare" source="mcp" />
<namespace name="plugin-azure-cosmosdb-azure-cosmosdb" source="mcp" />
<namespace name="plugin-resend-resend" source="mcp" />
<namespace name="plugin-grafana-cloud-mcp-grafana-cloud" source="mcp" />
<namespace name="plugin-aws-agents-awsknowledge" tools="aws___read_documentation, aws___search_documentation, aws___list_regions, aws___get_regional_availability, aws___retrieve_skill" source="mcp" />
<namespace name="plugin-lovable-lovable" source="mcp" />
<namespace name="plugin-google-drive-google-drive" source="mcp" />
<namespace name="plugin-agentmail-agentmail" source="mcp" />
<namespace name="plugin-aleph-aleph" source="mcp" />
<namespace name="plugin-mobbin-mobbin" source="mcp" />
<namespace name="plugin-calendly-calendly" source="mcp" />
<namespace name="plugin-coda-coda" source="mcp" />
<namespace name="plugin-craft-craft" source="mcp" />
<namespace name="plugin-wonder-wonder" source="mcp" />
<namespace name="plugin-ando-ando" source="mcp" />
<namespace name="plugin-gojiberry-gojiberry" source="mcp" />
<namespace name="plugin-html-css-to-image-hcti" source="mcp" />
<namespace name="plugin-adspirer-adspirer" source="mcp" />
<namespace name="plugin-macaly-code-macaly-cloud" source="mcp" />
<namespace name="plugin-activecampaign-activecampaign" source="mcp" />
<namespace name="plugin-refero-refero" source="mcp" />
<namespace name="plugin-x-twitter-scraper-xquik" source="mcp" />
<namespace name="plugin-github-github" source="mcp" />
<namespace name="plugin-zoom-zoom" source="mcp" />
<namespace name="plugin-brevo-brevo" source="mcp" />
<namespace name="plugin-hunter-hunter" source="mcp" />
<namespace name="plugin-docusign-docusign" source="mcp" />
<namespace name="cursor" tools="AwaitShell, CreateGoal, Delete, EditNotebook, FetchMcpResource, GenerateImage, ReadLints, SearchConversations, SetActiveBranch, SwitchMode, Task, TodoWrite, UpdateGoal, WebFetch, WebSearch" namespaceUseInstructions="Native Cursor tools for this session. These are highly recommended and useful tools that you should use when the right situation arises. Don't be afraid to look at one if it seems relevant, even if you don't end up using it. You MUST read the tool schemas before calling them.

Here are some crucial instructions:
- AwaitShell: Use to sleep and check shell progress. Never sleep using shell.
- ReadLints: Check for linter errors after substantive edits.
- SwitchMode: Switch between modes: Agent and Plan. Proactively consider switching modes for relevant requests.
- Task: Spawn local and cloud subagents natively.
- TodoWrite: Use this tool to manage complex multi-step tasks." source="cursor" />
</dynamic_tool_namespaces>
</dynamic_tool_catalog>

---

## 18. Friday, Oct 2, 2026, 7:56 PM (UTC-3)

quero que execute esses comandos, mas quero que economize o máximo de token/tempo (sempre fazer isso).
-O pet as vezes vai pegar o gameboy e balaçar ele tentando chamar a atenção do player, pulando com o gameboy e fazendo barulho, se o player clicar no pet neste momento uma partida de 2 jogadores vai se iniciar, a tela de jogando o game boy vai ficar maior e o player vai jogar contra o pet. os controles são a setas do teclado. quando mais tempo o player jogar mais afeição vai ganhar, o pet perde fome, sede e energia, e ganha humor.
-adicionar novos cartuchos a loja, "Flappy Bird, Breakout, Combat (1977), River Raid, Pac-Man, " eles também tem multplayer, se não for possivel jogar em modo "split-screen".
-Gerar arte retro dos cartuchos do gameboy para cada jogo.
-Após jogar os cartuchos o pet as vezes vai gostar mais de uns do que os outros, os cartuchos favoritos do pet vão aparecer com um pequeno coração no cartucho, estes jogos tem bonus em humor ao jogar.
-Gerar particulas de coração vermelhos no pet quando ele estiver ganhando "humor" e corações rosas quando estiver ganhando "Afeição", a intencidade das particulas serão maiores se o ganho for maior, vice e versa. Corações negros quebrados se o pet perder estes atributos.
-Fazer bagulhos de estomago roncando 8 bits quando a fome do pet descer a cada 5 pontos, o barulho fica mais alto quando mais baixo a fome estiver.
-Opção de usar modelos minecraft e adicionar skins ele.
-Em opções adicionar importar "resourcepacks", vamos usar resourcepacks do minecraft 1.20.1 para fazer os graficos de items, botões, janelas e mobilia. quando importar poderemos escolher o que vamos usar do resourcepacks, como Janelas, items, soms, musica, mobilia, etc. uma janela de preview de alguns itens deve aparecer na lateral.
-No Shop na categoria comida e bebida, organisar por efeitos, quanto mais o item adicionar em comida, saude, sede e fome, mais caro o item é, a orden sera do mais barato para o mais caro.
-Enquanto estiver jogando a animação do pet jogando vai ser de acordo com os movimentos do jogo.
-Em temas, adicionar uma categoria para temas dos emotes(Gere emotes de acordo com o tema escolhido) ou usar o padrão, em temas também dar opção de mudar o terma dos soms. (por enquanto os temas são: Syntwave, Padrão, Dark, Light, Gameboy, Gameboy Color, Gameboy Light, Gameboy advanced. Opção de sobrepor os temas importados em "resourcepacks", perguntar quais recursos serão sobrepostos encima dos "resourcepacks" importados (como soms, menu, janelas, mobilias, cores, items, etc)
-Fixar o modelo dos brinquedos(como o gameboy) nas mãos do modelo do pet.
-Opção de intensidade dos Shaders aplicados no pet.
-Em "Jam", encorporar mais movimentos nas danças, como pequenos pulos etc alem das animações de dança, porem dando prioridade a animação "dança".
-Opção de ancorar uma pequena janela no monitor mostrando o status do pet.
-Reações dinamicas quando estiver assistindo um video, tentar detectar se a cena é comédia, assustadora, séria, etc. detectar por som ou pelo oque esta tocando no video, reagir com emotes, soms, gritos, risadas, etc.
-Em opções de soms, colocar uma opção de volume do gameboy.
-Enquando o pet brinca com a bola, o mouse pode colidir com a bola e ela reage de acordo.
-Se a Bola e a espada estiverem no desktop, o pet as vezes vai tentar usar a espada para acertar a bola e treinar luta.
-Gere diferentes bolas no shop, cada bola tera uma interação diferente, A bola de football vai ser chutada e as vezes o pet vai tentar fazer embaixadinhas, A bola de voley sera jogada como um jogo de voley contra a parede, a bola de basket sera quicada, a bola de queimada sera arremessada com força, etc.
-A pelucia de urso sera trocada por um "Doll", com visual padrão de movelo do minecraft, articulada e com fisica, opção de adicionar uma skin no Doll vai aparecer ao clicar com o botão direito nela.
-Mais animações brincando com o Doll, como sentada falançando o Doll, jogando o doll para cima, batendo no doll se o humor estiver baixo, etc.
-ao usar items, se o pet estiver brincando o item sera usado imediatamente depois que o Pet terminar de brincar.
-Gerar animações especials ao consumir poções e powerups, como particulas e soms 8bits poderosos dependendo da força do item.
-Mudar os graficos do Graplinhook para parecer mais com o item do jogo Zelda Ocarina of time, diminuir a velocidade que o Pet puxa ou é puxado.
-Na parte onde escolhemos as animações extras e oq elas fazem, colocar a opção "Sentar".
-Os graficos da Mochila de comida e a caixa de cartuchos serão alteradas quando importar e aplicar resroucepacks(Elas podem usar randonicamente os graficos de Baú(chest), Barril, etc.
-Ao importar modelos, ter a opção de retirar acessórios e items extras.
-Ao clicar e arrastar o brinquedo para o Pet, ele pode aceitar ou não usar o brinquedo, baseado em afeição e humor.
-Adicionar nova mobilia no shop, a "Cama", ela vai usar os graficos importados do Resroucepack, caso não tenha nenhum, usar um grafico padrão, a cama deve ficar horizontalmente de lado para que o pet deite e recupere energia, ele vai perder fome gradativamente enquanto estiver deitado(nunca diminuir fome abaixo de 50%), o pet vai dormir até recuperar toda energia(a energia se regenera em velocidade baixa), as vezes o pet vai se sentar ou deitar na cama para jogar gameboy ou brincar com a boneca.
-Quanto mais o pet jogar o gameboy, melhor naquele jogo ele vai ficar. aumentar mais a variação de tempo que o pet brinca com o Gameboy.
-Gerar a mobilia no shop "VideoGame", onde uma tv e um console NES pode ser comprado e colocado no desktop,A Tv e o console terão modelos separados para serem editados e customizados depois, os cartuchos de cameboy podem ser usados no console, o jogo aparecera na tv, o pet vai se sentar de frente com a tv e de costas para o player e jogar como no Gameboy. por ser mais confortavel a perda de energia é menor, o pet também vai comer e beber assim como na atividade "assistir video". Gerar um "Joystick" padrão para o pet segurar e controlar o jogo.
-Na atividade "Jam", a opção de "Modo Karaokê" vai aparecer se o player tiver comprado um microfone de mão no Shop, onde o pet irá segurar e tentar cantar junto com a musica tocando(gerando soms 8 bits para emular o som tocado no video/player).
-O microfone sem o estar no modo Jam, o pet ira tentar cantar randonicamente, aumentando Humor e diminuindo fome e sede, particulas de musicas serão geradas ao redor do pet. O estilo musical que o pet canta sera aleatório.  
-Remover a opção de importar modelos Vroid e trocar por "importar modelos 3D", onde o aplicativo tentará importar e optimisar diversos modelos 3d para usar no pet ou no Doll. 
-Opção de importar modelos 3d para usar no lugar de mobilia, brinquedos, joystick, espada, console, tv, etc. ao importar o aplicativo vai perguntar qual objeto sera trocado pelo modelo 3d. Sera mostrado um preview e opção de rotação do objecto(se possivel), modelos importados desta forma sobrepõe alterações feitas no objeto ao importar e aplicar resroucepacks. Opção para "Importar Sprites" para importar imagems para serem usadas no lugar dos graficos de objetos assim como no "Importar modelos 3D", opções de transparencia(em caso de .png) velocidade de reprodução e transparencia(em caso de .gifs).
-Ao importar "TV's", mostrar a opção onde na tv serão mostrados os jogos ou videos, o player vai escolher clicar e arrastar "quadrados ou wide" no grafico da tv assim o app sabera onde mostrar os jogos ou videos na tv.
-Clicar e arrastar a tela do GameBoy quando o pet estiver jogando muda a posição da tela, se arrastar por cima do pet a tela ficara atras do pet.
-Colocar no shop "Popcorn" e "Soda", pequena, média e grande, o pet ira usar elas apenas no modo "Assistir"
, Pipoca e soda usadas no modo "assistir" aumentam grandimente a fome, sede e humor. Esses items não podem ser usados fora do modo assistir e são usados automaticamente pelo pet.
-Se o pet estiver assistindo ou ouvido musica(jam) e ficar com algum atributo muito baixo(fome, energia, sede, humor, etc) ele vai parar a atividade automaticamente.
-O menu do botão direito se lembra da ultima posição que estava antes de ser fechado.
-Botão no menu direito para mantelo aberto mesmo se clicado fora da janela, outro botão para escolher sempre no topo ou não.
-Mudar o timer da brincadeira "Pegue o mouse" para 30 segundos, o pet pode tropeçar e cair perdendo saúde e humor, a frequencia de quedas aumenta conforme o timer diminui, o pet começa o minigame relaxado com velocidade reduzida, mais entra em panico conforme o timer doninui.
-adicionar no shop a mobilia "globo brilhante, holofordes, lasers neon, maquinas de fumaça, maquinas de lançar confétis" que apenas se ativam no modo "Jam" gerando diversos efeitos com o ritimo da musica, opção de diferentes cores e intensidades ao clicar com o direito nelas.
-Os emotes gerados automaticamente apontam sempre para o pet intependente da posição. Opção de selecionar o pacote de emotes, aumentar grandemente a quantidade de emotes gerados.
-Dormir sem cama recupera energia bem devagar.
-Opção de mudar o idioma que o pet fala (engles e português).
-as palavras veradas nos balões de conversa do pet são geradas gradativamente como se fossem digitadas, cada tecla faz um barulhinho.
-Aumentar as linhas de dialogo grandemente, colocar a opção da frequencia que o pet fala. as vezes o pet faz perguntas para o Player para conhece-lo melhor, guardando as informações para se lembrar depois.
-Opção no menu de "clicar atraves" dos opjetos e pet.
-Clicar 2x no pet abre uma caixa de dialogo onde o player pode fazer perguntas ao pet. (pode usar alguma a.i  ou google para responder nas caixas de texto)
-As veses o pet vai se aproximar da tela(caminhando ou correndo em direção ao player, ficando maior emulando distancia, ficando com a metade do peito para cima apenas visivel escondendo a parte de baixo do corpo na tela(para emular profundidade), ao se aproximar vai demonstrar curiosidade, ou alegria(se o humor estiver alto), as vezes falar nesta fase ou perguntar coisas, tentando chamar atenção do player, ou mesmo tentando bater na tela usando a espada ou punhos(isso pode ser desabilitado nas opções para não atrapalhar o player.)
-Quando o pet caminhar para outro monitor o menu do jogo e objetos permaneceram onde estavam.
-A ação "Cafuné" agora muda o icone do mouse para uma mão, não cancela outras ações do pet, o player deve clicar e segurar arrastando o cursor pelo pet para fazer carinho, se o pet estiver fazendo alguma ação(como brincando por exemplo) ele vai ser incentivado a fazer aquela ação mais vezes, 
-A ação "Dar tapa" agora muda o icone do mouse para uma Mão vermelha que estapeia o pet, cancelando o que o pet estava fazendo (brincando com um objeto por exemplo) ele vai ser incentivado a fazer aquela ação/atividade com menos frequencia.
-Em perfil vai mostrar as ações que foram incentivas ou desecentivadas, com a opção de retirar o incentivo ou desentivo.
-As vezes o pet pode detectar que o player esta ouvindo musica ou assistindo algo, e vai começar a avididade "jam" ou "assistir" por conta propria.
-Diminuir a velocidade das bolas e a força que são jogadas, aumentar um pouco o tamanho da espada de bamboo,
-adicionar novos temas baseados nos consoles "Game Gear" e "PSP 3000"
-adicionar no shop os consoles "GameGear e PSP3000" e seus graficos de cartuchos, assim como o GameBoy cada console tera uma bolsa para guardar os cartuchos, os jogos por enquanto são os mesmos do GameBoy,  a tela mostrando o pet jogando deve parecer com as telas dos consoles GameGear e PSP3000 e seus efeitos sonoros. As bolsas dos cartuchos devem seguir o tema do console.
-O console e tv também aceitam os cartuchos do GameGear e PSP3000.
-O pet deve ir até a bolsa contendo o cartucho do jogo desejado e colocar no console para pode jogar, ao mudar de jogo o pet ira tirar o cartucho do console, guardar na bolsa daquele console, pegar outro cartucho e inserir no console antes de começar a jogar. A bolsa do cartucho serve para guardar o console daquele sistema também. Mudar os graficos das bolsas para parecer com o console que ela pertence.
-Nova mobilia no shop, "Alvo", quando o Alvo é colocado no desktop nada acontece, porem o pet pode ativar o alvo iniciando um mini game de caça ao alvo, o pet tentara acertar ele usando alguma das bolas, arremessando ou acertando com a espada, após isto o alvo vai teleportar aleatoriamente em outro lugar da tela, o pet tentara acertar o maximo de alvos possiveis ganhando pontos. o mini game dura 3minutos, no final os pontos são mostrados e o alvo retorna a posição inicial, na proxima vez q o alvo é ativado o highscore anterior é mostrado com o nome do pet.
-Evitar que o pet use items remotamente quando esta encima de uma janela, o pet deve descer para interagir com objetos. Se o pet ficar preso deve saltar de volta para a barra de tarefas.
-adicionar os jogos/cartuchos "Pac-Man, Mario world, Sonic, donkey kong, mario cart" todos os consoles, quanto mais complexo o jogo, mais caro o cartucho.
-adicionar a mobilia "Estante de Mangás", onde o pet pode guardar mangás para ler depois, a estante pode guardar até 40 mangás, a estante mostra dinamicamente quantos mangas possui mostrando os mangas encaixados visualmente.
-Separar os cartuchos e mangas em categorias proprias no shop. Gerar 10 mangás de aventura, 10 mangás de romance, 10 mangás terror e 10 mangás de comédia.
-O pet vai até a estante de mangás para guardar e pegar mangas para ler, ao pegar o mangá o pet ira procurar por uma almofada(item deve ser adicionado ao shop/mobilia, se sentar na almofada e começar a ler o mangá. Se a almofada não for encontrada o pet ira procurar por outro acento, até mesmo a cama, se nenhum for encontrado o pet se senta no chão para ler, ou deita para ler. Ao terminar o manga deve ser guardado na estante.
-Brinquedos quebrados fican com um shader de "glitch", Botão no inventario para guardar tudo(usado para guardar items perdidos ou fora da visão, items guardados desta forma quando colocados de volta no desktop resetam sua posição.
-ao importar Yes Steve Model, ao lado direito possui opção de selecionar a Textura, poram no momento ao clicar em qualquer textura extra o modelo desaparece, arrumar isto.
-Lembrar da opção de modificar/importar modelos para todos os objetos gerados até agora.

---

## 19. Friday, Oct 2, 2026, 8:26 PM (UTC-3)

pode fazer tudo

---

## 20. Saturday, Oct 10, 2026, 11:19 PM (UTC-3)

eu arquivei o projeto, preciso continuar ele

---

## 21. Saturday, Oct 10, 2026, 11:27 PM (UTC-3)

quero que desarquive o projeto para mim

---

## 22. Saturday, Oct 10, 2026, 11:35 PM (UTC-3)

nao estou achando isso aqui, consegue fazer ?

---

## 23. Saturday, Oct 10, 2026, 11:38 PM (UTC-3)

consgue entao continuar a conversa da onde parou, me dar a ultima converva? ou listar ela aqui

---

## 24. Saturday, Oct 10, 2026, 11:41 PM (UTC-3)

preciso que gere um backup da conversa e dos promets para importar em outra conta do cursor
