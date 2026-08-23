// 6. ESTRUTURA DA FILA DE CONCORRÊNCIA LIMITADA

// Tipo interno que define o contrato de uma tarefa aguardando na fila
type ItemFila = {
  // A função que envelopa o disparo real da requisição (adiada com Generics)
  executar: () => Promise<any>;
  // Callbacks para resolver ou rejeitar a Promise original que o React está esperando
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  // A prioridade definida nas RequestOptions ('high' tem preferência de processamento)
  priority: 'high' | 'low';
};

// Configurações e estados da Fila de Concorrência
const LIMITE_CONCORRENCIA = 6;
let requisicoesAtivasAtuais = 0;
const filaDeEspera: ItemFila[] = [];

/**
 * Adiciona uma requisição à fila de concorrência controlada.
 * Retorna uma Promise que só será resolvida quando a tarefa ganhar um slot livre.
 * @param fnExecucao
 * @param options
 * @returns
 */
function enfileirarRequisicao<T>(
  fnExecucao: () => Promise<T>,
  options: RequestOptions,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    // Monta o objeto da tarefa com os dados necessários para o controle
    const novoItem: ItemFila = {
      executar: fnExecucao,
      resolve,
      reject,
      priority: options.priority || 'low', // 'low' por padrão caso omitido
    };

    filaDeEspera.push(novoItem);

    // ORDENAÇÃO POR PRIORIDADE: Coloca os itens 'high' sempre na frente da fila (índices iniciais)
    filaDeEspera.sort((a, b) => {
      if (a.priority === 'high' && b.priority === 'low') return -1;
      if (a.priority === 'low' && b.priority === 'high') return 1;
      return 0; // Mantém a ordem FIFO original para prioridades iguais
    });

    console.log(
      `📥 [HttpClient] Requisição enfileirada. Posição na fila: ${filaDeEspera.length}. Prioridade: ${novoItem.priority}`,
    );

    // Tenta processar imediatamente para ver se há slots vazios
    processarProximaTarefaDaFila();
  });
}

/**
 * Função orquestradora que gerencia as vagas disponíveis no canal de rede.
 * @returns
 */
function processarProximaTarefaDaFila() {
  // Se já atingimos o teto de 6 requisições ou se a fila estiver vazia, não faz nada
  if (
    requisicoesAtivasAtuais >= LIMITE_CONCORRENCIA ||
    filaDeEspera.length === 0
  ) {
    return;
  }

  // Remove o primeiro elemento da fila (o de maior prioridade e mais antigo)
  const tarefa = filaDeEspera.shift()!;

  // Ocupa um slot de concorrência
  requisicoesAtivasAtuais++;
  console.log(
    `🚀 [HttpClient] Liberando slot. Requisições ativas na rede: ${requisicoesAtivasAtuais}/${LIMITE_CONCORRENCIA}`,
  );

  // Dispara a promessa real envolvida
  tarefa
    .executar()
    .then((resultado) => {
      // Repassa o sucesso para quem chamou originalmente a função no Frontend
      tarefa.resolve(resultado);
    })
    .catch((error) => {
      // Repassa a falha definitiva
      tarefa.reject(error);
    })
    .finally(() => {
      // ETAPA CRUCIAL: Libera o slot e chama recursivamente a próxima tarefa da fila
      requisicoesAtivasAtuais--;
      console.log(
        `✅ [HttpClient] Slot desalocado. Restam na fila: ${filaDeEspera.length}`,
      );
      processarProximaTarefaDaFila();
    });
}

// 1. CONFIGURAÇÕES E TIPOS BASE
//

/**
 * Extendemos o 'RequestInit' nativo do js (que já contém method, headers, body, etc.)
 * para adicionar nossas próprias regras de resiliência e controle de fluxo.
 */

export interface RequestOptions extends RequestInit {
  timeout?: number; // Tempo máximo em ms antes de forçar o cancelamento
  retries?: number; // Número máxumo de tentativos (teto de retries)
  backoffFactor?: number; // Multiplicador do tempo de espero a cada falha
  priority?: 'high' | 'low'; // Nível de prioridade para a nossa futura fila de concorrência
}

