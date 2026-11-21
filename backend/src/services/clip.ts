import { spawn } from 'child_process';
import { pipeline } from 'stream/promises';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { Ytdl } from '@distube/ytdl-core';
import ffmpegBin from 'ffmpeg-static';
import ffprobeBin from 'ffprobe-static';
import { getDatabase } from '../utils/database';
import { getStorageProvider } from '../utils/storage';
import { publishToYouTube, publishToInstagram } from './publish';
import { AppError } from '../middleware/error';
import config from '../config';
import logger from '../utils/logger';

const ffprobePath = ffprobeBin.path;

export interface ClipSettings {
  clipCount: number;
  font: string;
  fontSize: number;
  fontColor: string;
  bold: boolean;
  italic: boolean;
  position: 'top' | 'bottom';
  autoCaptions: boolean;
  captionText?: string;
}

export interface ClipJob {
  id: string;
  user_id: string;
  source_type: 'upload' | 'youtube' | 'url';
  source_value: string;
  file_name: string | null;
  clip_count: number;
  settings: ClipSettings;
  status: string;
  progress: number;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Clip {
  id: string;
  job_id: string;
  user_id: string;
  clip_index: number;
  title: string;
  start_time: number;
  end_time: number;
  duration: number;
  file_name: string;
  file_url: string;
  status: string;
  created_at: Date;
}

interface TimeRange {
  start: number;
  end: number;
}

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export const DEFAULT_CLIP_SETTINGS: ClipSettings = {
  clipCount: 3,
  font: 'Arial',
  fontSize: 48,
  fontColor: '#ffffff',
  bold: true,
  italic: false,
  position: 'bottom',
  autoCaptions: true,
};

function clipsRoot(): string {
  return path.resolve(process.cwd(), config.clips.dir);
}

function jobDirectory(jobId: string): string {
  return path.join(clipsRoot(), jobId);
}

async function runCommand(binary: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(stderr.slice(-2000) || `Command exited with code ${code}`));
      }
    });
  });
}

async function updateJob(jobId: string, patch: Partial<ClipJob>): Promise<void> {
  const db = getDatabase();
  await db('clip_jobs').where({ id: jobId }).update({
    ...patch,
    updated_at: new Date(),
  });
}

async function saveSource(job: ClipJob): Promise<string> {
  if (job.source_type === 'upload') {
    return job.source_value;
  }

  const dir = jobDirectory(job.id);
  await fsp.mkdir(dir, { recursive: true });
  const output = path.join(dir, 'source.mp4');

  if (job.source_type === 'youtube') {
    const downloader = new Ytdl();
    const stream = downloader.download(job.source_value, {
      filter: (format: any) => format.hasVideo && format.hasAudio,
      quality: 'highest',
    });
    await pipeline(stream, fs.createWriteStream(output));
  } else {
    const response = await axios.get(job.source_value, {
      responseType: 'stream',
      timeout: 120_000,
      maxContentLength: 2 * 1024 * 1024 * 1024,
    });
    await pipeline(response.data, fs.createWriteStream(output));
  }

  return output;
}

async function probeDuration(file: string): Promise<number> {
  const { stdout } = await runCommand(ffprobePath, [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    file,
  ]);

  const duration = parseFloat(stdout.trim());
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error('Could not determine video duration');
  }
  return duration;
}

function parseSpeechIntervals(stderr: string, duration: number): TimeRange[] {
  const silences: TimeRange[] = [];
  const starts = [...stderr.matchAll(/silence_start:\s*([\d.]+)/g)].map((m) => parseFloat(m[1]));
  const ends = [...stderr.matchAll(/silence_end:\s*([\d.]+)/g)].map((m) => parseFloat(m[1]));

  for (let i = 0; i < starts.length; i++) {
    silences.push({ start: starts[i], end: ends[i] ?? duration });
  }

  const speech: TimeRange[] = [];
  let cursor = 0;
  for (const silence of silences.sort((a, b) => a.start - b.start)) {
    if (silence.start > cursor) {
      speech.push({ start: cursor, end: silence.start });
    }
    cursor = Math.max(cursor, silence.end);
  }
  if (cursor < duration) {
    speech.push({ start: cursor, end: duration });
  }

  return speech.filter((range) => range.end - range.start > 0.2);
}

