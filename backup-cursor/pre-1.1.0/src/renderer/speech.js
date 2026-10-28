// Speech bubble typed letter by letter (a blip per key), lines in Portuguese or English.
const pick = (list) => list[Math.floor(Math.random() * list.length)];

// event -> [pt lines, en lines, probability]. Lines may be functions of (data, speech).
const LINES = {
  bought: [['Uau! Pra mim?', 'Obrigada!', 'Que legal!', 'Presente!', 'Você é demais!', 'Eba, coisa nova!'], ['Wow! For me?', 'Thank you!', 'So cool!', 'A present!', "You're the best!", 'Yay, something new!'], 0.6],
  requestDone: [['Valeu!', 'Hehe, obrigada!', 'Era isso!', 'Você me entende!'], ['Thanks!', 'Hehe, thank you!', 'That was it!', 'You get me!'], 0.7],
  ballFetch: [['De novo! De novo!', 'Pega essa!', 'Iupiii!', 'Joga mais!', 'Essa foi longe!'], ['Again! Again!', 'Catch this!', 'Wheee!', 'Throw more!', 'That went far!'], 0.6],
  ballHeader: [['Cabeçada!', 'Toma!', 'Gol!'], ['Header!', 'Take that!', 'Goal!'], 0.3],
  ballStart: [['Bora jogar bola!', 'Bola!'], ["Let's play ball!", 'Ball!'], 0.3],
  slap: [['Ai!', 'Ei! Doeu!', 'Por quê?!', 'Malvado...', 'Isso não foi legal!'], ['Ow!', 'Hey! That hurt!', 'Why?!', 'Meanie...', 'That was not nice!'], 0.8],
  patAngry: [['Chega, chega!', 'Para com isso!', 'Meu cabelo!'], ['Enough, enough!', 'Stop that!', 'My hair!'], 0.8],
  pet: [['Hehe~', 'Mais!', 'Que gostoso...', 'Ronrom~', 'Aí sim...', 'Adoro isso!'], ['Hehe~', 'More!', 'That feels nice...', 'Purr~', 'Right there...', 'I love that!'], 0.2],
  wake: [['Bom dia!', 'Hmm... dormi bem.', 'Que soninho bom...', '*boceja*'], ['Good morning!', 'Hmm... slept well.', 'What a nice nap...', '*yawns*'], 0.4],
  toyBroke: [['Quebrou...', 'Ah não...', 'Meu brinquedo!'], ['It broke...', 'Oh no...', 'My toy!'], 1],
  toyRepaired: [['Consertou! Obrigada!', 'Novinho de novo!'], ['Fixed! Thank you!', 'Good as new!'], 1],
  chaseStart: [['Vou te pegar!', 'Corre, corre!', 'Não foge não!'], ["I'm gonna get you!", 'Run, run!', "Don't run away!"], 0.7],
  qteStart: [['Peguei!', 'Te peguei!', 'Ninguém escapa!'], ['Got it!', 'Got you!', 'Nobody escapes!'], 0.7],
  chaseTrip: [['Ai! Tropecei!', 'Ugh, caí...'], ['Ouch! I tripped!', 'Ugh, I fell...'], 0.7],
  hookFire: [['Hookshot!', 'Lá vou eu!', 'Gancho!'], ['Hookshot!', 'Here I go!', 'Hook!'], 0.25],
  supply: [(d) => [`Hora do ${d.item?.name || 'lanche'}!`, 'Peguei da mochila!'], (d) => [`${d.item?.name || 'Snack'} time!`, 'Got it from the backpack!'], 0.5],
  gameExcite: [['Isso!', 'Recorde!', 'Uhuul!', 'Passei de fase!', 'Toma essa!'], ['Yes!', 'High score!', 'Woohoo!', 'Level up!', 'Take that!'], 0.4],
  wantPlay: [['Joga comigo!', 'Vem jogar!', 'Clica em mim pra jogar!', 'Duas pessoas é mais legal!'], ['Play with me!', 'Come play!', 'Click me to play!', "It's better with two!"], 0.8],
  versusStart: [['Vamos ver quem ganha!', 'Use as setas!', 'Não vou pegar leve!'], ["Let's see who wins!", 'Use the arrow keys!', "I won't go easy!"], 1],
  versusEnd: [(d) => [d.pet > d.player ? 'Ganhei! Hehe!' : d.pet < d.player ? 'Você ganhou... revanche!' : 'Empate!'], (d) => [d.pet > d.player ? 'I won! Hehe!' : d.pet < d.player ? 'You won... rematch!' : "It's a tie!"], 1],
  swordSwing: [['Hah!', 'Toma!', 'Iaaah!', 'Hyah!'], ['Hah!', 'Take that!', 'Hiyaa!', 'Hyah!'], 0.12],
  leave: [['Adeus...', 'Vou embora...', 'Você nunca ligou pra mim...'], ['Goodbye...', "I'm leaving...", 'You never cared about me...'], 1],
  activity: [(d) => (d.kind === 'jam' ? ['Música!', 'Vamos dançar!', 'Essa é boa!'] : ['O que vamos ver?', 'Pipoca!', 'Shhh, começou!']), (d) => (d.kind === 'jam' ? ['Music!', "Let's dance!", 'This one is good!'] : ['What are we watching?', 'Popcorn!', 'Shh, it started!']), 0.6],
  activityTired: [['Cansei, vou parar...', 'Preciso de uma pausa.'], ["I'm tired, I'll stop...", 'I need a break.'], 1],
  react: [(d) => ({ scare: ['AAAH!', 'Que medo!', 'Nããão!'], laugh: ['Hahaha!', 'Kkkkk!', 'Muito bom!'], tense: ['Uou...', 'E agora?!', 'Tô nervosa!'], sad: ['Que triste...', '*funga*', 'Snif...'] }[d.kind] || ['Uau!']), (d) => ({ scare: ['AAAH!', 'So scary!', 'Nooo!'], laugh: ['Hahaha!', 'LOL!', 'So funny!'], tense: ['Whoa...', 'What now?!', "I'm nervous!"], sad: ['So sad...', '*sniff*', 'Sniff...'] }[d.kind] || ['Wow!']), 0.6],
  toyRefuse: [['Agora não...', 'Não quero.', 'Hmph!'], ['Not now...', "I don't want to.", 'Hmph!'], 1],
  toyAccept: [['Oba!', 'Eba, vamos!'], ['Yay!', "Let's go!"], 0.6],
  sing: [['Lá lá lá~', '♪ Do ré mi ♪', 'Tra lá lá!'], ['La la la~', '♪ Do re mi ♪', 'Tra la la!'], 0.5],
  mood: [(d) => (d.hunger < 30 ? ['Tô com fome...', 'Minha barriga tá roncando...'] : d.thirst < 30 ? ['Que sede...', 'Água, por favor...'] : d.energy < 25 ? ['Tô com sono...', '*boceja*'] : d.mood < 25 ? ['Tô triste...', 'Ninguém brinca comigo...'] : []),
    (d) => (d.hunger < 30 ? ["I'm hungry...", 'My tummy is rumbling...'] : d.thirst < 30 ? ["I'm thirsty...", 'Water, please...'] : d.energy < 25 ? ["I'm sleepy...", '*yawns*'] : d.mood < 25 ? ["I'm sad...", 'Nobody plays with me...'] : []), 0.6],
  request: [(d) => [{ food: `Quero ${d.name || 'comida'}!`, drink: `Quero ${d.name || 'beber algo'}!`, pat: 'Faz cafuné?', play: 'Vamos brincar?' }[d.kind]],
    (d) => [{ food: `I want ${d.name || 'food'}!`, drink: `I want ${d.name || 'a drink'}!`, pat: 'Pet me?', play: "Let's play?" }[d.kind]], 1],
};

