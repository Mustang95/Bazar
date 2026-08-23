import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

// ==========================================
// CORS  (o TODO "quero aprender cors" respondido aqui)
// ==========================================
// Por que existe: o navegador proíbe, por padrão, que uma página servida em
// localhost:5173 (Vite) leia a resposta de localhost:3000 (este servidor). Origens
// diferentes = requisição "cross-origin". O servidor precisa autorizar via cabeçalho.
//
// O detalhe que quase todo mundo erra: a requisição CHEGA no servidor e É PROCESSADA.
// O navegador só bloqueia a LEITURA da resposta pelo JavaScript. Por isso um POST
// barrado por CORS pode ter gravado no banco assim mesmo. Isso é pergunta clássica.
//
// Para métodos "não simples" (PUT, DELETE, ou com cabeçalho customizado), o navegador
// manda antes um OPTIONS — o "preflight" — perguntando se pode. O cors() do Hono
// responde esse preflight e encerra ali, sem chamar o próximo middleware.
app.use('*', cors());

// ==========================================
// 1. GERADOR DE SEED FIXA (MOCK DATA)
// ==========================================
// Função determinística para gerar números pseudo-aleatórios idênticos.
// Algoritmo Mulberry32: dada a mesma seed, produz sempre a MESMA sequência.
//
// Por que determinismo importa aqui: sem banco de dados, os 5.000 produtos são
// recriados a cada restart do servidor. Com seed fixa, o produto `prd_MTAwMA` tem o
// mesmo preço hoje e amanhã — então um teste de paginação é reproduzível.
function createRandomGenerator(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const nextRandom = createRandomGenerator(12345); // Seed fixa: 12345

// ==========================================
// 2. MIDDLEWARE HOSTIL (Simulação de Caos)
// ==========================================
// MUDANÇA: o escopo era '*' (tudo). Agora é '/api/*'.
//
// Por quê: com '*', a rota de saúde `/` também demorava até 1,2s e travava 2% das vezes.
// Health check que mente não é health check — você não consegue distinguir "servidor
// caiu" de "servidor está sendo hostil comigo" na hora de debugar. Limitando a '/api/*',
// o caos afeta só o que existe para ser testado.
app.use('/api/*', async (context, next) => {
  // --- GUARDA DE PREFLIGHT ---
  // O cors() acima já responde o OPTIONS e encerra antes de chegar aqui. Esta guarda é
  // defesa em profundidade: se um dia a ordem dos middlewares mudar, um preflight preso
  // no buraco negro faria o navegador reportar ERRO DE CORS — não timeout, não erro de
  // rede. Você perderia uma hora debugando CORS por causa do seu próprio caos.
  if (context.req.method === 'OPTIONS') {
    return next();
  }

  // --- PARTE A: LATÊNCIA ALEATÓRIA (RTT) ---
  const minRTT = 80; // Mínimo de 80ms (conexão razoável)
  const maxRTT = 1200; // Máximo de 1200ms (conexão mobile terrível)

  // Aqui SIM usamos Math.random(), e não o nextRandom() com seed.
  // A distinção é deliberada: os DADOS precisam ser determinísticos (teste reproduzível),
  // o CAOS precisa ser imprevisível — senão o cliente sempre falha na mesma ordem e você
  // treina contra um adversário previsível. Muita gente sênior erra isso e semeia tudo.
  const rtt = Math.floor(Math.random() * (maxRTT - minRTT + 1)) + minRTT;

  console.log(`⏳ [Hostile Server] Segurando requisição por ${rtt}ms...`);
  await new Promise((resolve) => setTimeout(resolve, rtt));

  // --- PARTE B: RESPOSTAS QUE NUNCA CHEGAM (2% de chance) ---
  if (Math.random() < 0.02) {
    console.error(
      `🕳️ [Hostile Server] A requisição caiu em um buraco negro! Nunca responderá...`,
    );

    // Promise sem resolve() nem reject(): a conexão fica pendurada.
    // Quem resolve isso é o timeout DO CLIENTE (AbortController + Promise.race).
    // Não existe linha depois desta de propósito — um `return` aqui seria código
    // inalcançável, porque o await nunca termina.
    await new Promise(() => {});
  }

  // --- PARTE C: ERROS INTERMITENTES (8% de chance) ---
  // Atenção à matemática: estes 8% incidem sobre os 98% que sobraram do buraco negro,
  // então a taxa real de 5xx é 7,84% do total. Saber isso é o que te separa de gaguejar
  // se o entrevistador fizer a conta.
  const taxaDeErro = 0.08;

  if (Math.random() < taxaDeErro) {
    // MUDANÇA: o comentário antigo dizia "escolhe aleatoriamente" e o código fixava 500.
    // Comentário que descreve intenção não implementada é pior que comentário nenhum:
    // numa revisão, o leitor confia no comentário e erra. Agora o sorteio é real.
    //
    // Sobre tipos: `let x = 500` é inferido como `number`, e o Hono recusa `number`
    // porque nem todo número é status HTTP válido — ele quer o literal. O `as const`
    // abaixo dá ao array o tipo `readonly [500, 502, 503, 504]`, então cada elemento
    // tem tipo `500 | 502 | 503 | 504` e o contrato fecha sem `as any`.
    // Regra: `as any` quase nunca é solução — é o aviso de que você não entendeu o que
    // o tipo estava exigindo.
    //
    // E cada status alimenta sua matriz de decisão de retry, que a F01 vai precisar:
    //   500 Internal Server Error → bug do servidor; retry provavelmente não adianta
    //   502 Bad Gateway           → proxy não falou com a origem; retry faz sentido
    //   503 Service Unavailable   → sobrecarga temporária; é O caso do backoff exponencial
    //   504 Gateway Timeout       → origem demorou demais; retry com cuidado
    const STATUS_DE_ERRO = [500, 502, 503, 504] as const;
    const statusEscolhido =
      STATUS_DE_ERRO[Math.floor(Math.random() * STATUS_DE_ERRO.length)];

    console.error(
      `💥 [Hostile Server] Simulando erro HTTP ${statusEscolhido}!`,
    );

    return context.json(
      {
        error: 'HOSTILE_SERVER_ERROR',
        message: 'Instabilidade simulada. O seu Front-end sabe lidar com isso?',
        status: statusEscolhido,
        timestamp: new Date().toISOString(),
      },
      statusEscolhido,
    );
  }

  // Se passou pela latência e não deu erro, segue para a rota real
  await next();
});

// ==========================================
// BANCO ESTÁTICO EM MEMÓRIA — DOMÍNIO: PRODUTOS
// ==========================================
// Por que o domínio importa: o F00 declarou `catalogo` e `carrinho`. Um app de bazar cuja
// API devolve usuários com pontuação comunica "segui um tutorial genérico" — exatamente a
// impressão a evitar. Trocar agora custa dez minutos; depois da F02, custa uma tarde,
// porque tipos, rotas e o cliente inteiro já estarão construídos em cima da forma errada.
const TOTAL_ITEMS = 5000;
const BASE = Date.UTC(2026, 7, 8);

// `as const` faz CATEGORIAS ter tipo literal, então `categoria` no produto é
// 'Livros' | 'Moveis' | ... e não `string`. Isso é o "contrato claro" do F00 na prática:
// um typo em `if (p.categoria === 'Livro')` vira erro de compilação, não bug silencioso.
const CATEGORIAS = [
  'Livros',
  'Moveis',
  'Eletronicos',
  'Roupas',
  'Decoracao',
] as const;

const PAISES = [
  'China',
  'Brasil',
  'Taiwan',
  'França',
  'Suíça',
  'Marrocos',
] as const;

const CONDICOES = [
  'Imperdível',
  'Acabando os estoques',
  'Promoção',
  'BlackFriday',
  'Entrega Hoje',
] as const;

const VENDEDORES = [
  'Nike',
  'Adidas',
  'Puma',
  'New Balance',
  'H&M',
  'Zara',
] as const;

const database = Array.from({ length: TOTAL_ITEMS }, (_, index) => {
  const idNum = index + 1000;

  // Cursor "opaco" via Base64 (ex: prd_MTAwMA). O replaceAll remove o padding '='.
  //
  // Seja preciso ao defender isso: Base64 é CODIFICAÇÃO, não ocultação. Qualquer um faz
  // atob("MTAwMA") e lê 1000 — e consegue forjar um cursor para pular onde quiser.
  // "Opaco" aqui significa CONTRATO, não segurança: o cliente se compromete a não
  // interpretar a string, e em troca o servidor pode trocar a implementação interna
  // (id → timestamp+id → token assinado) sem quebrar ninguém. Opacidade de verdade
  // exigiria assinatura (HMAC) ou um token guardado no servidor.
  const id = `prd_${Buffer.from(String(idNum)).toString('base64').replaceAll('=', '')}`;

  const diasAtras = Math.floor(nextRandom() * 365);
  const criadoEm = BASE - diasAtras * 86400000;

  return {
    id,
    titulo: `Produto ${index + 1}`,
    // Dinheiro em CENTAVOS, como inteiro — nunca como float.
    // 0.1 + 0.2 !== 0.3 em ponto flutuante, e em preço isso vira centavo perdido na soma
    // do carrinho. Formatar para "R$ 49,90" é responsabilidade da apresentação.
    precoCentavos: 1000 + Math.floor(nextRandom() * 49000), // R$ 10,00 a R$ 499,99
    pais: PAISES[Math.floor(nextRandom() * PAISES.length)],
    condicao: CONDICOES[Math.floor(nextRandom() * CONDICOES.length)],
    vendedor: VENDEDORES[Math.floor(nextRandom() * VENDEDORES.length)],
    // Antes era Math.floor(nextRandom() * 5000): categoria como número não é categoria.
    // Agora o sorteio indexa a lista de categorias reais.
    categoria: CATEGORIAS[Math.floor(nextRandom() * CATEGORIAS.length)],
    estoque: Math.floor(nextRandom() * 50),
    createdAtMs: criadoEm,
    createdAt: new Date(criadoEm).toISOString(),
    views: Math.floor(nextRandom() * 1000000),
  };
});

// ==========================================
// ÍNDICE DO CURSOR
// ==========================================
// MUDANÇA: a rota usava `database.findIndex(item => item.id === cursor)`.
//
// Por quê: findIndex percorre o array desde o começo. Para a página 400 ele varria 4.000
// itens — exatamente a varredura usada como argumento CONTRA o offset. O resultado estava
// certo, mas o diário afirmava "busca indexada" e o código fazia varredura linear.
// Afirmar propriedade que o código não tem é o tipo de contradição que derruba candidato.
// Com Map, a busca vira O(1) e a palavra "indexada" passa a ser verdade.
//
// CUIDADO: este índice guarda POSIÇÃO, e só vale enquanto o array não muda de forma. Se um
// dia existir DELETE de produto, tudo depois do item removido sai do lugar e o Map precisa
// ser reconstruído. Em banco real o problema não existe, porque o índice é da CHAVE de
// ordenação, não da posição.
//
// E repare no principal: o argumento de CONSISTÊNCIA do cursor — imune a item removido no
// meio da navegação — continua valendo com ou sem este Map. Ele não depende de índice
// nenhum. Isso confirma a ordem de defesa: correção primeiro, performance depois.
const indicePorCursor = new Map<string, number>();
database.forEach((produto, index) => indicePorCursor.set(produto.id, index));

// ==========================================
// 3. ROTA PARA FASE 02
// mandar 5.000 itens pro cliente não escala — em produção a busca vai pro servidor.
// Aqui é deliberado, o exercício é sobre estrutura de dados no front.
// ==========================================
app.get('/api/produtos/todos', (context) => {
  return context.json({
    data: database,
  });
});

// ==========================================
// 3. ROTA COM PAGINAÇÃO POR CURSOR
// ==========================================
app.get('/api/produtos', (context) => {
  const cursorParam = context.req.query('cursor') || null;
  const limitParam = context.req.query('limit') || '10';

  // Clamp defensivo: mínimo 1, máximo 20, com fallback para entrada não-numérica.
  // Cliente mandando ?limit=99999 ou ?limit=abc não derruba nada.
  const limit = Math.max(1, Math.min(parseInt(limitParam, 10) || 10, 20));
  let startIndex = 0;

  // Cursor AUSENTE não é erro — é o caso normal da primeira página. O cliente não tem
  // cursor nenhum na primeira chamada; ele só recebe um para pedir a segunda.
  if (cursorParam) {
    const posicao = indicePorCursor.get(cursorParam); // O(1), antes era O(n)

    // Cursor MALFORMADO ou inexistente, esse sim, é erro do cliente → 400, nunca 5xx.
    // 5xx significaria "eu, servidor, errei"; aqui quem mandou entrada inválida foi ele.
    if (posicao === undefined) {
      console.warn(
        `⚠️ [Hostile Server] Cursor inválido recebido: ${cursorParam}`,
      );
      return context.json(
        {
          error: 'INVALID_CURSOR',
          message: 'O cursor fornecido não foi encontrado ou expirou.',
        },
        400,
      );
    }

    // O próximo lote começa exatamente um item DEPOIS do cursor recebido.
    startIndex = posicao + 1;
  }

  const paginatedItems = database.slice(startIndex, startIndex + limit);

  const hasMore = startIndex + paginatedItems.length < database.length;

  // O próximo cursor é o id do ÚLTIMO item deste lote. A checagem de hasMore evita
  // devolver um cursor que apontaria para o vazio na última página.
  const nextCursor =
    paginatedItems.length > 0 && hasMore
      ? paginatedItems[paginatedItems.length - 1].id
      : null;

  return context.json({
    data: paginatedItems,
    paging: {
      limit,
      next_cursor: nextCursor,
      has_more: hasMore,
    },
  });
});

// ==========================================
// ROTA DE SAÚDE — fora do middleware hostil
// ==========================================
// Sempre limpa e instantânea, de propósito. Se ela responder, o processo está de pé;
// se `/api/*` estiver falhando, é o caos simulado, não o servidor caído.
app.get('/', (context) => {
  return context.json({
    message: 'Hostile server initialized!',
    total_records: database.length,
    endpoints: ['/api/produtos?cursor=&limit='],
  });
});

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
