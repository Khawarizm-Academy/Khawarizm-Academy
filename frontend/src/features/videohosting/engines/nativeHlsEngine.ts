import type { StreamGrant } from '@/features/videohosting/types';
import { NativeMediaEngine } from './mediaEngine';

class NativeHlsEngine extends NativeMediaEngine {
  readonly id = 'native' as const;

  protected sourceFor(grant: StreamGrant): string | undefined {
    return grant.masterUrl || grant.playUrl;
  }
}

export const createEngine = () => new NativeHlsEngine();
export const engineModule = { createEngine };
export default engineModule;