// Random chatter while idle; {name} is the player's name if the pet knows it.
const CHATTER = [
  ['Que dia bonito!', 'Hmm hm hmm~', 'O que você tá fazendo?', 'Tô de olho em você, {name}!', 'Será que tem lanche?', 'Você trabalha muito, {name}.', 'Vamos brincar depois?', 'Eu gosto daqui.', 'Esse cursor é rápido...', 'Já bebeu água hoje?', 'Lembra de descansar os olhos!', 'Sabia que eu sei jogar Tetris?', 'Queria uma cama nova...', 'Hoje eu tô animada!', 'Psiu! Oi!', 'Que janela grande...', 'Tô entediada...', 'Você é legal, {name}.'],
  ['What a nice day!', 'Hmm hm hmm~', 'What are you doing?', "I'm watching you, {name}!", 'Is there any snack?', 'You work a lot, {name}.', "Let's play later?", 'I like it here.', 'That cursor is fast...', 'Did you drink water today?', 'Remember to rest your eyes!', 'Did you know I can play Tetris?', 'I wish I had a new bed...', "I'm excited today!", 'Psst! Hi!', 'What a big window...', "I'm bored...", "You're nice, {name}."],
];

// More lines for the plain-list events above, and events that only have lines here.
const MORE = {
  bought: [['Nossa, é tudo meu?', 'Vou cuidar direitinho!', 'Mal posso esperar pra abrir!', 'Você me mima demais!', 'Chegou encomenda!', 'Que surpresa boa!'],
    ['Wow, is it all mine?', "I'll take good care of it!", "I can't wait to open it!", 'You spoil me!', 'A package arrived!', 'What a nice surprise!']],
  requestDone: [['Exatamente o que eu queria!', 'Você é o melhor!', 'Agora sim!', 'Prometo não pedir mais... hoje.'], ['Exactly what I wanted!', "You're the best!", "Now we're talking!", "I promise not to ask again... today."]],
  ballFetch: [['Mais uma!', 'Quase peguei!', 'Sou rápida, né?', 'Joga alto!', 'Essa eu pego!'], ['One more!', 'Almost got it!', "I'm fast, right?", 'Throw it high!', "I'll get this one!"]],
  slap: [['Ei, que isso?!', 'Vou lembrar disso...', 'Snif... por quê?', 'Isso doeu de verdade!', 'Hmph! Não falo mais com você!'], ['Hey, what was that?!', "I'll remember this...", 'Sniff... why?', 'That really hurt!', "Hmph! I'm not talking to you!"]],
  patAngry: [['Vai me deixar careca!', 'Tá bom, já chega!', 'Ai, meu penteado!'], ["You'll make me bald!", 'Okay, that’s enough!', 'My hairdo!']],
  pet: [['Hihi, faz cócegas!', 'Continua...', 'Mmm~', 'Você tem mãos mágicas!', 'Fico feliz assim~', 'Aaah, que bom...'], ['Hihi, it tickles!', 'Keep going...', 'Mmm~', 'You have magic hands!', 'This makes me happy~', 'Aaah, so nice...']],
  wake: [['Que horas são?', 'Sonhei com bolo...', 'Mais cinco minutinhos...', 'Acordei! Senti saudade.', 'Recarregada!'], ['What time is it?', 'I dreamed about cake...', 'Five more minutes...', 'I’m up! I missed you.', 'Fully recharged!']],
  toyBroke: [['Eu nem fiz força!', 'Será que tem conserto?', 'Buááá!'], ["I didn't even push it!", 'Can it be fixed?', 'Waaah!']],
  toyRepaired: [['Você conserta tudo!', 'Eba, voltou a funcionar!', 'Vou tomar mais cuidado!'], ['You fix everything!', 'Yay, it works again!', "I'll be more careful!"]],
  chaseStart: [['Lá vou eu!', 'Prepare-se!', 'Esse cursor é meu!', 'Hora da caçada!'], ['Here I come!', 'Get ready!', 'That cursor is mine!', 'Hunting time!']],
  qteStart: [['Não solto mais!', 'Peguei, peguei!', 'Agora é minha!'], ["I won't let go!", 'Got it, got it!', "It's mine now!"]],
  chaseTrip: [['Esse chão é escorregadio!', 'Ninguém viu isso, tá?'], ['This floor is slippery!', 'Nobody saw that, okay?']],
  hookFire: [['Lá em cima!', 'Segura firme!'], ['Up there!', 'Hold tight!']],
  gameExcite: [['Combo!', 'Tô on fire!', 'Ninguém me para!', 'Fácil demais!', 'Olha isso!'], ['Combo!', "I'm on fire!", 'Nobody can stop me!', 'Too easy!', 'Look at that!']],
  wantPlay: [['Pega o outro controle!', 'Duvido você me vencer!', 'Só uma partidinha?'], ['Grab the other controller!', 'Bet you can’t beat me!', 'Just one round?']],
  versusStart: [['Valendo!', 'Preparado?', 'Que vença a melhor!'], ["Let's go!", 'Ready?', 'May the best one win!']],
  swordSwing: [['Kiai!', 'Defenda-se!', 'Corte giratório!'], ['Kiai!', 'Defend yourself!', 'Spin slash!']],
  toyRefuse: [['Tô sem vontade.', 'Depois, tá?', 'Me deixa quieta um pouco.', 'Não tô no clima.'], ["I don't feel like it.", 'Later, okay?', 'Leave me alone for a bit.', "I'm not in the mood."]],
  toyAccept: [['Adoro esse!', 'Vamos nessa!', 'Esse é meu favorito!', 'Valeu!'], ['I love this one!', "Let's do it!", 'This is my favorite!', 'Thanks!']],
  sing: [['♪ La la lu ♪', 'Hmm hmm hmm~', '♪ Brilha, brilha, estrelinha ♪', 'Dó, ré, mi, fá, sol~'], ['♪ La la lu ♪', 'Hmm hmm hmm~', '♪ Twinkle, twinkle ♪', 'Do, re, mi, fa, so~']],
  // Events with lines only here: [pt, en, probability].
  ate: [(d) => (d.drink ? ['Ahh, refrescante!', 'Matou a sede!', 'Gelado!', 'Glub glub~'] : ['Delícia!', 'Hmm, que gostoso!', 'Nham nham~', 'Barriga cheia!', 'Tava com fome mesmo!']),
    (d) => (d.drink ? ['Ahh, refreshing!', 'That hit the spot!', 'So cold!', 'Glug glug~'] : ['Delicious!', 'Mmm, so good!', 'Nom nom~', 'Full tummy!', 'I was really hungry!']), 0.35],
  grab: [['Ei! Me põe no chão!', 'Uau, que alto!', 'Pra onde vamos?', 'Cuidado comigo!', 'Wheee!'], ['Hey! Put me down!', 'Wow, so high!', 'Where are we going?', 'Careful with me!', 'Wheee!'], 0.3],
  release: [(d) => (d.speed > 12 ? ['Aaaaah!', 'Eu vou voaaar!', 'Nãããão!'] : ['Ufa, chão!', 'Obrigada pela carona!']), (d) => (d.speed > 12 ? ['Aaaaah!', "I'm flyiiing!", 'Nooooo!'] : ['Phew, ground!', 'Thanks for the ride!']), 0.4],
  hardLand: [(d) => (d.thrown ? ['Ai, minhas costas...', 'Isso não teve graça!', 'Tô vendo estrelas...'] : ['Ui!', 'Pousei mal...']), (d) => (d.thrown ? ['Ow, my back...', 'That was not funny!', "I'm seeing stars..."] : ['Oof!', 'Bad landing...']), 0.6],
  readManga: [(d) => ({ aventura: ['Que batalha épica!', 'Quero viver uma aventura assim!', 'O herói vai conseguir?'], romance: ['Aaah, eles vão ficar juntos!', 'Que fofo...', 'Meu coração!'], terror: ['Não abre essa porta!', 'Por que eu leio isso...', 'Tô com medo, mas não paro!'], comedia: ['Hahaha, que idiota!', 'Kkkk, não aguento!', 'Esse capítulo é demais!'] }[d.manga?.genre] || ['Que história boa!']),
    (d) => ({ aventura: ['What an epic battle!', 'I want an adventure like that!', 'Will the hero make it?'], romance: ["Aaah, they'll end up together!", 'So cute...', 'My heart!'], terror: ["Don't open that door!", 'Why do I read this...', "I'm scared but I can't stop!"], comedia: ['Hahaha, what an idiot!', "LOL, I can't!", 'This chapter is great!'] }[d.manga?.genre] || ['What a good story!']), 0.5],
  chaseEnd: [(d) => (d.caught ? ['Ganhei! Sou a mais rápida!', 'Hehe, foi fácil!'] : ['Você é rápido demais...', 'Ufa, cansei!', 'Da próxima eu pego!']), (d) => (d.caught ? ["I won! I'm the fastest!", 'Hehe, that was easy!'] : ["You're too fast...", "Phew, I'm tired!", "I'll get you next time!"]), 0.8],
  qteEscape: [['Ei, volta aqui!', 'Escorregou!', 'Não vale!'], ['Hey, come back!', 'It slipped!', 'No fair!'], 0.7],
  dollAlive: [['O Doll... se mexeu?!', 'Ele tá vivo! Que mágico!', 'Oi, Doll! Bem-vindo!'], ['The Doll... moved?!', "He's alive! So magical!", 'Hi, Doll! Welcome!'], 1],
  antic: [(d) => ({ stretch: ['Aaah... que espreguiçada boa!', '*boceja*', 'Hmmm, alongar é bom!'], hops: ['Eba!', 'Yay!', 'Tô feliz!'], twirl: ['Wiii!', 'Rodopio!'], look: ['Hmm?', 'O que foi isso?', 'Ouvi alguma coisa...'], trip: ['Ai!', 'Tropecei...', 'Ninguém viu, né?'], doze: ['Zzz...', 'Só... um... minutinho...'], balance: ['Olha, sem cair!', 'Equilíbrio perfeito!'], squats: ['Hora do exercício!', 'Um, dois, um, dois!'], hum: ['La la la~', 'Hmm hm hmm~'], shadowbox: ['Treino de luta!'], butterfly: ['Uma borboleta!', 'Que linda!'], pant: ['Ufa... cansei!', 'Preciso... de... ar...', 'Que suadeira!'], yawn: ['Aaaahhh... que sono...', 'Tô quase dormindo em pé...'] }[d.kind] || []),
    (d) => ({ stretch: ['Aaah... nice stretch!', '*yawn*'], hops: ['Yay!', "I'm happy!"], twirl: ['Wheee!'], look: ['Hmm?', 'What was that?'], trip: ['Ouch!', 'I tripped...', 'Nobody saw that, right?'], doze: ['Zzz...', 'Just... one... minute...'], balance: ["Look, I won't fall!"], squats: ['Workout time!', 'One, two!'], hum: ['La la la~'], shadowbox: ['Fight training!'], butterfly: ['A butterfly!', 'So pretty!'], pant: ["Phew... I'm beat!", 'Need... some... air...', "I'm all sweaty!"], yawn: ['Aaaahhh... so sleepy...', "I'm falling asleep standing..."] }[d.kind] || []), 0.45],
  dollWake: [['Bom dia, Doll!', 'Acordou, dorminhoco!', 'Que brilho! Oi de novo, Doll!'], ['Good morning, Doll!', 'Up already, sleepyhead?', 'So shiny! Hi again, Doll!'], 0.9],
  dollJoin: [['Quer jogar? Pega o controle 2!', 'Doll, vem ser o player 2!', 'Vou acabar com você, Doll!'], ['Wanna play? Grab controller 2!', 'Doll, be player 2!', "I'll crush you, Doll!"], 0.9],
  dollGameEnd: [(d) => (d.won ? ['Ganhei do Doll!', 'Hehe, treina mais, Doll!', 'Mais uma?'] : d.tie ? ['Empate! Justo.', 'Ninguém ganhou!'] : ['O Doll me venceu?!', 'Como ele é bom nisso?!', 'Revanche!']),
    (d) => (d.won ? ['I beat the Doll!', 'Hehe, practice more, Doll!', 'One more?'] : d.tie ? ["A tie! Fair.", 'Nobody won!'] : ['The Doll beat me?!', "How is he so good?!", 'Rematch!']), 0.9],
  dollRead: [['Lendo junto comigo, Doll?', 'Essa parte é a melhor, Doll!', 'Não dá spoiler, hein!'], ['Reading with me, Doll?', 'This part is the best, Doll!', 'No spoilers, ok?'], 0.8],
  dollHug: [['Abraço de Doll!', 'Você é o meu boneco favorito!', 'Fofinho!', 'Vem cá, Doll!'], ['Doll hug!', "You're my favorite doll!", 'So cute!', 'Come here, Doll!'], 0.8],
  dollPlay: [(d) => ({ pega: ['Tá com você, Doll!', 'Vou te pegar!', 'Corre, Doll!'], corrida: ['Valendo! 3, 2, 1...', 'Vou ganhar essa corrida!'], esconde: ['1, 2, 3... Lá vou eu!', 'Esconde direitinho, Doll!'], bola: ['Chuta pra mim, Doll!', 'Golaço!', 'Toma, Doll!'] }[d.kind] || ['Vamos brincar, Doll!']),
    (d) => ({ pega: ["You're it, Doll!", "I'll get you!", 'Run, Doll!'], corrida: ['Ready! 3, 2, 1...', "I'll win this race!"], esconde: ['1, 2, 3... Here I come!', 'Hide well, Doll!'], bola: ['Kick it to me, Doll!', 'Goal!', 'Here, Doll!'] }[d.kind] || ["Let's play, Doll!"]), 0.9],
  dollWin: [(d) => (d.won ? ['Ganhei!', 'Hehe, sou demais!', 'Vitória!'] : ['Ah, o Doll ganhou...', 'Ele é rápido!', 'Da próxima eu ganho!']), (d) => (d.won ? ['I won!', "Hehe, I'm awesome!", 'Victory!'] : ['Aw, the Doll won...', "He's fast!", "I'll win next time!"]), 1],
  dollFound: [['Achei você, Doll!', 'Te achei!', 'Sabia que tava aí!'], ['Found you, Doll!', 'Got you!', 'I knew you were there!'], 1],
  gameRage: [['Aaargh! Roubado!', 'Esse chefe é impossível!', 'Não acredito que perdi!', 'O controle travou!'], ['Aaargh! Cheater!', 'This boss is impossible!', "Can't believe I lost!", 'The controller froze!'], 0.6],
  gachaKick: [['Emperrou?! Toma!', 'Vamos lá, máquina!', 'Hmpf! Solta isso!'], ['Stuck?! Take that!', 'Come on, machine!', 'Hmpf! Let it go!'], 1],
  vendStart: [(d) => (d.item ? [`Vou pegar ${d.item.name}!`, 'Hora de um lanchinho!', 'Com o meu dinheirinho!'] : ['Hmm...']), (d) => (d.item ? [`I'll get ${d.item.name}!`, 'Snack time!', 'With my own money!'] : ['Hmm...']), 0.6],
  vendBuy: [(d) => [`${d.item?.name || 'Isso'}! Que delícia!`, 'Comprei sozinha!', 'Itadakimasu!'], (d) => [`${d.item?.name || 'This'}! Yummy!`, 'I bought it myself!', 'Itadakimasu!'], 0.7],
  vendBroke: [['Sem moedas... 😢', 'Minha carteira tá vazia...', 'Não dá pra comprar nada...', 'Me dá uns trocados?'], ['No coins... 😢', 'My wallet is empty...', "I can't buy anything...", 'Spare some coins?'], 1],
  vendStuck: [['Ei! Emperrou!', 'Devolve meu lanche!', 'Cai, cai!'], ['Hey! It got stuck!', 'Give me my snack!', 'Fall, fall!'], 1],
  vendLucky: [['7777! Ganhei outro!', 'Que sorte! Mais um!'], ['7777! I won another one!', 'Lucky! One more!'], 1],
  dollBoo: [['Kyaa! Que susto, Doll!', 'Doll! Você me assustou!', 'Aaah! Não faz isso!'], ['Eek! You scared me, Doll!', 'Doll! You startled me!', "Aaah! Don't do that!"], 1],
  refuse: [(d) => ({ thirst: ['Preciso de água primeiro...', 'Tô com a garganta seca, me dá uma água?', 'Sem água eu não brinco...'], hunger: ['Tô fraca de fome... me dá um lanche?', 'Primeiro comida, depois brincadeira!'], energy: ['Tô sem forças...', 'Cansei... deixa eu descansar um pouco.', 'Não aguento mais, preciso dormir...'] }[d.why] || ['Agora não...']),
    (d) => ({ thirst: ['I need water first...', 'My throat is dry, some water?', 'No water, no play...'], hunger: ["I'm weak with hunger... a snack?", 'Food first, then play!'], energy: ["I've got no energy...", "I'm tired... let me rest a bit.", "I can't anymore, I need sleep..."] }[d.why] || ['Not now...']), 1],
  bath: [(d) => (d.tub ? ['Hora do banho de espuma!', 'Banheira quentinha!', 'Bolhas!'] : ['Banho? Tá bom...', 'Esfrega atrás da orelha!', 'Hihi, faz cócegas!']),
    (d) => (d.tub ? ['Bubble bath time!', 'Nice warm tub!', 'Bubbles!'] : ['A bath? Okay...', 'Scrub behind my ears!', 'Hehe, it tickles!']), 0.9],
  bathEnd: [['Cheirosa!', 'Limpinha de novo!', 'Ahh, que refrescante!', 'Agora sim!'], ['All fresh!', 'Squeaky clean!', 'Ahh, so refreshing!', 'Much better!'], 0.9],
  dollSearch: [['Hmm... aqui não.', 'Cadê o Doll?', 'Onde ele se meteu?', 'Doll? Dooll?'], ['Hmm... not here.', "Where's the Doll?", 'Where did he go?', 'Doll? Dooll?'], 0.9],
  desktopGame: [(d) => [`Olha! ${d.name}! Vamos jogar?`, `Achei ${d.name}! Bora?`, `Que tal uma partida de ${d.name}?`],
    (d) => [`Look! ${d.name}! Let's play?`, `Found ${d.name}! Shall we?`, `How about some ${d.name}?`], 1],
  lootOpen: [['Uma caixa! O que será?', 'Vamos ver, vamos ver!', 'Tomara que seja raro!', 'Sacode, sacode...'], ['A box! What could it be?', "Let's see, let's see!", 'I hope it is rare!', 'Shake, shake...'], 1],
  lootPrize: [(d) => ({ comum: ['Legal!', 'Serve!', 'Oba!'], incomum: ['Ooh, bom!', 'Gostei disso!'], raro: ['RARO! Uau!', 'Que sorte!!'], lendario: ['LENDÁRIO?!', 'Não acredito!!!', 'É o melhor dia da minha vida!'] }[d.rarity] || ['Oba!']),
    (d) => ({ comum: ['Nice!', "That'll do!", 'Yay!'], incomum: ['Ooh, good!', 'I like this!'], raro: ['RARE! Wow!', 'So lucky!!'], lendario: ['LEGENDARY?!', "I can't believe it!!!", 'Best day of my life!'] }[d.rarity] || ['Yay!']), 1],
  walletGift: [(d) => (d.k < 0.4 ? ['De novo? Hehe, obrigada!', 'Assim você me mima demais...', 'Mais moedinhas?'] : d.n >= 100 ? ['Tudo isso pra mim?!', 'Uau! Vou guardar direitinho!', 'Você é o melhor!'] : ['Obrigada pela mesada!', 'Eba, moedinhas!', 'Vou gastar com sabedoria... talvez.']),
    (d) => (d.k < 0.4 ? ['Again? Hehe, thanks!', 'You spoil me too much...', 'More coins?'] : d.n >= 100 ? ['All of that for me?!', "Wow! I'll keep it safe!", "You're the best!"] : ['Thanks for the allowance!', 'Yay, coins!', "I'll spend them wisely... maybe."]), 1],
  gachaStart: [['Vamos ver o que sai!', 'Gira, gira!', 'Tomara que seja raro!', 'Vem, cápsula boa!'], ["Let's see what comes out!", 'Spin, spin!', 'I hope it is rare!', 'Come on, good capsule!'], 0.7],
  gachaPrize: [(d) => (d.quiet ? [] : d.dupe ? ['Repetido... virou moedas pra você.', 'Esse eu já tinha!'] : { comum: ['Ah... comum.', 'Hmpf, de novo isso?', 'Que sem graça...'], incomum: ['Oba, incomum!', 'Gostei!', 'Nada mal!'], raro: ['RARO! Uhuul!', 'Que sorte!!', 'Olha isso!'], epico: ['ÉPICO?!?!', 'NÃO ACREDITO!!!', 'É o melhor dia da minha vida!'] }[d.rarity] || ['Oba!']),
    (d) => (d.quiet ? [] : d.dupe ? ['A duplicate... turned into coins for you.', 'I already had this one!'] : { comum: ['Oh... common.', 'Hmph, this again?', 'How boring...'], incomum: ['Yay, uncommon!', 'I like it!', 'Not bad!'], raro: ['RARE! Woohoo!', 'So lucky!!', 'Look at this!'], epico: ['EPIC?!?!', "I CAN'T BELIEVE IT!!!", 'Best day of my life!'] }[d.rarity] || ['Yay!']), 1],
  slotStart: [['Hoje é meu dia de sorte!', 'Só uma rodadinha...', 'Vem, sete!'], ['Today is my lucky day!', 'Just one little spin...', 'Come on, seven!'], 0.6],
  slotWin: [(d) => (d.mult >= 100 ? ['JACKPOT!!!', 'SETE, SETE, SETE!!!'] : d.mult >= 20 ? ['Choveu moeda!', 'Ganhei muito!'] : ['Ganhei!', 'Hehe, lucro pra você!']),
    (d) => (d.mult >= 100 ? ['JACKPOT!!!', 'SEVEN, SEVEN, SEVEN!!!'] : d.mult >= 20 ? ["It's raining coins!", 'I won big!'] : ['I won!', 'Hehe, profit for you!']), 0.7],
  slotLose: [(d) => (d.streak >= 3 ? ['Essa máquina tá roubando!', 'Não é possível...', 'Mais uma e eu paro...'] : ['Quase!', 'Ah, não...', 'Próxima!']),
    (d) => (d.streak >= 3 ? ['This machine is cheating!', 'No way...', 'One more and I stop...'] : ['Almost!', 'Oh, no...', 'Next one!']), 0.35],
  slotEnd: [(d) => (d.net > 0 ? ['Saímos no lucro!', 'Hoje eu tô com sorte!'] : d.net < 0 ? ['Chega de jogo por hoje.', 'Perdi um pouquinho...'] : ['Empatei!']),
    (d) => (d.net > 0 ? ['We came out ahead!', "I'm lucky today!"] : d.net < 0 ? ['Enough gambling for today.', 'I lost a little...'] : ['Broke even!']), 0.5],
  figurePlay: [(d) => [`Meu boneco: ${d.figure?.name || ''}!`, 'Olha que lindo!', 'Minha coleção!'], (d) => [`My figure: ${d.figure?.name || ''}!`, 'Look how cute!', 'My collection!'], 0.4],
  achievement: [['Conquista! Eba!', 'Somos demais!', 'Olha só isso!', 'Mais um troféu!'], ['Achievement! Yay!', "We're awesome!", 'Look at that!', 'Another trophy!'], 1],
  missionDone: [['Missão cumprida!', 'Feito!', 'Mais uma!'], ['Mission complete!', 'Done!', 'One more!'], 0.8],
  fortune: [(d) => [d.text], (d) => [d.text], 1],
  printed: [(d) => [`${d.item?.name || 'Isso'} ficou pronto!`, 'Saiu quentinho da impressora!', 'Já vou pegar!', 'Impresso!'], (d) => [`${d.item?.name || 'It'} is ready!`, 'Fresh out of the printer!', 'Coming to get it!', 'Printed!'], 0.7],
  desktopCurious: [['Hm? O que é aquilo?', 'Ei... aquele ícone ali!', 'Opa, o que temos aqui?', 'Hmm, conheço esse ícone...'], ['Hm? What is that?', 'Hey... that icon there!', 'Ooh, what do we have here?', 'Hmm, I know that icon...'], 1],
  desktopGrab: [['Peguei!', 'Vem cá, joguinho!', 'Hehe, achei!'], ['Got it!', 'Come here, little game!', 'Hehe, found it!'], 1],
  desktopGameNo: [['Tá bom... outra hora.', 'Aww... depois então!', 'Vou guardar de volta.'], ['Okay... some other time.', 'Aww... later then!', "I'll put it back."], 1],
  winOpen: [['Abriu uma janela nova!', 'O que é isso aí?', 'Ooh, o que você vai fazer?', 'Mais uma janela!', 'Deixa eu ver!'], ['A new window!', "What's that?", 'Ooh, what are you doing?', 'Another window!', 'Let me see!'], 1],
  winMax: [['Uau, tela inteira!', 'Trabalhando sério, hein?', 'Essa janela é enorme!'], ['Whoa, full screen!', 'Serious work, huh?', 'That window is huge!'], 1],
  winClose: [['Tchau, janela!', 'Fechou! Menos bagunça.', 'Uma a menos!', 'Já terminou aí?'], ['Bye, window!', 'Closed! Less mess.', 'One less!', 'Done with that one?'], 1],
  winDrag: [['Cuidado com essa janela!', 'Pra onde ela vai?', 'Uou, tá voando!', 'Arrumando a casa?'], ['Careful with that window!', 'Where is it going?', "Whoa, it's flying!", 'Tidying up?'], 1],
  winRide: [['Uhuuul!', 'Que passeio!', 'Mais rápido!', 'Segura que eu tô em cima!', 'Wheee!'], ['Woohoo!', 'What a ride!', 'Faster!', "Careful, I'm on it!", 'Wheee!'], 0.8],
  manyWindows: [['Quanta janela aberta!', 'Tá uma bagunça isso aqui...', 'Você usa tudo isso ao mesmo tempo?', 'Me perdi no meio das janelas!'], ['So many windows!', "It's a mess in here...", 'Do you use all of these at once?', "I'm lost among the windows!"], 1],
  emptyDesktop: [['Desktop limpinho!', 'Que espaço! Dá pra correr!', 'Só eu e você agora!'], ['Clean desktop!', 'So much room! I can run!', 'Just you and me now!'], 1],
  playerAway: [['Você tá aí?', 'Foi tomar um café?', 'Vou esperar aqui...', 'Alôô? Cadê você?'], ['Are you there?', 'Getting a coffee?', "I'll wait here...", 'Hellooo? Where are you?'], 1],
  playerBack: [['Você voltou!', 'Senti sua falta!', 'Ebaa, você tá de volta!', 'Finalmente!'], ["You're back!", 'I missed you!', "Yay, you're back!", 'Finally!'], 1],
  cursorFast: [['Calma com esse mouse!', 'Tô ficando tonta!', 'Que pressa é essa?', 'Uou, que rápido!'], ['Easy with that mouse!', "I'm getting dizzy!", "What's the rush?", 'Whoa, so fast!'], 1],
  cursorHover: [['Tá me olhando?', 'Oi, mouse!', 'Quer fazer cafuné?', 'Hehe, tô vendo você aí!'], ['Looking at me?', 'Hi, mouse!', 'Want to give me a pat?', 'Hehe, I see you there!'], 1],
  desktopGamePlay: [['Ebaa! Vamos!', 'Boa escolha!', 'Eu torço por você!'], ['Yay! Let\'s go!', 'Good choice!', "I'll cheer for you!"], 1],
  ixAttention: [['Ei! Ei! Aqui!', 'Toc toc! Tem alguém aí?', 'Olha pra mim!', 'Você esqueceu de mim?', 'Psiu! Me dá atenção!'], ['Hey! Hey! Over here!', "Knock knock! Anyone there?", 'Look at me!', 'Did you forget about me?', 'Psst! Pay attention to me!'], 1],
  ixAttentionYes: [['Eba, você me viu!', 'Finalmente!', 'Hehe, oi!', 'Senti sua falta!'], ['Yay, you saw me!', 'Finally!', 'Hehe, hi!', 'I missed you!'], 1],
  ixAttentionNo: [['Hmpf... tá ocupado, né?', 'Tudo bem... eu espero.', 'Ninguém me ouve...'], ["Hmph... you're busy, huh?", "It's fine... I'll wait.", 'Nobody listens to me...'], 1],
  ixStealGo: [['Hehehe...', 'Que cursor bonito...', '*olhar travesso*'], ['Hehehe...', 'What a nice cursor...', '*mischievous look*'], 0.6],
  ixSteal: [['Peguei! É meu agora!', 'Esse cursor é meu!', 'Pega-pega ao contrário!', 'Vem comigo!'], ['Got it! Mine now!', 'This cursor is mine!', 'Reverse tag!', 'Come with me!'], 1],
  ixStealEnd: [['Tá bom, toma de volta!', 'Hehe, só um passeio!', 'Pode usar, valeu!'], ['Okay, have it back!', 'Hehe, just a little ride!', 'You can use it, thanks!'], 1],
  ixStealYank: [['Ei! Que força!', 'Escapou!', 'Malvado, eu tava brincando!'], ['Hey! So strong!', 'It got away!', 'Meanie, I was playing!'], 1],
  ixStealMiss: [['Ué, cadê?', 'Fugiu...'], ['Huh, where did it go?', 'It ran away...'], 0.6],
  ixPause: [(d) => (d.kind === 'water' ? [`Já faz ${d.mins} minutos! Bebe uma água comigo?`, 'Hora da água! Hidrata aí!', 'Um golinho de água, vai!'] : [`${d.mins} minutos sentado! Vamos alongar?`, 'Pausa! Estica os braços comigo!', 'Alonga aí, um, dois, três!']),
    (d) => (d.kind === 'water' ? [`It's been ${d.mins} minutes! Drink some water with me?`, 'Water time! Stay hydrated!', 'A little sip of water, come on!'] : [`${d.mins} minutes sitting! Let's stretch?`, 'Break! Stretch your arms with me!', 'Stretch, one, two, three!']), 1],
  ixGiftFind: [['Hm? O que é isso no chão?', 'Olha o que eu achei!', 'Ooh, uma coisa brilhando!'], ["Hm? What's this on the floor?", 'Look what I found!', 'Ooh, something shiny!'], 1],
  ixGift: [['É pra você! 🎁', 'Um presente! Abre no inventário!', 'Achei isso e lembrei de você!'], ["It's for you! 🎁", 'A present! Open it in the inventory!', 'I found this and thought of you!'], 1],
  ixPerchGo: [['Vou subir ali!', 'Que janela legal...', 'Lá em cima deve ter uma vista boa!'], ["I'm going up there!", 'Nice window...', 'The view must be great up there!'], 0.7],
  ixPerch: [['Que vista!', 'Daqui eu vejo tudo!', 'Lá lá lá~ *balança as pernas*', 'Trabalha aí, eu fico de olho!'], ['What a view!', 'I can see everything from here!', 'La la la~ *swings legs*', "You work, I'll keep watch!"], 0.8],
  ixPerchFall: [['Aaaah! Avisa antes!', 'Ei! Eu tava sentada aí!', 'Uaaa!'], ["Aaah! Warn me first!", 'Hey! I was sitting there!', 'Whoaaa!'], 1],
  ixDance: [['Essa música é boa!', 'Não consigo ficar parada!', 'Dança comigo!'], ['This song is good!', "I can't stand still!", 'Dance with me!'], 1],
  ixLoud: [['Tá muito alto!', 'Meus ouvidos!', 'Abaixa um pouquinho?'], ["It's too loud!", 'My ears!', 'Turn it down a little?'], 1],
  ixStack: [(d) => [`${d.n} ícones! Vou fazer uma torre!`, 'Torre de ícones!', 'Empilha, empilha...'], (d) => [`${d.n} icons! I'll build a tower!`, 'Icon tower!', 'Stack, stack...'], 1],
  ixKick: [['Esse ícone parece uma bola...', 'Hora do futebol!', 'Vou chutar!'], ['That icon looks like a ball...', 'Soccer time!', "I'm gonna kick it!"], 1],
  ixKicked: [['Gooool!', 'Toma!', 'Voaaa!', 'Hehe, desculpa!'], ['Gooooal!', 'Take that!', 'Flyyy!', 'Hehe, sorry!'], 0.8],
  ixBinGo: [['Hora de jogar o lixo fora!', 'Vou ver a lixeira...', 'O que será que tem lá?'], ['Time to take out the trash!', "I'll check the bin...", "What's in there?"], 0.7],
  ixBin: [(d) => (d.dive ? ['Tem tanta coisa aqui dentro!', 'Que bagunça!', 'Achei um bilhete velho!'] : ['Cesta!', 'Três pontos!', 'No lixo!']), (d) => (d.dive ? ['So much stuff in here!', "What a mess!", 'Found an old note!'] : ['Swish!', 'Three points!', 'In the trash!']), 1],
  ixNudgeGo: [['Hmm...', '*olhar travesso*', 'Esse ícone tá torto...'], ['Hmm...', '*mischievous look*', 'That icon is crooked...'], 0.5],
  ixNudge: [['Hihihi! Mexi!', 'Kkkk, você viu?', 'Opa! Escorregou!', 'Ninguém viu nada!'], ['Hehehe! I moved it!', 'LOL, did you see?', 'Oops! It slipped!', 'Nobody saw anything!'], 1],
  ixNudgeBack: [['Brincadeira! Devolvi.', 'Pronto, no lugar!', 'Tá, tá, voltei ele.'], ['Just kidding! Put it back.', 'There, back in place!', 'Okay, okay, I put it back.'], 0.9],
  taste: [(d) => (d.first ? { love: ['Hmm! Que delícia! Virou minha favorita!', 'Amei isso! Quero mais!', 'Uau, que gostoso!'], like: ['Gostei disso!', 'Hmm, bom!', 'Que gostosinho!'], hate: ['Eca... detestei.', 'Blergh! Que gosto horrível...', 'Nunca mais quero isso...'], dislike: ['Hmm... não é muito a minha.', 'Meio sem graça...', 'Não curti muito.'], ok: ['Hmm, normal.', 'Nada mal!', 'Tá ok.', 'Comível!'] }[d.taste] : Math.random() > 0.4 ? [] : { love: ['Minha favorita! ♥', 'Isso é bom demais!'], like: ['Gosto disso!', 'Hmm, bom!'], dislike: ['De novo isso?', 'Tá... eu como.'], hate: ['Ugh... isso de novo?!', 'Eca... tá bom, eu como.'] }[d.taste] || []),
    (d) => (d.first ? { love: ['Mmm! So good! New favorite!', 'I love this! More!', 'Wow, tasty!'], like: ['I like this!', 'Mmm, good!', 'Pretty tasty!'], hate: ['Ew... I hate it.', 'Blergh! Awful taste...', 'Never again...'], dislike: ['Hmm... not really my thing.', 'Kind of bland...', 'Not a fan.'], ok: ['Hmm, normal.', 'Not bad!', "It's ok.", 'Edible!'] }[d.taste] : Math.random() > 0.4 ? [] : { love: ['My favorite! ♥', 'This is so good!'], like: ['I like this!', 'Mmm, good!'], dislike: ['This again?', 'Fine... I will eat it.'], hate: ['Ugh... this again?!', 'Ew... fine, I will eat it.'] }[d.taste] || []), 1],
};
for (const [k, [pt, en, p]] of Object.entries(MORE)) {
  const cur = LINES[k];
  if (cur && Array.isArray(cur[0]) && Array.isArray(pt)) {
    cur[0].push(...pt);
    cur[1].push(...en);
  } else if (!cur) LINES[k] = [pt, en, p ?? 0.4];
}
LINES.react = [(d) => ({ scare: ['AAAH!', 'Que medo!', 'Nããão!', 'Meu coração!', 'Desliga isso!', 'Eu não olhei!'], laugh: ['Hahaha!', 'Kkkkk!', 'Muito bom!', 'Tô chorando de rir!', 'Para, minha barriga!'], tense: ['Uou...', 'E agora?!', 'Tô nervosa!', 'Vai, vai, vai!', 'Não acredito!'], sad: ['Que triste...', '*funga*', 'Snif...', 'Não chora, não chora...', 'Por que fizeram isso?'] }[d.kind] || ['Uau!', 'Que isso?!']),
  (d) => ({ scare: ['AAAH!', 'So scary!', 'Nooo!', 'My heart!', 'Turn it off!', "I didn't look!"], laugh: ['Hahaha!', 'LOL!', 'So funny!', "I'm crying!", 'Stop, my tummy!'], tense: ['Whoa...', 'What now?!', "I'm nervous!", 'Go, go, go!', "I can't believe it!"], sad: ['So sad...', '*sniff*', 'Sniff...', "Don't cry, don't cry...", 'Why would they do that?'] }[d.kind] || ['Wow!', 'What?!']), 0.6];