//
// 2. UTILITÁRIOS OBRIGATÓRIOS (Promise.race e Promise.allSettled)
//

/**
 * Utilitário 'comTempoLimite' escrito manualmente com Promise.race
 * Força uma promise a estourar um erro se demorar mais que o tempo estipulado.
 * Força uma promise a competir contra um cronômetro regressivo.
 * @template T o tipo do dado esperado como retorno da Promise original
 * @param promise
 * @param ms
 * @param controllerForAbort
 * @returns
 */
export function comTempoLimite<T>(
  promise: Promise<T>,
  ms: number,
  controllerForAbort: AbortController,
): Promise<T> {
  // Guardará a referência do cronômetro para podermos limpá-lo se a requisição vencer
  let timeoutId: ReturnType<typeof setTimeout>;

  // Criamos uma Promise que nasce estritamente com o propósito de falhar (reject) após 'ms' tempo
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      // Aborta a requisição HTTP real associada no navegador
      // ETAPA CRUCIAL: Comunica ao navegador que o canal de rede HTTP deve ser fechado imediamtamente
      controllerForAbort.abort();
      reject(
        new Error(
          'TimeoutError: A requisição ultrapassou o tempo limite definido.',
        ),
      );
    }, ms);
  });

  // Corre de forma limpa. Se a promessa original vencer, limpa o cronômetro
  // Promise.race coloca as duas promessas para correr lado a lado.
  // Quem terminar primeiro (sucesso ou falha) define o resultado final.
  return Promise.race([promise, timeoutPromise]).finally(() => {
    // Evita vazamento de memória desativando o cronômetro caso a requisição HTTP ganhe a corrida
    clearTimeout(timeoutId);
  });
}

/**
 * Utilitário 'emLotes' escrito manualmente com Promise.allSettled
 * Executa um grupo de funções que retornam promises de forma isolada,
 * garantindo que uma falha não cancele a execução das outras.
 *
 * @template T o tipo de dado retornado por cada tarefa individual
 * @param tarefas
 * @returns
 */
export async function emLotes<T>(
  tarefas: (() => Promise<T>)[],
): Promise<PromiseSettledResult<T>[]> {
  // Executa todas as funções geradoras de promise em paralelo
  const promisesExecutando = tarefas.map((fn) => fn());

  // Aguarda a conclusão de absolutamente todas (sejam resolvidas com sucesso ou rejeitadas com erro).
  // Retorna um array estruturado contendo o { status: 'fulfilled', value } ou { status: 'rejected', reason }
  return Promise.allSettled(promisesExecutando);
}

// 3. MÉTODOS AUXILIARES: RETRY, EXPONENTIAL BACKOFF E JITTER

/**

 */
/**
 * Verifica se um método HTTP é estritamente idempotente.
 * Requisições idempotentes (GET, PUT, DELETE) podem ser repetidas com segurança se falharem.
 * Requisições não-idempotentes (POST, PATCH) Não podem ter retry cego, pois podem duplicar ações no banco.
 * @param method
 * @returns
 */
function metodoIdempotente(method?: string): boolean {
  if (!method) return true; // GET por padrão se omitido
  const metodo = method.toUpperCase();
  return (
    metodo === 'GET' ||
    metodo === 'PUT' ||
    method === 'DELETE' ||
    metodo === 'HEAD' ||
    metodo === 'OPTIONS'
  );
}

/**
 * Função auxiliar para gerar um delay com recuo exponencial e Jitter;
 * Formula: (fator * (2 ^ tentativa)) + variacao_aleatoria (jitter)
 *
 * @param tentativa
 * @param fator
 * @returns
 */
