// src/utils/fileValidation.ts
//
// Validation cote client des fichiers avant upload. But : donner un retour
// immediat a l'utilisateur (mauvais UX sinon) — ne remplace JAMAIS la
// validation cote backend (taille, MIME reel, antivirus, etc.), qui reste
// la seule protection fiable.

export interface FileValidationRule {
  /** Taille max en octets. */
  maxSizeBytes: number;
  /** Extensions autorisees, en minuscules, sans le point (ex: ['pdf','docx']). */
  allowedExtensions: string[];
  /** Types MIME autorises (verif indicative — un fichier peut mentir sur son MIME). */
  allowedMimeTypes?: string[];
}

export const DOCUMENT_UPLOAD_RULE: FileValidationRule = {
  maxSizeBytes: 10 * 1024 * 1024, // 10 Mo — a aligner avec la limite Laravel (upload_max_filesize / regle 'max:' du FormRequest)
  allowedExtensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png'],
};

export const IMAGE_UPLOAD_RULE: FileValidationRule = {
  maxSizeBytes: 5 * 1024 * 1024, // 5 Mo
  allowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
};

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

/** Retourne un message d'erreur en francais, ou null si le fichier est valide. */
export function validateFile(file: File, rule: FileValidationRule): string | null {
  if (file.size > rule.maxSizeBytes) {
    return `Fichier trop volumineux (${formatBytes(file.size)}). Taille maximale : ${formatBytes(rule.maxSizeBytes)}.`;
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!rule.allowedExtensions.includes(ext)) {
    return `Extension ".${ext}" non autorisée. Formats acceptés : ${rule.allowedExtensions.join(', ')}.`;
  }

  if (rule.allowedMimeTypes && file.type && !rule.allowedMimeTypes.includes(file.type)) {
    return `Type de fichier non autorisé (${file.type}).`;
  }

  return null;
}
