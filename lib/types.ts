export type ServicePayload = {
  company: string;
  correlativeCode: string;
  travelMode?: "NONE" | "PLANE" | "BUS";
  serviceDates?: string[];
  courseId: string;
  instructorId: string;
  locationId: string;
  salespersonId: string;
  certificatesOnly: boolean;
  amount: number;
  serviceDate: string;
  status: "SCHEDULED" | "EXECUTED" | "INVOICED";
};

export type CertificateSalePayload = {
  customerName: string;
  customerType: "NATURAL_PERSON" | "COMPANY";
  courseId: string;
  salespersonId: string;
  amount: number;
  saleDate: string;
  status: "SCHEDULED" | "EXECUTED" | "INVOICED";
};