function overlapSeconds(a: TimeRange, b: TimeRange): number {
  return Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
}

function bestWindow(
  slot: TimeRange,
  speech: TimeRange[],
  sceneTimes: number[],
  windowLength: number,
): TimeRange {
  const slotLength = slot.end - slot.start;
  const length = Math.min(windowLength, slotLength);
  if (length <= 0) return { start: slot.start, end: slot.end };

  const step = Math.max(0.5, Math.min(5, (slotLength - length) / 8 || 1));
  let best = { start: slot.start, end: slot.start + length };
  let bestScore = -1;

  for (let start = slot.start; start + length <= slot.end + 0.01; start += step) {
    const candidate = { start, end: start + length };
    const speechScore = speech.reduce((sum, range) => sum + overlapSeconds(candidate, range), 0);
    const sceneScore = sceneTimes.filter((time) => time >= start && time <= candidate.end).length * 0.4;

    if (speechScore + sceneScore > bestScore) {
      bestScore = speechScore + sceneScore;
      best = candidate;
    }
  }

  return best;
}

async function detectHighlights(file: string, duration: number, count: number): Promise<TimeRange[]> {
  let stderr = '';
  let sceneTimes: number[] = [];

  try {
    const silenceResult = await runCommand(ffmpegBin, [
      '-i',
      file,
      '-af',
      'silencedetect=noise=-35dB:d=0.25',
      '-f',
      'null',
      '-',
    ]);
    stderr = silenceResult.stderr;
  } catch (error) {
    logger.warn({ error }, 'Silence detection failed; using even splits');
  }

  try {
    const sceneResult = await runCommand(ffmpegBin, [
      '-i',
      file,
      '-vf',
      "select='gt(scene,0.25)',showinfo",
      '-an',
      '-f',
      'null',
      '-',
    ]);
    sceneTimes = [...sceneResult.stderr.matchAll(/pts_time:([\d.]+)/g)].map((m) => parseFloat(m[1]));
  } catch (error) {
    logger.warn({ error }, 'Scene detection failed');
  }

  const speech = stderr ? parseSpeechIntervals(stderr, duration) : [{ start: 0, end: duration }];
  const slotLength = duration / count;
  const slots: TimeRange[] = [];
  for (let i = 0; i < count; i++) {
    slots.push({ start: i * slotLength, end: Math.min(duration, (i + 1) * slotLength) });
  }

  const scored = slots.map((slot) => {
    const speechScore = speech.reduce((sum, range) => sum + overlapSeconds(slot, range), 0);
    const sceneScore = sceneTimes.filter((time) => time >= slot.start && time <= slot.end).length * 0.4;
    return { slot, score: speechScore + sceneScore };
  });

  const selected = scored.sort((a, b) => b.score - a.score).map((entry) => entry.slot);
  const windows = selected.map((slot) => bestWindow(slot, speech, sceneTimes, config.clips.maxDurationSeconds));

  windows.sort((a, b) => a.start - b.start);
  for (let i = 1; i < windows.length; i++) {
    if (windows[i].start < windows[i - 1].end) {
      windows[i - 1].end = windows[i].start;
    }
  }

  const valid = windows
    .map((window) => ({
      ...window,
      end: Math.min(window.end, window.start + config.clips.maxDurationSeconds),
    }))
    .filter((window) => window.end - window.start >= 2);

  // Fill any gaps with even splits so the requested clip count is honoured.
  while (valid.length < count) {
    const index = valid.length;
    const start = (duration / count) * index;
    valid.push({
      start,
      end: Math.min(duration, start + config.clips.maxDurationSeconds),
    });
  }

  return valid;
}

async function transcribe(file: string): Promise<TranscriptSegment[]> {
  if (!config.openai.apiKey) {
    logger.warn('OPENAI_API_KEY not set; auto-captions will be skipped');
    return [];
  }

  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(file));
    form.append('model', config.openai.transcriptionModel);
    form.append('response_format', 'verbose_json');

    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      form,
      {
        headers: form.getHeaders(),
        timeout: 600_000,
        maxBodyLength: Infinity,
      },
    );

    return (response.data.segments || []).map((segment: any) => ({
      start: parseFloat(segment.start),
      end: parseFloat(segment.end),
      text: String(segment.text || '').trim(),
    }));
  } catch (error) {
    logger.error({ error }, 'Transcription failed; continuing without captions');
    return [];
  }
}

