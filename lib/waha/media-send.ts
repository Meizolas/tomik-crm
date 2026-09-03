/**
 * Plano de envio de mídia WAHA por tipo de mensagem (Onda 2). Puro — o
 * WahaClient executa. sendVoice: WhatsApp só aceita OGG/OPUS; convert:true
 * pede conversão ao WAHA (contingência NOWEB Core registrada no plano).
 */
export interface OutboundMedia {
  url: string;
  mime: string;
  filename?: string | null;
  caption?: string | null;
}

export interface WahaSendPlan {
  endpoint: "sendImage" | "sendVideo" | "sendVoice" | "sendFile";
  payload: Record<string, unknown>;
}

/**
 * O WAHA local roda em contêiner. Uma signed URL criada pelo Supabase CLI usa
 * `localhost`/`127.0.0.1`; vista de dentro do contêiner, essa origem aponta para
 * o próprio WAHA e o download falha com ECONNREFUSED. O compose já publica o
 * host em `host.docker.internal`, inclusive no Linux via `host-gateway`.
 *
 * URLs públicas ficam byte a byte intactas. Se a entrada não for uma URL
 * absoluta, também não a alteramos: a validação/recusa continua pertencendo ao
 * transporte, sem esconder um payload inválido.
 */
export function urlDeMidiaAlcancavelPeloWaha(url: string): string {
  try {
    const parsed = new URL(url);
    if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(parsed.hostname)) return url;
    parsed.hostname = "host.docker.internal";
    return parsed.toString();
  } catch {
    return url;
  }
}

export function wahaSendPlanFor(kind: string, media: OutboundMedia): WahaSendPlan {
  const file: Record<string, unknown> = {
    url: urlDeMidiaAlcancavelPeloWaha(media.url),
    mimetype: media.mime,
  };
  if (media.filename) file.filename = media.filename;

  switch (kind) {
    case "image":
      return { endpoint: "sendImage", payload: { file, ...(media.caption ? { caption: media.caption } : {}) } };
    case "video":
      return {
        endpoint: "sendVideo",
        payload: { file, convert: true, ...(media.caption ? { caption: media.caption } : {}) },
      };
    case "audio":
      return { endpoint: "sendVoice", payload: { file, convert: true } };
    default:
      return { endpoint: "sendFile", payload: { file, ...(media.caption ? { caption: media.caption } : {}) } };
  }
}
