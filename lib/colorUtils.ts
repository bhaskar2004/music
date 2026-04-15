/**
 * Extracts the dominant vibrant color from an image URL in the browser.
 */
export async function extractAccentColor(imageUrl: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      
      // OPTIMIZATION: Downscale to a tiny grid for nearly instant sampling
      const sampleSize = 64;
      canvas.width = sampleSize;
      canvas.height = sampleSize;
      ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
      
      const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize);
      const colorCounts: Record<string, number> = {};
      
      // Sample every pixel in the tiny grid
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        
        if (a < 128) continue;
        
        const brightness = (r + g + b) / 3;
        const diff = Math.max(Math.abs(r-g), Math.abs(g-b), Math.abs(b-r));
        if (diff < 30 || brightness < 40 || brightness > 230) continue;
        
        const hex = `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
        colorCounts[hex] = (colorCounts[hex] || 0) + 1;
      }
      
      // Find the most frequent "vibrant" color
      let dominant = null;
      let maxCount = 0;
      for (const [hex, count] of Object.entries(colorCounts)) {
        if (count > maxCount) {
          maxCount = count;
          dominant = hex;
        }
      }
      
      resolve(dominant);
    };
    
    img.onerror = () => resolve(null);
  });
}
