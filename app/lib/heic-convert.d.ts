// heic-convertは型定義を同梱していないため、使う分だけ最小限の型を用意する
declare module "heic-convert" {
  function convert(options: { buffer: Buffer | Uint8Array; format: "JPEG" | "PNG"; quality?: number }): Promise<Buffer>;
  export default convert;
}