function escapeAssText(text: string): string {
  return text.replace(/[{}]/g, '').replace(/\r?\n/g, '\\N');
}

function srtTimestamp(seconds: number): string {
  const ms = Math.max(0, Math.floor(seconds * 1000));
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const secs = Math.floor((ms % 60_000) / 1000);
  const millis = ms % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

function assColour(hex: string): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return '&H00FFFFFF&';
  const value = match[1];
  const r = value.slice(0, 2);
  const g = value.slice(2, 4);
  const b = value.slice(4, 6);
  return `&H00${b}${g}${r}&`;
}

function subtitleStyle(settings: ClipSettings): string {
  return [
    `FontName=${settings.font}`,
    `FontSize=${settings.fontSize}`,
    `PrimaryColour=${assColour(settings.fontColor)}`,
    `Bold=${settings.bold ? -1 : 0}`,
    `Italic=${settings.italic ? -1 : 0}`,
    `Alignment=${settings.position === 'top' ? 8 : 2}`,
    'Outline=2',
    'Shadow=1',
  ].join(',');
}

async function writeSubtitles(
  segments: TranscriptSegment[],
  window: TimeRange,
  settings: ClipSettings,
  filePath: string,
): Promise<boolean> {
  const relevant = segments.filter(
    (segment) => segment.end > window.start && segment.start < window.end && segment.text,
  );

  if (relevant.length === 0 && !settings.captionText) return false;

  const entries = relevant.length
    ? relevant.map((segment) => ({
        start: Math.max(0, segment.start - window.start),
        end: Math.min(window.end - window.start, segment.end - window.start),
        text: segment.text,
      }))
    : [
        {
          start: 0,
          end: Math.min(window.end - window.start, config.clips.maxDurationSeconds),
          text: settings.captionText || '',
        },
      ];

  const srt = entries
    .map(
      (entry, index) =>
        `${index + 1}\n${srtTimestamp(entry.start)} --> ${srtTimestamp(entry.end)}\n${escapeAssText(entry.text)}\n`,
    )
    .join('\n');

  await fsp.writeFile(filePath, srt, 'utf-8');
  return true;
}

function escapeFilterPath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

async function renderClip(
  source: string,
  window: TimeRange,
  subtitlesFile: string | null,
  settings: ClipSettings,
  output: string,
): Promise<void> {
  const duration = window.end - window.start;
  const scale = 'scale=trunc(iw/2)*2:trunc(ih/2)*2';
  const videoFilter = subtitlesFile
    ? `subtitles=filename='${escapeFilterPath(subtitlesFile)}':force_style='${subtitleStyle(settings)}'`
    : scale;

  await runCommand(ffmpegBin, [
    '-y',
    '-ss',
    window.start.toFixed(3),
    '-i',
    source,
    '-t',
    duration.toFixed(3),
    '-vf',
    videoFilter,
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '23',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-movflags',
    '+faststart',
    output,
  ]);
}

function storageConfigured(): boolean {
  if (config.storage.type === 'r2') {
    return Boolean(
      config.storage.cloudflare.endpoint && config.storage.cloudflare.accessKeyId,
    );
  }

  return Boolean(config.storage.aws.bucketName && config.storage.aws.accessKeyId);
}

async function publicFileUrl(jobId: string, fileName: string, filePath: string): Promise<string> {
  const localUrl = `${config.clips.publicUrl}/${jobId}/${fileName}`;

  if (!storageConfigured()) {
    return localUrl;
  }

  try {
    const buffer = await fsp.readFile(filePath);
    return await getStorageProvider().upload({
      filename: fileName,
      contentType: 'video/mp4',
      data: buffer,
    });
  } catch (error) {
    logger.warn({ error }, 'Storage upload failed; using local clip URL');
    return localUrl;
  }
}

