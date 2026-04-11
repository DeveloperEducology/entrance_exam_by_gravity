export function isInlineSvg(value) {
  return typeof value === 'string' && value.trim().toLowerCase().startsWith('<svg');
}

export function isImageUrl(value) {
  if (typeof value !== 'string') return false;
  const candidate = value.trim();
  if (!candidate) return false;

  if (candidate.startsWith('data:image/')) return true;
  if (candidate.startsWith('/')) return true;
  if (/^https?:\/\//i.test(candidate)) return true;

  return /\.(png|jpe?g|gif|webp|avif|bmp|svg)(\?.*)?$/i.test(candidate);
}

export function getImageSrc(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length > 0) {
    return getImageSrc(value[0]);
  }
  if (value && typeof value === 'object') {
    return value.imageUrl || value.url || value.src || '';
  }
  return '';
}

export function hasInlineHtml(value) {
  if (typeof value !== 'string') return false;
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

export function sanitizeInlineHtml(value) {
  if (typeof value !== 'string') return '';

  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
    .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, ' $1="#"');
}

export function hydrateTemplate(text, variables) {
  if (!text || !variables) return text;
  if (typeof text !== 'string') return text;
  
  return text.replace(/{([^{}]+)}/g, (match, key) => {
    const parts = key.split('.');
    let value = variables;
    for (const part of parts) {
      if (value === null || value === undefined) break;
      value = value[part];
    }
    
    if (value === undefined || value === null) return match;
    
    // Auto-format numbers with commas if they are large
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    
    return String(value);
  });
}

