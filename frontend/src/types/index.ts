export interface Download {
  id: string;
  aria2_gid: string | null;
  filename: string;
  url: string;
  destination: string | null;
  status: 'Waiting' | 'Downloading' | 'Paused' | 'Stopped' | 'Failed' | 'Completed' | 'Cancelled';
  progress: number;
  downloaded_bytes: number;
  total_bytes: number;
  speed: number;
  eta: number;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

export interface Settings {
  default_download_dir: string;
  max_concurrent_downloads: number;
  connections_per_download: number;
  global_max_download_limit: string;
  retry_attempts: number;
  retry_delay: number;
  auto_resume: boolean;
  theme: 'dark' | 'light';
  refresh_interval: number;
  aria2_rpc_secret: string;
}

export interface StorageStats {
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  used_percent: number;
}

export interface HealthInfo {
  status: 'ok' | 'degraded';
  database: 'connected' | 'disconnected';
  aria2: 'connected' | 'disconnected';
  storage: StorageStats;
}

export interface LogFile {
  name: string;
  size: number;
  modified: number;
}

export interface LogContent {
  name: string;
  lines: string[];
  total_lines: number;
}
