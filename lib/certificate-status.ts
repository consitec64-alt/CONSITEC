export const PAYMENT_WITHOUT_INVOICE = 'PAID_WITHOUT_INVOICE';

export const certificateStatusLabels: Record<string, string> = {
  SCHEDULED: 'Pendiente', PAID: 'Pagado', INVOICED: 'Facturado',
  [PAYMENT_WITHOUT_INVOICE]: 'Pago sin factura',
};

export function certificateStatusOptions(customerType: string): Record<string, string> {
  const statuses = customerType === 'COMPANY' ? ['SCHEDULED', 'INVOICED', PAYMENT_WITHOUT_INVOICE] : ['SCHEDULED', 'PAID', PAYMENT_WITHOUT_INVOICE];
  return Object.fromEntries(statuses.map(status => [status, certificateStatusLabels[status]]));
}

export function countsForCertificateRevenue(sale: { status: string }) {
  return sale.status !== PAYMENT_WITHOUT_INVOICE;
}