async function processJob(jobId: string): Promise<void> {
  const db = getDatabase();

  try {
    const job = await db('clip_jobs').where({ id: jobId }).first();
    if (!job) return;

    await updateJob(jobId, { status: 'downloading', progress: 5 });
    const source = await saveSource(job);

    await updateJob(jobId, { status: 'analyzing', progress: 20 });
    const duration = await probeDuration(source);
    const windows = await detectHighlights(source, duration, job.clip_count);

    await updateJob(jobId, { status: 'transcribing', progress: 35 });
    const segments = job.settings.autoCaptions ? await transcribe(source) : [];

    const dir = jobDirectory(jobId);
    await fsp.mkdir(dir, { recursive: true });

    await updateJob(jobId, { status: 'clipping', progress: 50 });

    for (const [index, window] of windows.entries()) {
      const fileName = `clip-${index + 1}.mp4`;
      const output = path.join(dir, fileName);
      const srtPath = path.join(dir, `clip-${index + 1}.srt`);

      const hasCaptions = await writeSubtitles(segments, window, job.settings, srtPath);
      await renderClip(source, window, hasCaptions ? srtPath : null, job.settings, output);

      const fileUrl = await publicFileUrl(jobId, fileName, output);
      const durationSeconds = window.end - window.start;

      await db('clips').insert({
        job_id: jobId,
        user_id: job.user_id,
        clip_index: index + 1,
        title: `Clip ${index + 1}`,
        start_time: window.start,
        end_time: window.end,
        duration: durationSeconds,
        file_name: fileName,
        file_url: fileUrl,
        status: 'ready',
      });

      await updateJob(jobId, {
        progress: 50 + Math.round((45 * (index + 1)) / Math.max(1, windows.length)),
      });
    }

    await updateJob(jobId, { status: 'completed', progress: 100, error_message: null });
  } catch (error) {
    logger.error({ error, jobId }, 'Clip job failed');
    await updateJob(jobId, {
      status: 'failed',
      error_message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function createClipJob(
  userId: string,
  source: { type: 'upload' | 'youtube' | 'url'; value: string; fileName?: string },
  settings: Partial<ClipSettings> = {},
): Promise<ClipJob> {
  const clipCount = settings.clipCount ?? DEFAULT_CLIP_SETTINGS.clipCount;
  if (!Number.isInteger(clipCount) || clipCount < 1 || clipCount > 50) {
    throw new AppError('Clip count must be between 1 and 50', 400);
  }

  const db = getDatabase();
  const clipSettings: ClipSettings = { ...DEFAULT_CLIP_SETTINGS, ...settings, clipCount };

  const [job] = await db('clip_jobs')
    .insert({
      user_id: userId,
      source_type: source.type,
      source_value: source.value,
      file_name: source.fileName || null,
      clip_count: clipCount,
      settings: JSON.stringify(clipSettings),
      status: 'queued',
      progress: 0,
    })
    .returning('*');

  setImmediate(() => void processJob(job.id));

  return job;
}

export async function getClipJob(userId: string, jobId: string): Promise<ClipJob> {
  const db = getDatabase();
  const job = await db('clip_jobs').where({ id: jobId, user_id: userId }).first();
  if (!job) {
    throw new AppError('Clip job not found', 404);
  }
  return job;
}

export async function listClipJobs(userId: string): Promise<ClipJob[]> {
  const db = getDatabase();
  return db('clip_jobs').where({ user_id: userId }).orderBy('created_at', 'desc').limit(50);
}

export async function getClips(userId: string, jobId: string): Promise<Clip[]> {
  await getClipJob(userId, jobId);
  const db = getDatabase();
  return db('clips').where({ job_id: jobId, user_id: userId }).orderBy('clip_index', 'asc');
}

export async function publishClip(
  userId: string,
  clipId: string,
  platform: 'youtube' | 'instagram',
) {
  const db = getDatabase();
  const clip = await db('clips').where({ id: clipId, user_id: userId }).first();
  if (!clip) {
    throw new AppError('Clip not found', 404);
  }

  if (platform === 'youtube') {
    return publishToYouTube(clip.id, userId, clip.file_url, clip.title, clip.title, []);
  }

  return publishToInstagram(clip.id, userId, clip.file_url, clip.title, []);
}