// Toys from v1.21 (funtoys.js): 'fun' respects the chatter cooldown, 'funBig' always speaks.
const FUN_PT = (d) => ({
  yoyoFail: ['Ops! Enroscou...', 'Ai, deu nó!', 'Quase!'],
  yoyoLevel: [`Aprendi o ${d.trick || 'truque novo'}!`, 'Tô ficando boa nisso!', 'Subi de nível no ioiô!'],
  hoopRecord: [`Recorde! ${d.secs}s!`, 'Nunca girei tanto!', 'Olha esse quadril!'],
  hoopDrop: ['Caiu...', 'Ufa, cansei!', `${d.secs} segundos!`],
  kiteSnag: ['Ih, enroscou no ícone!', 'Solta, linha!', 'Ai não, a pipa!'],
  kiteFree: ['Soltou!', 'Voa, pipa!', 'Ufa!'],
  cubeSolved: d.record ? [`Recorde! ${d.secs}s!`, 'Sou um gênio!', 'Mais rápida que nunca!'] : ['Resolvi!', `${d.secs} segundos!`, 'Todas as cores no lugar!'],
  skateFall: ['Ai! Caí...', 'Meu joelho!', 'Preciso de um curativo...'],
  skateGrind: ['Grind!', 'Olha eu na janela!', 'Radical!'],
  fishFeed: ['Hora da papinha, peixinhos!', 'Comam, comam!', 'Olha eles vindo!'],
  tankClean: ['Aquário limpinho!', 'Agora dá pra ver os peixes!', 'Brilhando!'],
  tankDirty: ['A água do aquário tá turva...', 'Os peixes estão com fome...', 'Preciso cuidar do aquário.'],
  pianoStart: ['Vou tocar uma!', 'Lá lá lá~', 'Escuta essa!'],
  pianoPlayer: ['Que música bonita!', 'Toca mais!', 'Você toca bem!', 'Vamos fazer um dueto?'],
  trampBig: ['Agora vai ser alto!', 'Segura que eu vou longe!', 'Lá vou eu!'],
  trampWindow: ['Cheguei no topo!', 'Olha onde eu tô!', 'Que vista daqui!'],
  photoReady: ['Diga xis!', 'Sorria!', 'Fica paradinho...'],
  photo: ['Ficou linda!', 'Vai pro álbum!', 'Que foto boa!'],
  robotGo: ['Vai, robozinho!', 'Corre que eu te pego!', 'Bip bop!'],
  robotDoll: ['Cuidado com o Doll!', 'Hahaha, derrubou!', 'Strike!'],
  tamaHungry: ['Meu bichinho tá com fome!', 'Preciso cuidar do Tamagotchi!', 'Ele tá chorando...'],
  tamaHappy: ['Ele tá feliz!', 'Bichinho bem cuidado!', 'Que fofo!'],
}[d.kind] || []);
const FUN_EN = (d) => ({
  yoyoFail: ['Oops! Tangled...', 'Ugh, a knot!', 'Almost!'],
  yoyoLevel: ['I learned a new trick!', "I'm getting good at this!", 'Yo-yo level up!'],
  hoopRecord: [`Record! ${d.secs}s!`, 'Never spun this long!', 'Look at these hips!'],
  hoopDrop: ['It fell...', "Phew, I'm tired!", `${d.secs} seconds!`],
  kiteSnag: ['Oh no, it got caught on the icon!', 'Let go, string!', 'My kite!'],
  kiteFree: ["It's free!", 'Fly, kite!', 'Phew!'],
  cubeSolved: d.record ? [`Record! ${d.secs}s!`, "I'm a genius!", 'Faster than ever!'] : ['Solved it!', `${d.secs} seconds!`, 'All colors in place!'],
  skateFall: ['Ouch! I fell...', 'My knee!', 'I need a band-aid...'],
  skateGrind: ['Grind!', "Look, I'm on the window!", 'Rad!'],
  fishFeed: ['Dinner time, little fish!', 'Eat, eat!', "Here they come!"],
  tankClean: ['Clean tank!', 'Now I can see the fish!', 'Sparkling!'],
  tankDirty: ['The tank water is murky...', 'The fish are hungry...', 'I need to take care of the tank.'],
  pianoStart: ["I'll play one!", 'La la la~', 'Listen to this!'],
  pianoPlayer: ['What a pretty song!', 'Play more!', 'You play well!', 'Shall we do a duet?'],
  trampBig: ["This one's going high!", "Hold on, I'm going far!", 'Here I go!'],
  trampWindow: ['I made it to the top!', 'Look where I am!', 'What a view!'],
  photoReady: ['Say cheese!', 'Smile!', 'Hold still...'],
  photo: ['So pretty!', 'Into the album!', 'Nice shot!'],
  robotGo: ['Go, little robot!', "Run, I'll get you!", 'Beep boop!'],
  robotDoll: ['Watch out, Doll!', 'Hahaha, knocked it over!', 'Strike!'],
  tamaHungry: ['My little pet is hungry!', 'I need to care for the Tamagotchi!', "It's crying..."],
  tamaHappy: ["It's happy!", 'Well cared for!', 'So cute!'],
}[d.kind] || []);
LINES.fun = [FUN_PT, FUN_EN, 0.6];
LINES.funBig = [FUN_PT, FUN_EN, 1];
// The living Doll playing along with her toys (dollai.js).
LINES.dollToy = [(d) => ({
  piano: ['Dança, Doll!', 'Essa é pra você, Doll!', 'Olha o Doll dançando!'],
  kite: ['Segura firme, Doll!', 'Não solta a linha, Doll!', 'Você pilota agora!'],
  kiteBack: ['Obrigada, Doll!', 'Minha vez de novo!', 'Você é ótimo nisso!'],
  tramp: ['Pula comigo, Doll!', 'Mais alto, Doll!', 'Pula-pula a dois!'],
  skate: ['Olha essa, Doll!', 'Torce por mim, Doll!', 'Vou fazer uma manobra!'],
  cubeRace: ['Vamos ver quem resolve primeiro!', 'Valendo, Doll!', 'Não vale olhar o meu!'],
  cubeLose: ['O Doll foi mais rápido?!', 'Já?! Espera, Doll!', 'Revanche no cubo!'],
  cubeWin: ['Ganhei de você, Doll!', 'Primeiro lugar!', 'Treina mais, Doll!'],
  robot: ['Pega ele, Doll!', 'Corre, Doll!', 'Os dois atrás do robô!'],
  photo: ['Faz pose, Doll!', 'Olha a foto, Doll!', 'Sorria, Doll!'],
  sword: ['Em guarda, Doll!', 'Vamos treinar, Doll!', 'Defende essa!'],
}[d.kind] || []), (d) => ({
  piano: ['Dance, Doll!', "This one's for you, Doll!", 'Look at the Doll dancing!'],
  kite: ['Hold on tight, Doll!', "Don't let go of the string, Doll!", 'You fly it now!'],
  kiteBack: ['Thanks, Doll!', 'My turn again!', "You're great at this!"],
  tramp: ['Jump with me, Doll!', 'Higher, Doll!', 'Trampoline for two!'],
  skate: ['Watch this, Doll!', 'Cheer for me, Doll!', "I'll do a trick!"],
  cubeRace: ["Let's see who solves it first!", 'Go, Doll!', 'No peeking at mine!'],
  cubeLose: ['The Doll was faster?!', 'Already?! Wait, Doll!', 'Cube rematch!'],
  cubeWin: ['I beat you, Doll!', 'First place!', 'Practice more, Doll!'],
  robot: ['Get it, Doll!', 'Run, Doll!', 'Both of us after the robot!'],
  photo: ['Strike a pose, Doll!', 'Photo time, Doll!', 'Smile, Doll!'],
  sword: ['En garde, Doll!', "Let's train, Doll!", 'Block this!'],
}[d.kind] || []), 0.8];
LINES.activity = [(d) => (d.kind === 'jam' ? ['Música!', 'Vamos dançar!', 'Essa é boa!', 'Aumenta o som!', 'Que batida!', 'Hora da festa!'] : ['O que vamos ver?', 'Pipoca!', 'Shhh, começou!', 'Adoro assistir com você!', 'Será que é de terror?']),
  (d) => (d.kind === 'jam' ? ['Music!', "Let's dance!", 'This one is good!', 'Turn it up!', 'What a beat!', 'Party time!'] : ['What are we watching?', 'Popcorn!', 'Shh, it started!', 'I love watching with you!', 'Is it a horror one?']), 0.6];
