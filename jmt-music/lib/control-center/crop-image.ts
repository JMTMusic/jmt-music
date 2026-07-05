export type PixelCrop = { x: number; y: number; width: number; height: number };

/** Exports the selected crop as a 1200×1200 WebP suitable for beat artwork. */
export async function exportSquareArtwork(
  imageUrl: string,
  crop: PixelCrop
): Promise<File> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("Artwork could not be decoded."));
    element.src = imageUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1200;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Artwork processing is unavailable.");

  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    1200,
    1200
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.9)
  );
  if (!blob) throw new Error("Artwork crop could not be exported.");

  return new File([blob], "cover.webp", { type: "image/webp" });
}
