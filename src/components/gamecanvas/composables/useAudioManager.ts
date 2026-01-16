/**
 * 音效管理器
 * 管理战斗音效的播放
 * Requirements: 13.1-13.5
 */

import { ref, readonly } from "vue";
import type { SoundOptions } from "@/types";

/** 音效实例 */
interface SoundInstance {
  id: string;
  soundId: string;
  audio: HTMLAudioElement;
  loop: boolean;
}

/** 音效配置 */
export interface SoundConfig {
  id: string;
  url: string;
  volume?: number;
}

/** Hook 返回类型 */
export interface UseAudioManagerReturn {
  activeSounds: ReturnType<typeof readonly<ReturnType<typeof ref<Map<string, SoundInstance>>>>>;
  registerSound: (config: SoundConfig) => void;
  registerSounds: (configs: SoundConfig[]) => void;
  preloadSound: (soundId: string) => Promise<void>;
  playSound: (soundId: string, options?: SoundOptions) => string;
  stopSound: (instanceId: string) => void;
  stopAllSounds: () => void;
  setGlobalVolume: (volume: number) => void;
  pauseAllSounds: () => void;
  resumeAllSounds: () => void;
  dispose: () => void;
}

export function useAudioManager(): UseAudioManagerReturn {
  // 活跃音效实例
  const activeSounds = ref<Map<string, SoundInstance>>(new Map());

  // 音效配置缓存
  const soundConfigs = new Map<string, SoundConfig>();

  // 音频缓存
  const audioCache = new Map<string, HTMLAudioElement>();

  // ID 计数器
  let instanceIdCounter = 0;

  /** 注册音效配置 */
  function registerSound(config: SoundConfig) {
    soundConfigs.set(config.id, config);
  }

  /** 批量注册音效 */
  function registerSounds(configs: SoundConfig[]) {
    configs.forEach(registerSound);
  }

  /** 预加载音效 */
  async function preloadSound(soundId: string): Promise<void> {
    const config = soundConfigs.get(soundId);
    if (!config || audioCache.has(soundId)) return;

    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.oncanplaythrough = () => {
        audioCache.set(soundId, audio);
        resolve();
      };
      audio.onerror = reject;
      audio.src = config.url;
      audio.load();
    });
  }

  /** 生成实例 ID */
  function generateInstanceId(): string {
    return `sound_${++instanceIdCounter}_${Date.now()}`;
  }

  /**
   * 播放音效
   * Requirements: 13.1, 13.2, 13.5
   */
  function playSound(soundId: string, options: SoundOptions = {}): string {
    const config = soundConfigs.get(soundId);
    if (!config) {
      console.warn(`音效 ${soundId} 未注册`);
      return "";
    }

    const { volume = config.volume ?? 1, loop = false, playbackRate = 1 } = options;

    // 创建新的音频实例（允许同时播放多个）
    const audio = new Audio(config.url);
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.loop = loop;
    audio.playbackRate = playbackRate;

    const instanceId = generateInstanceId();

    const instance: SoundInstance = {
      id: instanceId,
      soundId,
      audio,
      loop,
    };

    activeSounds.value.set(instanceId, instance);

    // 播放结束后自动清理（非循环）
    if (!loop) {
      audio.onended = () => {
        activeSounds.value.delete(instanceId);
      };
    }

    audio.play().catch((err) => {
      console.warn(`播放音效 ${soundId} 失败:`, err);
      activeSounds.value.delete(instanceId);
    });

    return instanceId;
  }

  /**
   * 停止音效
   * Requirements: 13.3
   */
  function stopSound(instanceId: string) {
    const instance = activeSounds.value.get(instanceId);
    if (instance) {
      instance.audio.pause();
      instance.audio.currentTime = 0;
      activeSounds.value.delete(instanceId);
    }
  }

  /**
   * 停止所有音效
   * Requirements: 13.4
   */
  function stopAllSounds() {
    activeSounds.value.forEach((instance) => {
      instance.audio.pause();
      instance.audio.currentTime = 0;
    });
    activeSounds.value.clear();
  }

  /** 设置全局音量 */
  function setGlobalVolume(volume: number) {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    activeSounds.value.forEach((instance) => {
      instance.audio.volume = clampedVolume;
    });
  }

  /** 暂停所有音效 */
  function pauseAllSounds() {
    activeSounds.value.forEach((instance) => {
      instance.audio.pause();
    });
  }

  /** 恢复所有音效 */
  function resumeAllSounds() {
    activeSounds.value.forEach((instance) => {
      instance.audio.play().catch(() => { });
    });
  }

  /** 销毁 */
  function dispose() {
    stopAllSounds();
    soundConfigs.clear();
    audioCache.clear();
  }

  return {
    activeSounds: readonly(activeSounds),
    registerSound,
    registerSounds,
    preloadSound,
    playSound,
    stopSound,
    stopAllSounds,
    setGlobalVolume,
    pauseAllSounds,
    resumeAllSounds,
    dispose,
  };
}
