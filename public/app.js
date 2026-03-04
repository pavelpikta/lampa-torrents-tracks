let mediaData = null;
let _loadingTimerInterval = null;
let _loadingStartTime = null;

function showLoading() {
  document.getElementById('loadingIndicator').classList.remove('hidden');
  document.getElementById('errorMessage').classList.add('hidden');
  document.getElementById('results').classList.add('hidden');

  _loadingStartTime = Date.now();
  const timerEl = document.getElementById('loadingTimer');
  if (timerEl) {
    timerEl.textContent = '';
    clearInterval(_loadingTimerInterval);
    _loadingTimerInterval = setInterval(() => {
      const elapsed = Math.round((Date.now() - _loadingStartTime) / 1000);
      timerEl.textContent = `${elapsed}s`;
    }, 1000);
  }
}

function hideLoading() {
  document.getElementById('loadingIndicator').classList.add('hidden');
  clearInterval(_loadingTimerInterval);
  _loadingTimerInterval = null;
  const timerEl = document.getElementById('loadingTimer');
  if (timerEl) timerEl.textContent = '';
}

function showError(message) {
  const errorTextElement = document.getElementById('errorText');
  errorTextElement.style.whiteSpace = 'pre-wrap';
  errorTextElement.textContent = message;
  document.getElementById('errorMessage').classList.remove('hidden');
  document.getElementById('results').classList.add('hidden');
  hideLoading();
}

function showResults() {
  document.getElementById('results').classList.remove('hidden');
  document.getElementById('errorMessage').classList.add('hidden');
  hideLoading();
}

