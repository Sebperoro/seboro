import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function getOptionalUserId(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : "";

  if (!token) return null;

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.auth.getUser(token);

  if (error) {
    console.error("[reader/pdf] auth.getUser:", error.message);
    return null;
  }

  return data.user?.id || null;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const userId = await getOptionalUserId(request);
    const admin = getSupabaseAdminClient();

    const { data: work, error: workError } = await admin
      .from("works")
      .select(
        "id, slug, author_id, price_mxn, publication_status, content_format, source_file_path, page_count, sample_enabled, sample_pages"
      )
      .eq("slug", slug)
      .eq("publication_status", "published")
      .maybeSingle();

    if (workError) {
      console.error("[reader/pdf] works query:", workError.message);
      throw new Error(`No se pudo consultar la obra: ${workError.message}`);
    }

    if (!work || work.content_format !== "pdf" || !work.source_file_path) {
      return NextResponse.json(
        { error: "PDF no disponible." },
        { status: 404 }
      );
    }

    let isAdmin = false;
    let purchased = false;
    let entitled = false;

    if (userId) {
      const [profileResult, purchaseResult, entitlementResult] =
        await Promise.all([
          admin
            .from("profiles")
            .select("role")
            .eq("user_id", userId)
            .maybeSingle(),
          admin
            .from("purchases")
            .select("id")
            .eq("buyer_id", userId)
            .eq("work_id", work.id)
            .eq("status", "paid")
            .limit(1)
            .maybeSingle(),
          admin
            .from("work_entitlements")
            .select("id")
            .eq("user_id", userId)
            .eq("work_id", work.id)
            .eq("active", true)
            .limit(1)
            .maybeSingle(),
        ]);

      if (profileResult.error) {
        console.error("[reader/pdf] profile query:", profileResult.error.message);
      }

      if (purchaseResult.error) {
        console.error("[reader/pdf] purchase query:", purchaseResult.error.message);
      }

      if (entitlementResult.error) {
        console.error(
          "[reader/pdf] entitlement query:",
          entitlementResult.error.message
        );
      }

      isAdmin = String(profileResult.data?.role || "") === "admin";
      purchased = Boolean(purchaseResult.data);
      entitled = Boolean(entitlementResult.data);
    }

    const fullAccess =
      work.author_id === userId || isAdmin || entitled || purchased;

    const samplePages = Math.max(0, Number(work.sample_pages || 0));
    const canSample = Boolean(work.sample_enabled) && samplePages > 0;

    if (!fullAccess && !canSample) {
      return NextResponse.json(
        {
          error:
            Number(work.price_mxn || 0) <= 0
              ? "Obtén la obra para acceder al PDF completo."
              : "Compra la obra para acceder al PDF completo.",
        },
        { status: 403 }
      );
    }

    const { data: sourceBlob, error: downloadError } = await admin.storage
      .from("book-manuscripts")
      .download(String(work.source_file_path));

    if (downloadError) {
      console.error("[reader/pdf] storage download:", downloadError.message);
      throw new Error(`No se pudo descargar el PDF: ${downloadError.message}`);
    }

    if (!sourceBlob) {
      throw new Error("Supabase no devolvió el archivo PDF.");
    }

    const sourceBytes = new Uint8Array(await sourceBlob.arrayBuffer());

    if (sourceBytes.byteLength === 0) {
      throw new Error("El PDF descargado está vacío.");
    }

    let outputBytes: Uint8Array = sourceBytes;

    if (!fullAccess) {
      let sourcePdf: PDFDocument;

      try {
        sourcePdf = await PDFDocument.load(sourceBytes, {
          ignoreEncryption: false,
          updateMetadata: false,
        });
      } catch (error) {
        console.error("[reader/pdf] PDFDocument.load:", error);
        throw new Error(
          error instanceof Error
            ? `No se pudo leer el PDF original: ${error.message}`
            : "No se pudo leer el PDF original."
        );
      }

      const pageLimit = Math.min(sourcePdf.getPageCount(), samplePages);

      if (pageLimit < 1) {
        return NextResponse.json(
          { error: "La muestra PDF no tiene páginas." },
          { status: 403 }
        );
      }

      try {
        const samplePdf = await PDFDocument.create();
        const indices = Array.from({ length: pageLimit }, (_, index) => index);
        const copiedPages = await samplePdf.copyPages(sourcePdf, indices);

        copiedPages.forEach((page) => samplePdf.addPage(page));
        samplePdf.setTitle(`${String(work.slug)} · muestra SEBORO`);
        outputBytes = await samplePdf.save();
      } catch (error) {
        console.error("[reader/pdf] sample generation:", error);
        throw new Error(
          error instanceof Error
            ? `No se pudo generar la muestra PDF: ${error.message}`
            : "No se pudo generar la muestra PDF."
        );
      }
    }

    return new Response(Buffer.from(outputBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${encodeURIComponent(
          String(work.slug)
        )}.pdf"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-SEBORO-Access": fullAccess ? "full" : "sample",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo abrir el PDF.";

    console.error("[reader/pdf] fatal:", message);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