LINES.mood = [(d) => (d.hunger < 30 ? ['Tô com fome...', 'Minha barriga tá roncando...', 'Tem alguma coisa pra comer?', 'Sonhando com um lanche...'] : d.thirst < 30 ? ['Que sede...', 'Água, por favor...', 'Minha garganta tá seca...'] : (d.hygiene ?? 100) < 25 ? ['Tô fedendo...', 'Preciso de um banho!', 'Eca, tô toda suada...', 'Até a mosca gostou de mim...'] : d.energy < 25 ? ['Tô com sono...', '*boceja*', 'Meus olhos estão fechando...', 'Preciso de uma soneca...'] : d.mood < 25 ? ['Tô triste...', 'Ninguém brinca comigo...', 'Que tédio...', 'Me dá atenção?'] : []),
  (d) => (d.hunger < 30 ? ["I'm hungry...", 'My tummy is rumbling...', 'Is there anything to eat?', 'Dreaming of a snack...'] : d.thirst < 30 ? ["I'm thirsty...", 'Water, please...', 'My throat is dry...'] : (d.hygiene ?? 100) < 25 ? ['I stink...', 'I need a bath!', "Ew, I'm all sweaty...", 'Even the fly likes me...'] : d.energy < 25 ? ["I'm sleepy...", '*yawns*', 'My eyes are closing...', 'I need a nap...'] : d.mood < 25 ? ["I'm sad...", 'Nobody plays with me...', "I'm so bored...", 'Pay attention to me?'] : []), 0.6];
