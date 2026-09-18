// src/utils/imageFallback.js

// ✅ Colored avatar with initial
export const getFallbackAvatar = (name = '?', bgColor = '#6366F1') => {
  const letter = (name?.[0] || '?').toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" fill="${bgColor}"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#fff" font-size="34" font-family="Arial, sans-serif" font-weight="700">${letter}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

// ✅ Generic placeholder for place/gallery images
export const getFallbackPlaceholder = (text = 'No Image') => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect width="200" height="150" fill="#E2E8F0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#94A3B8" font-size="14" font-family="Arial">${text}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

// ✅ Resolve image URL — handles null, relative, absolute
export const getImageUrl = (path, name = '?') => {
  if (!path) return getFallbackAvatar(name);
  if (path.startsWith('data:')) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    'https://local-guider-backend.onrender.com/api/v1';
  const baseUrl = API_BASE_URL.replace('/api/v1', '');
  return `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
};

// ✅ Generic image fallback (for non-avatar images)
export const getImageUrlGeneric = (path, text = 'No Image') => {
  if (!path) return getFallbackPlaceholder(text);
  if (path.startsWith('data:')) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    'https://local-guider-backend.onrender.com/api/v1';
  const baseUrl = API_BASE_URL.replace('/api/v1', '');
  return `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
};