/**
 * Crée une image à partir d'une URL (object URL ou autre).
 */
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });

/**
 * Retourne un Blob de l'image recadrée (zone en pixels).
 * @param {string} imageSrc - URL de l'image (ex. object URL)
 * @param {{ x: number, y: number, width: number, height: number }} crop - Zone en pixels
 * @returns {Promise<Blob>}
 */
export async function getCroppedImg(imageSrc, crop) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2d non disponible');

  canvas.width = crop.width;
  canvas.height = crop.height;
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Échec toBlob'))),
      'image/jpeg',
      0.92
    );
  });
}