CHATTER[0].push('Já reparou como o mouse é fofinho?', 'Se eu fosse um ícone, seria qual?', 'Vou arrumar a área de trabalho... mentira.', 'Tem muita aba aberta aí, hein?', 'Quero aprender a programar!', 'Será que a lixeira tem algo legal?', 'Eu cuido da tela enquanto você trabalha!', 'Hoje é um bom dia pra um minijogo!', 'Você salvou o arquivo? Salva!', 'Ctrl+S é meu atalho favorito.', 'Queria um gatinho...', 'Vamos dançar uma música?', 'O que tem pra janta?', 'Às vezes eu converso com o relógio.', 'Que barulho foi esse?', 'Tô pensando em mudar o visual...', 'Sabia que eu sei pescar?', 'Me chama pra brincar de esconde-esconde!', 'Respira fundo... e solta.', 'Você é minha pessoa favorita, {name}!', 'Bocejo... ops, desculpa.', 'Shh... tô contando os pixels.', 'Será que lá fora tá sol?', 'Uma pausa pro café?');
CHATTER[1].push('Ever noticed how cute the mouse is?', 'If I were an icon, which one would I be?', "I'll tidy up the desktop... just kidding.", 'So many tabs open, huh?', 'I want to learn to code!', "Is there anything cool in the trash bin?", "I'll watch the screen while you work!", "Today's a good day for a minigame!", 'Did you save the file? Save it!', 'Ctrl+S is my favorite shortcut.', 'I wish I had a kitten...', "Let's dance to a song?", "What's for dinner?", 'Sometimes I talk to the clock.', 'What was that noise?', "I'm thinking of a new look...", 'Did you know I can fish?', 'Ask me to play hide and seek!', 'Breathe in... and out.', "You're my favorite person, {name}!", 'Yawn... oops, sorry.', "Shh... I'm counting pixels.", 'Is it sunny outside?', 'Coffee break?');
// Chatter that depends on the time of day.
const TIME_LINES = [
  [[5, 12], ['Bom dia!', 'Já tomou café da manhã?', 'Manhã é hora de energia!', 'O sol acordou junto comigo!'], ['Good morning!', 'Had breakfast yet?', 'Mornings are for energy!', 'The sun woke up with me!']],
  [[12, 18], ['Boa tarde!', 'Já almoçou?', 'Que sono depois do almoço...', 'A tarde tá passando rápido!'], ['Good afternoon!', 'Did you have lunch?', 'So sleepy after lunch...', 'The afternoon is flying by!']],
  [[18, 24], ['Boa noite!', 'Já tá escuro lá fora?', 'Hora de relaxar um pouco.', 'Que tal um filme hoje?'], ['Good evening!', 'Is it dark outside already?', 'Time to relax a bit.', 'How about a movie tonight?']],
  [[0, 5], ['Ainda acordado?', 'Já é madrugada... vai dormir!', 'Tô com soninho...', 'Só as corujas estão acordadas agora.'], ['Still awake?', "It's so late... go to sleep!", "I'm sleepy...", 'Only owls are up now.']],
];

