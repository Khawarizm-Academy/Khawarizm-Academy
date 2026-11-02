import type { StreamGrant } from '@/features/videohosting/types';
import { NativeMediaEngine } from './mediaEngine';

class FileEngine extends NativeMediaEngine {
  readonly id = 'file' as const;

  protected sourceFor(grant: StreamGrant): string | undefined {
    return grant.mode === 'external' ? grant.sourceUrl || grant.playUrl : grant.playUrl;
  }
}

export const createEngine = () => new FileEngine();
export const engineModule = { createEngine };
export default engineModule;
