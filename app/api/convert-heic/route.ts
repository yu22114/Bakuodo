import { NextRequest, NextResponse } from "next/server";
import convert from "heic-convert";

// iPhoneのHEIC/HEIF写真をJPEGに変換するAPI。スマホのブラウザだけで変換しようとすると
// 高解像度写真でメモリ不足になりページごと落ちることがあるため、サーバー側で変換する
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const arrayBuffer = await req.arrayBuffer();
  if (arrayBuffer.byteLength === 0) {
    return NextResponse.json({ error: "empty body" }, { status: 400 });
  }
  if (arrayBuffer.byteLength > 15 * 1024 * 1024) {
    return NextResponse.json({ error: "file too large" }, { status: 413 });
  }
  try {
    const outputBuffer = await convert({ buffer: Buffer.from(arrayBuffer), format: "JPEG", quality: 0.9 });
    return new NextResponse(outputBuffer as any, { headers: { "Content-Type": "image/jpeg" } });
  } catch (e) {
    console.error("heic convert error:", e);
    return NextResponse.json({ error: "convert failed" }, { status: 500 });
  }
}