export class Speech {
  constructor(app) {
    this.app = app;
    this.el = document.createElement('div');
    this.el.className = 'speech';
    document.body.append(this.el);
    this.text = '';
    this.shown = 0;
    this.t = 0;
    this.cool = 0;
    this.chatter = 40;
    app.pet.on((type, data) => this.react(type, data));
  }

  get en() {
    return this.app.config.lang === 'en';
  }

  get freq() {
    return (this.app.config.speechFreq ?? 1) * (this.app.config.focus ? 0.2 : 1);
  }

  get memory() {
    return (this.app.game.profile.memory ||= {});
  }

  fill(text) {
    const name = this.memory['Nome'];
    return text.replace('{name}', name || (this.en ? 'friend' : 'amigo'));
  }

  react(type, data) {
    if (this.app.config.speech === false) return;
    const entry = LINES[type];
    if (!entry) return;
    const [pt, en, p] = entry;
    const forced = p >= 1;
    if (!forced && (this.cool > 0 || Math.random() > p * this.freq)) return;
    const src = this.en ? en : pt;
    const list = typeof src === 'function' ? src(data || {}) : src;
    if (list.length) this.say(pick(list));
  }

  say(text, life) {
    this.text = this.fill(text);
    this.shown = 0;
    this.t = 0;
    this.life = life ?? 1.6 + this.text.length * 0.07;
    this.cool = this.life + 6 / Math.max(0.2, this.freq);
    this.el.textContent = '';
  }

