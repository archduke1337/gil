/**
 * Certificate type — mirrors the Appwrite document structure.
 * Replaces the Drizzle-generated type from @shared/schema.
 */
export interface Certificate {
  // Appwrite system fields
  $id: string;
  $createdAt: string;
  $updatedAt: string;

  // Core GIL fields
  reportNumber: string;
  reportDate: string;          // ISO 8601
  shape: string;
  measurements: string;
  caratWeight: string;
  colorGrade: string;
  clarityGrade: string;
  cutGrade: string;
  polish: string;
  symmetry: string;
  fluorescence: string;
  gemologistName: string;
  signatureDate: string;       // ISO 8601

  // Optional fields
  inscription?: string;
  comments?: string;
  referenceNumber?: string;
  filename?: string;           // Appwrite file ID in the certificates bucket
  gemImagePath?: string;
  gemType?: string;
  dimensions?: string;
  treatment?: string;
  origin?: string;
  certificationDate?: string;
  examinedBy?: string;
  approvedBy?: string;
  labLocation?: string;
  equipmentUsed?: string;
  tablePercentage?: string;
  depthPercentage?: string;
  crownAngle?: string;
  pavilionAngle?: string;
  girdleThickness?: string;
  culetSize?: string;
  laserInscription?: string;
  photoIncluded?: boolean;
  plotDiagram?: boolean;
  digitallySignedBy?: boolean;
  colorGradeDiagram?: boolean;
  clarityPlotDiagram?: boolean;
  certificateNotes?: string;
  verifierUrl?: string;
  proportionsDiagram?: string;
  clarityDiagram1?: string;
  clarityDiagram2?: string;
  isActive?: boolean;

  // Legacy compatibility (mapped from Appwrite $id / $createdAt)
  id?: number;                 // kept for component compatibility — use $id
  uploadDate?: string;         // mapped from $createdAt
  issueDate?: string;          // mapped from $createdAt
}