function calcularEsperaComJitter(
  tentativa: number,
  fator: number = 200,
): Promise<void> {
  /**
   *  Math.pow(2, tentativa): Garante o recuo exponencial. Tentativa 0 = 1, Tentativa 1 = 2,
   * Tentativa 2 = 4. O tempo vai dobrando violentamente a cada falha para dar tempo ao servidor.
   */
  const recuoExponencial = fator * Math.pow(2, tentativa);
  // Jitter: Adiciona ou remove até 30% do tempo de forma aleatória para evitar colisão de rede
  /**
   * * 0.3: Define a amplitude do ruído para 30%. Se o recuo exponencial calculou 1000ms,
   * o jitter vai sortear um valor entre -300ms e +300ms. O resultado final oscilará de forma
   * caótica entre 700ms e 1300ms.
   *
   * Math.random() * 2 - 1: Esse é um truque matemático clássico. O Math.random() normal gera
   * um número entre 0 e 1. Multiplicando por 2 e subtraindo 1, nós transformamos o intervalo
   * para -1 até 1. Isso permite que o jitter seja positivo ou negativo (o atraso pode aumentar
   * ou diminuir).
   */
  const jitter = recuoExponencial * 0.3 * (Math.random() * 2 - 1);
  const tempoFinal = Math.max(0, recuoExponencial + jitter);

  console.log(
    `♻️ [HttpClient] Aguardando ${Math.round(tempoFinal)}ms antes da próxima tentativa...`,
  );
  return new Promise((resolve) => setTimeout(resolve, tempoFinal));
}

// 5. REGISTRO DE DEDUPLICAÇÃO EM VOO

/**
 * Mapa em memória que rastreia todas as requisições HTTP atualmente ativas (em voo).
 * A chave é uma string gerada a partir do método e da URL da requisição.
 * O valor é a Promise de resposta compartilhada.
 */
const promessasEmVoo = new Map<string, Promise<any>>();

/**
 * Gera uma assinatura única (chave identificadora) para uma requisição.
 * Garante que requisições idênticas gerem a mesma string.
 *
 * @param url
 * @param options
 * @returns
 */
function gerarChaveRequisicao(url: string, options: RequestOptions): string {
  const metodo = (options.method || 'GET').toUpperCase();
  // Limpa espaços extras e padroniza a string identificadora
  return `${metodo}:${url.trim()}`;
}

// 4. A FUNÇÃO PRINCIPAL: REQUEST COM RESILIÊNCIA

/**
 * Dispara requisições HTTP usando Fetch nativo, blindado contra o servidor hostil.
 * Inclui Deduplicação automática e Fila de Concorrência Limitada por Prioridade.
 * @template T O tipo de dado esperado na resposta JSON do servidor
 * @param url
 * @param options
 * @returns
 */
export async function request<T>(
  url: string,
  options: RequestOptions = {},
): Promise<T> {
  const metodo = (options.method ?? 'GET').toUpperCase();
  const deduplicavel = metodo === 'GET';

  /**
   * futuro
   * Em vez de concatenar strings pesadas na URL, você pode rodar o Algoritmo de
   * Cantor nos parâmetros numéricos para gerar um ID numérico identificador único
   * daquela combinação exata de filtros.
   */

  // Cria a função geradora que contém o fluxo real da rede + deduplicação
  const dispararComDeduplicacao = async (): Promise<T> => {
    if (!deduplicavel) {
      // Se for POST/DELETE/PUT, ignora a deduplicação e vai direto para a execução real da rede
      return executarRequisicaoReal<T>(url, options);
    }

    // Gera a chave única para a requisição atual
    const chaveRequisicao = gerarChaveRequisicao(url, options);

    // CACHE EM VOO: Verifica se já existe EXATAMENTE a mesma requisição processando agora na rede
    if (promessasEmVoo.has(chaveRequisicao)) {
      console.log(
        `[HttpClient] Requisição duplicada detectada para [${chaveRequisicao}]. Compartilhando promessa em voo!`,
      );
      // Retorna a promessa que já está rodando, evitando um novo fetch de rede
      return promessasEmVoo.get(chaveRequisicao) as Promise<T>;
    }

    // Se não existe, nós criamos a promessa de execução real
    const promessaExecucao = executarRequisicaoReal<T>(url, options);

    // Registra no mapa global para que as próximas chamadas idênticas peguem carona nesta
    promessasEmVoo.set(chaveRequisicao, promessaExecucao);

    try {
      // Aguarda a resolução da requisição real na rede
      return await promessaExecucao;
    } finally {
      // ETAPA CRUCIAL: Assim que a requisição terminar (com sucesso ou falha),
      // nós a removemos do mapa imediatamente. Isso garante que buscas futuras
      // tragam dados atualizados e não um estado congelado do passado.
      promessasEmVoo.delete(chaveRequisicao);
    }
  };
  // INTERCEPTAÇÃO: Em vez de disparar a função na hora, nós passamos a assinatura dela
  // para a Fila de Concorrência Limitada gerenciar o momento certo de rodar.
  return enfileirarRequisicao<T>(dispararComDeduplicacao, options);
}