  // Idle chatter.
  idle(dt) {
    const { pet } = this.app;
    if (this.app.config.speech === false || this.freq <= 0 || pet.dead || this.text) return;
    this.chatter -= dt * this.freq;
    if (this.chatter > 0 || pet.mode !== 'ground' || !['idle', 'walk', 'sit'].includes(pet.action)) return;
    this.chatter = 50 + Math.random() * 70;
    const hour = new Date().getHours();
    const time = TIME_LINES.find(([[a, b]]) => hour >= a && hour < b);
    this.say(pick(time && Math.random() < 0.25 ? time[this.en ? 2 : 1] : CHATTER[this.en ? 1 : 0]));
  }

  update(dt, head, hidden) {
    this.cool -= dt;
    this.idle(dt);
    if (!this.text) {
      this.el.style.display = 'none';
      return;
    }
    this.t += dt;
    const n = Math.min(this.text.length, Math.floor(this.t * 24));
    if (n > this.shown) {
      for (let i = this.shown; i < n; i++) if (/\S/.test(this.text[i])) this.app.sound.speak(this.text[i]);
      this.shown = n;
      this.el.textContent = this.text.slice(0, n);
    }
    this.app.view.setMouth?.(n < this.text.length ? 0.5 + 0.5 * Math.sin(this.t * 30) : 0);
    if (this.t > this.life) {
      this.text = '';
      this.el.style.display = 'none';
      this.app.view.setMouth?.(0);
      return;
    }
    this.el.style.display = hidden ? 'none' : 'block';
    const w = this.el.offsetWidth;
    const h = this.el.offsetHeight;
    const P = this.app.pet.P;
    let x = head.x - w - P * 0.2;
    if (x < 4) x = head.x + P * 0.2;
    const y = Math.max(4, head.y - h - P * 0.15);
    this.el.style.transform = `translate(${Math.round(Math.min(x, innerWidth - w - 4))}px, ${Math.round(y)}px)`;
  }
}
