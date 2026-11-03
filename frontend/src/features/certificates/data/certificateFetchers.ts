import { apiGet } from '@/shared/lib/apiClient';

export interface CertificateVerification {
  valid: boolean;
  learnerName: string;
  courseTitle: string;
  issuedAt: string | null;
  revoked: boolean;
}

/** A 404 becomes a normal not-found state; other API failures remain visible. */
export async function fetchCertificateVerification(serial: string): Promise<CertificateVerification | null> {
  try {
    return await apiGet<CertificateVerification>(`/certificates/verify/${encodeURIComponent(serial)}`);
  } catch (error) {
    if (error instanceof Error && 'status' in error && (error as { status?: number }).status === 404) return null;
    throw error;
  }
}
