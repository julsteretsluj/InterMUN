/**
 * Committee logos are uploaded as-is (transparent PNGs from organisers).
 * Do not alter pixels — black emblem details must be preserved.
 */

/** Pass-through; kept so upload call sites stay stable. */
export async function prepareCommitteeLogoUpload(file: File): Promise<File> {
  return file;
}
