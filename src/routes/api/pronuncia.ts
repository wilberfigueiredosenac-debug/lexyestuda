import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({ text: z.string().trim().min(1).max(60) });

export const Route = createFileRoute("/api/pronuncia")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Palavra inválida", { status: 400 });
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("Áudio não configurado", { status: 500 });

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3.1-flash-tts-preview",
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `Pronuncie de forma clara e pausada, em português do Brasil, apenas a palavra: ${parsed.data.text}`,
                  },
                ],
              },
            ],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
            },
            stream_format: "audio",
          }),
        });

        if (!upstream.ok) {
          const detail = await upstream.text();
          console.error("[lexy] tts", upstream.status, detail);
          return new Response(
            upstream.status === 402
              ? "Os créditos de IA acabaram."
              : upstream.status === 429
                ? "Muitas pronúncias seguidas. Aguarde um pouco."
                : "Não foi possível gerar o áudio.",
            { status: upstream.status },
          );
        }

        return new Response(upstream.body, {
          status: 200,
          headers: {
            "Content-Type": upstream.headers.get("Content-Type") ?? "audio/wav",
            "Cache-Control": "no-cache",
          },
        });
      },
    },
  },
});
