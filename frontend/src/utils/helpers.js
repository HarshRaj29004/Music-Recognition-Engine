export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const formatTime = (seconds) => {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const getYouTubeEmbedUrl = (youtubeUrl) => {
  if (!youtubeUrl) return null;
  const videoId = youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1];
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
};
