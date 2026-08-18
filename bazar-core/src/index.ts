import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

// Ativo o CORS para permitir que seu app Vite React acesse este servidor
app.use('*', cors()); // TODO quero aprender cors.

// ==========================================
// 1. GERADOR DE SEED FIXA (MOCK DATA)
// ==========================================
// Função determinística para gerar números pseudo-aleatórios idênticos
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
app.use('*', async (context, next) => {
  // --- PARTE A: LATÊNCIA ALEATÓRIA (RTT) ---
  const minRTT = 80; // Mínimo de 80ms (Conexão razoável)
  const maxRTT = 1200; // Máximo de 1200ms (Conexão mobile terrível)

  // Aqui SIM usamos Math.random(), pois queremos que o TEMPO mude a cada clique
  const rtt = Math.floor(Math.random() * (maxRTT - minRTT + 1)) + minRTT;

  console.log(`⏳ [Hostile Server] Segurando requisição por ${rtt}ms...`);
  await new Promise((resolve) => setTimeout(resolve, rtt));

  // --- PARTE B: RESPOSTAS QUE NUNCA CHEGAM (2% de chance) ---
  // Rola um dado de 0 a 1 para tirar os 2%
  if (Math.random() < 0.02) {
    console.error(
      `🕳️ [Hostile Server] A requisição caiu em um buraco negro! Nunca responderá...`,
    );

    // Uma Promise sem resolve() nem reject() trava a conexão TCP para sempre
    await new Promise(() => {});
    return; // O código morre aqui, o cliente vai dar Timeout
  }

  // --- PARTE C: ERROS INTERMITENTES (8% de chance) ---
  // Para que a chance seja exatamente 8% do total de requisições que sobraram:
  const taxaDeErro = 0.08;

  if (Math.random() < taxaDeErro) {
    // Escolhe aleatoriamente um erro comum de rede/servidor
    let statusEscolhido = 500;

    console.error(
      `💥 [Hostile Server] Simulando erro HTTP ${statusEscolhido}!`,
    );

    return context.json(
      {
        error: 'HOSTILE_SERVER_ERROR',
        message: 'Instabilidade simulada. O seu Front-end sabe lidar com isso?',
        timestamp: new Date().toISOString(),
      },
      statusEscolhido as any,
    );
  }

  // Se passou pela latência e não deu erro, segue para a rota real
  await next();
});

// Cria um banco de dados estático em memória com 100 itens fixos
const TOTAL_ITEMS = 5000;
const database = Array.from({ length: TOTAL_ITEMS }, (_, index) => {
  const idNum = index + 1000;
  // Cria um cursor opaco e seguro usando Base64 (ex: usr_MTAwMA) replaceAll dispensa o uso de /g
  const cursorId = `usr_${Buffer.from(String(idNum)).toString('base64').replaceAll('=', '')}`;

  return {
    id: cursorId,
    name: `User ${index + 1}`,
    score: Math.floor(nextRandom() * 5000), // Pontuação aleatória, mas fixa pela seed
    isActive: nextRandom() > 0.3,
  };
});

// ==========================================
// 3. ROTA COM PAGINAÇÃO POR CURSOR
// ==========================================
app.get('/api/users', (context) => {
  // Captura os parâmetros opcionais da query string
  const cursorParam = context.req.query('cursor') || null;
  const limitParam = context.req.query('limit') || '10';

  // Trata e valida o limite (mínimo 1, máximo 20 para evitar sobrecarga)
  const limit = Math.max(1, Math.min(parseInt(limitParam, 10) || 10, 20));
  let startIndex = 0;

  // Se o frontend enviou um cursor, localiza onde paramos
  if (cursorParam) {
    const itemIndex = database.findIndex((item) => item.id === cursorParam);

    // Se o cursor não existir na nossa seed, retorna erro HTTP 400
    if (itemIndex === -1) {
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

    // O próximo lote começa exatamente um item após o cursor atual
    startIndex = itemIndex + 1;
  }

  // Recorta o pedaço exato do nosso banco estático
  const paginatedItems = database.slice(startIndex, startIndex + limit);

  // Verifica se ainda existem itens restantes para as próximas páginas
  const hasMore = startIndex + paginatedItems.length < database.length;

  // O próximo cursor será sempre o ID do ÚLTIMO item retornado neste lote
  const nextCursor =
    paginatedItems.length > 0 && hasMore
      ? paginatedItems[paginatedItems.length - 1].id
      : null;

  // Retorna o payload idêntico ao padrão de grandes APIs do mercado
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
// ROTA INICIAL DE TESTE
// ==========================================
app.get('/', (context) => {
  return context.json({
    message: 'Hostile server initialized!',
    total_records: database.length,
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