function capitalizeFirstLetter(string) {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function formatBitrate(bitrate) {
  if (!bitrate) return '';
  const kbps = Math.round(bitrate / 1000);
  if (kbps > 1000) {
    return (kbps / 1000).toFixed(2) + ' Mbps';
  }
  return kbps + ' Kbps';
}

function formatChannelLayout(layout) {
  if (!layout) return '';
  return layout.replace('(side)', '').replace('stereo', '2.0').trim();
}

/**
 * Safely parses a fraction string (e.g., "30/1", "24000/1001") to a decimal number
 * @param {string} fraction - Fraction string like "30/1" or "24000/1001"
 * @returns {number|null} Parsed number or null if invalid
 */
function parseFraction(fraction) {
  if (!fraction || typeof fraction !== 'string') return null;
  const parts = fraction.split('/');
  if (parts.length !== 2) return null;
  const numerator = parseFloat(parts[0]);
  const denominator = parseFloat(parts[1]);
  if (isNaN(numerator) || isNaN(denominator) || denominator === 0) return null;
  return numerator / denominator;
}

function extractHashFromMagnetOrHash(input) {
  if (!input) return '';

  if (input.toLowerCase().startsWith('magnet:')) {
    const match = input.match(/xt=urn:btih:([a-fA-F0-9]{40}|[A-Za-z2-7]{32})/i);
    if (match && match[1]) {
      const raw = match[1];
      if (/^[a-fA-F0-9]{40}$/i.test(raw)) return raw.toLowerCase();
      if (/^[A-Za-z2-7]{32}$/.test(raw)) return raw.toUpperCase();
      return '';
    }
    return ''; // Invalid magnet link
  }

  const trimmed = input.trim();
  if (/^[a-fA-F0-9]{40}$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  if (/^[A-Za-z2-7]{32}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return ''; // Invalid hash format
}

function parseVideoTracks(streams) {
  const videoStreams = streams.filter((s) => s.codec_type === 'video');
  const container = document.getElementById('videoTracks');

  if (videoStreams.length === 0) {
    container.innerHTML = '<p class="text-slate-400">No video tracks found</p>';
    return;
  }

  let html = '<div class="space-y-4">';

  videoStreams.forEach((stream, index) => {
    const title = stream.tags?.title || stream.tags?.handler_name || 'Video Track';
    const codec = stream.codec_long_name || stream.codec_name.toUpperCase();
    const resolution = stream.width && stream.height ? `${stream.width}×${stream.height}` : '';
    const bitrate = stream.bit_rate || stream.tags?.BPS || stream.tags?.['BPS-eng'];
    const fps = stream.r_frame_rate ? parseFraction(stream.r_frame_rate)?.toFixed(2) || '' : '';
    const duration = stream.tags?.DURATION ? stream.tags.DURATION.split('.')[0] : '';

    html += `
      <div class="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 shadow-inner">
        <div class="mb-3 flex items-start justify-between gap-2">
          <span class="inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-medium text-violet-300 ring-1 ring-violet-600/50 bg-violet-950/40">
            Track ${index + 1}
          </span>
          ${resolution ? `<span class="font-mono text-sm text-slate-400 tabular-nums">${resolution}</span>` : ''}
        </div>
        <dl class="space-y-1.5 text-sm">
          <div class="flex flex-wrap gap-x-2"><dt class="text-slate-500 shrink-0">Codec:</dt><dd class="text-slate-300">${codec}</dd></div>
          ${title !== 'Video Track' ? `<div class="flex flex-wrap gap-x-2"><dt class="text-slate-500 shrink-0">Title:</dt><dd class="text-slate-300">${title}</dd></div>` : ''}
          ${bitrate ? `<div class="flex flex-wrap gap-x-2"><dt class="text-slate-500 shrink-0">Bitrate:</dt><dd class="text-slate-300">${formatBitrate(bitrate)}</dd></div>` : ''}
          ${fps ? `<div class="flex flex-wrap gap-x-2"><dt class="text-slate-500 shrink-0">FPS:</dt><dd class="text-slate-300">${fps}</dd></div>` : ''}
          ${duration ? `<div class="flex flex-wrap gap-x-2"><dt class="text-slate-500 shrink-0">Duration:</dt><dd class="text-slate-300 font-mono">${duration}</dd></div>` : ''}
        </dl>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

function parseAudioTracks(streams) {
  const audioStreams = streams.filter((s) => s.codec_type === 'audio');
  const container = document.getElementById('audioTracks');

  if (audioStreams.length === 0) {
    container.innerHTML = '<p class="text-slate-400">No audio tracks found</p>';
    return;
  }

  let html = '<div class="space-y-4">';

  audioStreams.forEach((stream, index) => {
    const language = stream.tags?.language
      ? capitalizeFirstLetter(stream.tags.language)
      : 'Unknown';
    const title = stream.tags?.title || stream.tags?.handler_name || '';
    const codec = stream.codec_name.toUpperCase();
    const channels = formatChannelLayout(stream.channel_layout || '');
    const bitrate = stream.bit_rate || stream.tags?.BPS || stream.tags?.['BPS-eng'];
    const sampleRate = stream.sample_rate ? `${(stream.sample_rate / 1000).toFixed(1)} kHz` : '';

    html += `
      <div class="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 shadow-inner">
        <div class="mb-3 flex items-start justify-between gap-2">
          <span class="inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-medium text-blue-300 ring-1 ring-blue-600/50 bg-blue-950/40">
            Track ${index + 1}
          </span>
          <span class="text-sm font-semibold text-blue-400">${language}</span>
        </div>
        <dl class="space-y-1.5 text-sm">
          <div class="flex flex-wrap gap-x-2"><dt class="text-slate-500 shrink-0">Codec:</dt><dd class="text-slate-300">${codec}</dd></div>
          ${title ? `<div class="flex flex-wrap gap-x-2"><dt class="text-slate-500 shrink-0">Title:</dt><dd class="text-slate-300">${title}</dd></div>` : ''}
          ${channels ? `<div class="flex flex-wrap gap-x-2"><dt class="text-slate-500 shrink-0">Channels:</dt><dd class="text-slate-300">${channels}</dd></div>` : ''}
          ${bitrate ? `<div class="flex flex-wrap gap-x-2"><dt class="text-slate-500 shrink-0">Bitrate:</dt><dd class="text-slate-300">${formatBitrate(bitrate)}</dd></div>` : ''}
          ${sampleRate ? `<div class="flex flex-wrap gap-x-2"><dt class="text-slate-500 shrink-0">Sample Rate:</dt><dd class="text-slate-300 font-mono">${sampleRate}</dd></div>` : ''}
        </dl>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

function parseSubtitleTracks(streams) {
  const subtitleStreams = streams.filter((s) => s.codec_type === 'subtitle');
  const container = document.getElementById('subtitleTracks');

  if (subtitleStreams.length === 0) {
    container.innerHTML = '<p class="text-slate-400">No subtitle tracks found</p>';
    return;
  }

  let html = '<div class="space-y-4">';

  subtitleStreams.forEach((stream, index) => {
    const language = stream.tags?.language
      ? capitalizeFirstLetter(stream.tags.language)
      : 'Unknown';
    const title = stream.tags?.title || stream.tags?.handler_name || '';
    const codec = stream.codec_name.toUpperCase();

    html += `
      <div class="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 shadow-inner">
        <div class="mb-3 flex items-start justify-between gap-2">
          <span class="inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-medium text-emerald-300 ring-1 ring-emerald-600/50 bg-emerald-950/40">
            Track ${index + 1}
          </span>
          <span class="text-sm font-semibold text-emerald-400">${language}</span>
        </div>
        <dl class="space-y-1.5 text-sm">
          <div class="flex flex-wrap gap-x-2"><dt class="text-slate-500 shrink-0">Codec:</dt><dd class="text-slate-300">${codec}</dd></div>
          ${title ? `<div class="flex flex-wrap gap-x-2"><dt class="text-slate-500 shrink-0">Title:</dt><dd class="text-slate-300">${title}</dd></div>` : ''}
        </dl>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

function validateFileIndex(value) {
  if (value == null || value === '') return false;
  const s = String(value).trim();
  if (!/^\d+$/.test(s)) return false;
  const n = parseInt(s, 10);
  return n >= 0 && Number.isSafeInteger(n);
}

async function analyzeMedia() {
  let torrentHash = document.getElementById('torrentHash').value.trim();
  const fileIndex = document.getElementById('fileIndex').value;

  if (!torrentHash) {
    showError('Please enter torrent hash or magnet link');
    return;
  }

  if (!validateFileIndex(fileIndex)) {
    showError('File index must be a non-negative integer');
    return;
  }

  torrentHash = extractHashFromMagnetOrHash(torrentHash);

  if (!torrentHash) {
    showError('Invalid hash or magnet link. Please check your input.');
    return;
  }

  showLoading();

  try {
    const apiUrl = `/api/v1/tracks/auto?hash=${encodeURIComponent(torrentHash)}&index=${fileIndex}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      const errorCode = errorData.code || null;
      const errorDetails = errorData.details || null;

      // Provide a friendlier message for metadata timeout specifically
      let errorMessage;
      if (errorCode === 'METADATA_TIMEOUT') {
        const elapsed = errorDetails?.elapsedSeconds
          ? ` (waited ${errorDetails.elapsedSeconds}s)`
          : '';
        errorMessage =
          `Torrent metadata not ready${elapsed}. The torrent may still be loading — ` +
          'try again in a few seconds.';
      } else {
        errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        if (errorCode) errorMessage += ` (${errorCode})`;
        if (errorDetails && typeof errorDetails === 'string') errorMessage += `\n${errorDetails}`;
      }

      showError(errorMessage);
      return;
    }

    const data = await response.json();

    if (data.error) {
      // Handle structured error responses even for 200 OK responses
      const errorCode = data.code || null;
      const errorDetails = data.details || null;
      let fullErrorMessage = data.error;
      if (errorCode) {
        fullErrorMessage += ` (${errorCode})`;
      }
      if (errorDetails && typeof errorDetails === 'string') {
        fullErrorMessage += `\n${errorDetails}`;
      }
      showError(fullErrorMessage);
      return;
    }

    mediaData = data;

    if (data.streams && data.streams.length > 0) {
      parseVideoTracks(data.streams);
      parseAudioTracks(data.streams);
      parseSubtitleTracks(data.streams);

      document.getElementById('rawData').textContent = JSON.stringify(data, null, 2);

      showResults();
    } else {
      showError('No streams found in the media file');
    }

    hideLoading();
  } catch (error) {
    console.error('Error:', error);
    let message;
    if (navigator.onLine === false) {
      message = 'You appear to be offline. Please check your connection and try again.';
    } else if (
      error.name === 'FetchError' ||
      error.name === 'TypeError' ||
      error instanceof DOMException ||
      /failed to fetch|network error|connection refused|network/i.test(error.message || '')
    ) {
      message = 'Network error: Failed to connect to the server. Please check your connection.';
    } else {
      message = `Failed to analyze media: ${error.message}`;
    }
    showError(message);
    hideLoading();
  }
}

function toggleRawData() {
  const content = document.getElementById('rawDataContent');
  const icon = document.getElementById('rawDataIcon');

  if (content.classList.contains('hidden')) {
    content.classList.remove('hidden');
    icon.classList.add('rotate-180');
  } else {
    content.classList.add('hidden');
    icon.classList.remove('rotate-180');
  }
}

function toggleSection(section) {
  const content = document.getElementById(`${section}Tracks`);
  const icon = document.getElementById(`${section}Icon`);

  if (content.classList.contains('hidden')) {
    content.classList.remove('hidden');
    icon.classList.add('rotate-180');
  } else {
    content.classList.add('hidden');
    icon.classList.remove('rotate-180');
  }
}

function copyResults() {
  if (!mediaData) {
    showError('No data to copy. Please analyze media first.');
    return;
  }

  const torrentHash = document.getElementById('torrentHash').value;
  const fileIndex = document.getElementById('fileIndex').value;

  let copyText = `Torrent Hash: ${torrentHash}\n`;
  copyText += `File Index: ${fileIndex}\n\n`;

  const videoStreams = mediaData.streams.filter((s) => s.codec_type === 'video');
  if (videoStreams.length > 0) {
    copyText += '=== VIDEO TRACKS ===\n';
    videoStreams.forEach((stream, index) => {
      const title = stream.tags?.title || stream.tags?.handler_name || 'Video Track';
      const codec = stream.codec_long_name || stream.codec_name.toUpperCase();
      const resolution = stream.width && stream.height ? `${stream.width}×${stream.height}` : '';
      const bitrate = stream.bit_rate || stream.tags?.BPS || stream.tags?.['BPS-eng'];

      copyText += `Track ${index + 1}: ${codec}`;
      if (resolution) copyText += ` | ${resolution}`;
      if (bitrate) copyText += ` | ${formatBitrate(bitrate)}`;
      copyText += '\n';
    });
    copyText += '\n';
  }

  const audioStreams = mediaData.streams.filter((s) => s.codec_type === 'audio');
  if (audioStreams.length > 0) {
    copyText += '=== AUDIO TRACKS ===\n';
    audioStreams.forEach((stream, index) => {
      const language = stream.tags?.language
        ? capitalizeFirstLetter(stream.tags.language)
        : 'Unknown';
      const title = stream.tags?.title || stream.tags?.handler_name || '';
      const codec = stream.codec_name.toUpperCase();
      const channels = formatChannelLayout(stream.channel_layout || '');
      const bitrate = stream.bit_rate || stream.tags?.BPS || stream.tags?.['BPS-eng'];

      copyText += `Track ${index + 1}: ${language} | ${codec}`;
      if (title) copyText += ` | ${title}`;
      if (channels) copyText += ` | ${channels}`;
      if (bitrate) copyText += ` | ${formatBitrate(bitrate)}`;
      copyText += '\n';
    });
    copyText += '\n';
  }

  const subtitleStreams = mediaData.streams.filter((s) => s.codec_type === 'subtitle');
  if (subtitleStreams.length > 0) {
    copyText += '=== SUBTITLES ===\n';
    subtitleStreams.forEach((stream, index) => {
      const language = stream.tags?.language
        ? capitalizeFirstLetter(stream.tags.language)
        : 'Unknown';
      const title = stream.tags?.title || stream.tags?.handler_name || '';
      const codec = stream.codec_name.toUpperCase();

      copyText += `Track ${index + 1}: ${language} | ${codec}`;
      if (title) copyText += ` | ${title}`;
      copyText += '\n';
    });
  }

  navigator.clipboard
    .writeText(copyText)
    .then(() => {
      const button = document.getElementById('copyButton');
      const originalText = button.textContent;
      button.textContent = 'Copied!';
      button.classList.add('bg-emerald-600', 'border-emerald-500/50', 'hover:bg-emerald-500');
      button.classList.remove('bg-slate-700/80', 'border-slate-600', 'hover:bg-slate-600');

      setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('bg-emerald-600', 'border-emerald-500/50', 'hover:bg-emerald-500');
        button.classList.add('bg-slate-700/80', 'border-slate-600', 'hover:bg-slate-600');
      }, 2000);
    })
    .catch((err) => {
      showError('Failed to copy to clipboard');
      console.error('Copy failed:', err);
    });
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('analyzeBtn').addEventListener('click', analyzeMedia);
  document.getElementById('copyButton').addEventListener('click', copyResults);
  document.getElementById('toggleRawDataBtn').addEventListener('click', toggleRawData);

  document.querySelectorAll('[data-toggle-section]').forEach((btn) => {
    btn.addEventListener('click', () => toggleSection(btn.getAttribute('data-toggle-section')));
  });

  document.getElementById('torrentHash').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') analyzeMedia();
  });
  document.getElementById('fileIndex').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') analyzeMedia();
  });
});