/**
 * Contém o laço original com toda a lógica de resiliência, retries e timeouts.
 * Foi isolada aqui para ser envelopada pela regra de deduplicação acima.
 * @param url
 * @param options
 * @returns
 */
async function executarRequisicaoReal<T>(
  url: string,
  options: RequestOptions,
): Promise<T> {
  // Define os valores padrão caso o frontend não passe configurações específicas
  const maxRetries = options.retries ?? 3;
  const timeoutMs = options.timeout ?? 1000; // Se bater nos 2% de buraco negro, cancela em 1s
  const backoffFactor = options.backoffFactor ?? 200;
  const method = options.method ?? 'GET';

  // Executa o laço de tentativas com base no teto de retries
  for (let tentativa = 0; tentativa <= maxRetries; tentativa++) {
    // IMPORTANTE: criamos um AbortController NOVO para cada tentativa
    const controller = new AbortController();
    const sinalDeCancelamento = controller.signal;

    try {
      // Mescla o sinal de abort nativo com as opções originais enviadas
      const fetchPromise = fetch(url, {
        ...options,
        signal: sinalDeCancelamento,
      });

      // Coloca o fetch para correr contra o cronômetro do utilitário comTempoLimite
      const response = await comTempoLimite(
        fetchPromise,
        timeoutMs,
        controller,
      );

      // Se o servidor hostil respondeu, mas com erro HTTP 500
      if (!response.ok) {
        throw new Error(`HTTPError: ${response.status}`);
      }

      // Sucesso total: Converte para o tipo denérico <T> e encerra a execução
      return (await response.json()) as T;
    } catch (error: any) {
      const ultimaTentativa = tentativa === maxRetries;
      const erroDeTimeout = error.message?.includes('TimeoutError');
      const erro500 = error.message?.includes('HTTPError: 500');

      console.warn(
        `[HttpClient] Falha na tentativa ${tentativa + 1}. Motivo: ${error.message}`,
      );

      // --- CRITÉRIO DE PARADA 1: Estourou o teto de retries ---
      if (ultimaTentativa) {
        throw new Error(
          `RequestFailedException: Falha definitiva após ${maxRetries + 1} tentativas. Último erro: ${error.message}`,
        );
      }

      // --- CRITÉRIO DE PARADA 2: Trava de Idempotência contra Retry Cego ---
      // Se a requisição for um POST/PATCH e falhou após ter sido enviada (ex: Erro 500),
      // nós NÃO podemos tentar de novo, pois o servidor pode ter processado a ação antes de quebrar.
      // Nota: Se for Timeout, a requisição pode nem ter saído do cliente, mas por segurança rígida, travamos.
      if (!metodoIdempotente(method)) {
        throw new Error(
          `SecurityException: Bloqueio de Retry. O método ${method} não é seguro para repetição automática após falhas.`,
        );
      }

      // Se passou pelas travas de segurança e o erro foi passível de recuperação (500 ou Timeout), calcula o recuo
      if (erro500 || erroDeTimeout) {
        await calcularEsperaComJitter(tentativa, backoffFactor);
        // O laço 'for' continuará para a próxima iteração (próxima tentativa)
      } else {
        // Se for um erro do tipo 400 (ex: Cursor Inválido), não adianta tentar de novo. Lança direto.
        throw error;
      }
    }
  }

  throw new Error('UnexpectedException: Falha crítica no fluxo de controle.');
}
