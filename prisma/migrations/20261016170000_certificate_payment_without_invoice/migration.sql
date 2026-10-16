-- Shared storage enum; application validation restricts the new value to certificates.
ALTER TYPE "ServiceStatus" ADD VALUE IF NOT EXISTS 'PAID_WITHOUT_INVOICE';
