/**
 * Checks if the current URL has the beta access bypass parameter
 * @returns boolean - true if bypass is enabled, false otherwise
 */
export function hasBetaAccessBypass(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  return params.get('beta_access') === 'true';
}