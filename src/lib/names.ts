const HONORIFICS = /^(dr|mr|mrs|ms|miss|prof|sr|sister|nurse|madam|mama)\.?$/i;

/** "Dr. Yaw Owusu" → "Yaw". Keeps greetings natural for clinical titles. */
export function firstNameOf(fullName: string): string {
  const parts = fullName.split(/\s+/).filter(Boolean);
  return parts.find((part) => !HONORIFICS.test(part)) ?? fullName;
}
