import { describe, expect, it } from "vitest";

import { isMediaPathOwnedBy } from "@/lib/messaging/media/upload-validation";
import { urlDeMidiaAlcancavelPeloWaha, wahaSendPlanFor } from "@/lib/waha/media-send";

const media = { url: "https://signed.example/x?token=t", mime: "image/jpeg", filename: "x.jpg", caption: "oi" };

describe("wahaSendPlanFor", () => {
  it("image → sendImage com caption", () => {
    const plan = wahaSendPlanFor("image", media);
    expect(plan.endpoint).toBe("sendImage");
    expect(plan.payload.caption).toBe("oi");
    expect((plan.payload.file as { url: string }).url).toBe(media.url);
  });
  it("video → sendVideo com caption e convert", () => {
    const plan = wahaSendPlanFor("video", { ...media, mime: "video/mp4" });
    expect(plan.endpoint).toBe("sendVideo");
    expect(plan.payload.convert).toBe(true);
  });
  it("audio → sendVoice com convert (WhatsApp exige OGG/OPUS)", () => {
    const plan = wahaSendPlanFor("audio", { ...media, mime: "audio/webm;codecs=opus" });
    expect(plan.endpoint).toBe("sendVoice");
    expect(plan.payload.convert).toBe(true);
    expect(plan.payload.caption).toBeUndefined(); // voz não tem caption no WhatsApp
  });
  it("document (e desconhecidos) → sendFile com filename", () => {
    const plan = wahaSendPlanFor("document", { ...media, mime: "application/pdf", filename: "doc.pdf" });
    expect(plan.endpoint).toBe("sendFile");
    expect((plan.payload.file as { filename: string }).filename).toBe("doc.pdf");
  });
});

describe("urlDeMidiaAlcancavelPeloWaha", () => {
  it.each(["localhost", "127.0.0.1", "[::1]"])(
    "troca a origem local %s sem perder caminho nem token",
    (host) => {
      const result = urlDeMidiaAlcancavelPeloWaha(
        `http://${host}:54321/storage/v1/object/sign/whatsapp-media/a.png?token=segredo`,
      );
      expect(result).toBe(
        "http://host.docker.internal:54321/storage/v1/object/sign/whatsapp-media/a.png?token=segredo",
      );
    },
  );

  it("mantém URL pública exatamente como veio", () => {
    const url = "https://projeto.supabase.co/storage/v1/object/sign/a?token=x%2By";
    expect(urlDeMidiaAlcancavelPeloWaha(url)).toBe(url);
  });

  it("mantém entrada não absoluta para o transporte recusá-la", () => {
    expect(urlDeMidiaAlcancavelPeloWaha("/arquivo.png")).toBe("/arquivo.png");
  });
});

describe("isMediaPathOwnedBy", () => {
  const orgId = "org-1";
  const conversationId = "conv-1";

  it("path da própria org/conversa → true", () => {
    expect(isMediaPathOwnedBy(`${orgId}/${conversationId}/foo.jpg`, orgId, conversationId)).toBe(true);
  });
  it("org diferente → false", () => {
    expect(isMediaPathOwnedBy(`org-2/${conversationId}/foo.jpg`, orgId, conversationId)).toBe(false);
  });
  it("conversa diferente → false", () => {
    expect(isMediaPathOwnedBy(`${orgId}/conv-2/foo.jpg`, orgId, conversationId)).toBe(false);
  });
  it("confusão de prefixo (org-1x/...) → false", () => {
    expect(isMediaPathOwnedBy(`${orgId}x/${conversationId}/foo.jpg`, orgId, conversationId)).toBe(false);
  });
});
